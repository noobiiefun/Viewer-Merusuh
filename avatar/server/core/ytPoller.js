/**
 * avatar/server/core/ytPoller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * YouTube Live Chat poller — membaca chat secara real-time dan mem-broadcast
 * ke overlay via Socket.IO.
 *
 * PENTING — DESAIN FILTER:
 *   Hanya pesan dari viewer yang MEMENUHI SEMUA SYARAT ini yang diproses:
 *     1. youtube_name ada di tabel viewers
 *     2. is_active = 1
 *     3. tier_id IS NOT NULL  (sudah punya tier)
 *     4. avatar_id IS NOT NULL (sudah pilih avatar)
 *   Viewer lain diabaikan sepenuhnya — ini by design, bukan bug.
 *   Lihat dokumentasi Section 1.1 untuk penjelasan konsep.
 *
 * LIBRARY:
 *   Fase ini: youtube-chat (npm) — tidak butuh API key, cocok untuk MVP.
 *   Fase berikutnya: upgrade ke YouTube Data API v3 untuk production.
 *
 * PENGGUNAAN:
 *   const poller = new YtPoller(io, app);
 *   await poller.start('VIDEO_ID_YOUTUBE');
 *   poller.stop();
 *
 * EKSPOR:
 *   class YtPoller
 */

const { LiveChat } = require('youtube-chat');
const { getDB }    = require('../db/setup');

class YtPoller {
  /**
   * @param {import('socket.io').Server} io - Socket.IO server instance
   * @param {import('express').Application} app - Express app (untuk update app.locals.polling)
   */
  constructor(io, app) {
    this.io        = io;
    this.app       = app;
    this.isRunning = false;
    this.videoId   = null;
    this.liveChat  = null;

    // Statistik sesi saat ini
    this.stats = {
      messagesReceived: 0,  // total pesan dari semua viewer
      messagesEmitted:  0,  // pesan yang lolos filter dan di-emit ke overlay
      startedAt:        null,
    };
  }

  // ─── Public Methods ─────────────────────────────────────────────────────────

  /**
   * Mulai polling YouTube Live Chat.
   * @param {string} videoId - ID video YouTube (bukan URL, hanya ID-nya)
   * @returns {Promise<boolean>} true jika berhasil connect
   */
  async start(videoId) {
    if (this.isRunning) {
      console.warn(`[YtPoller] Sudah berjalan untuk video: ${this.videoId}. Stop dulu sebelum start baru.`);
      return false;
    }

    if (!videoId || typeof videoId !== 'string') {
      throw new Error('[YtPoller] videoId wajib diisi');
    }

    this.videoId  = videoId.trim();
    this.liveChat = new LiveChat({ liveId: this.videoId });

    // ─── Event Handlers ──────────────────────────────────────────────────────

    this.liveChat.on('chat', (msg) => {
      this._handleMessage(msg);
    });

    this.liveChat.on('error', (err) => {
      console.error('[YtPoller] Error dari youtube-chat:', err?.message || err);
      // Tidak langsung stop — biarkan library retry sendiri
      // Jika error fatal, event 'end' akan menyusul
    });

    this.liveChat.on('end', () => {
      console.log('[YtPoller] Live chat berakhir atau koneksi terputus.');
      this._setRunning(false);
    });

    // ─── Connect ─────────────────────────────────────────────────────────────

    console.log(`[YtPoller] Memulai polling untuk video: ${this.videoId}`);

    let connected;
    try {
      connected = await this.liveChat.start();
    } catch (err) {
      console.error('[YtPoller] Gagal start:', err?.message || err);
      this._setRunning(false);
      return false;
    }

    if (!connected) {
      console.error('[YtPoller] youtube-chat mengembalikan false — video mungkin tidak live atau ID salah.');
      this._setRunning(false);
      return false;
    }

    // Berhasil
    this.stats = { messagesReceived: 0, messagesEmitted: 0, startedAt: new Date().toISOString() };
    this._setRunning(true);
    console.log(`[YtPoller] ✓ Terhubung ke live chat: ${this.videoId}`);
    return true;
  }

  /**
   * Stop polling.
   */
  stop() {
    if (!this.isRunning) {
      console.warn('[YtPoller] Tidak sedang berjalan.');
      return;
    }

    try {
      this.liveChat?.stop();
    } catch (err) {
      console.warn('[YtPoller] Error saat stop:', err?.message);
    }

    this._setRunning(false);
    console.log(`[YtPoller] Polling dihentikan. Stats sesi:`, this.getStats());
  }

  /**
   * Status dan statistik polling saat ini.
   * @returns {object}
   */
  getStats() {
    return {
      isRunning:        this.isRunning,
      videoId:          this.videoId,
      messagesReceived: this.stats.messagesReceived,
      messagesEmitted:  this.stats.messagesEmitted,
      startedAt:        this.stats.startedAt,
    };
  }

  // ─── Private Methods ────────────────────────────────────────────────────────

  /**
   * Update state isRunning dan sinkronkan ke app.locals.polling
   * supaya /api/status dan dashboard bisa baca state terkini.
   */
  _setRunning(isRunning) {
    this.isRunning = isRunning;

    if (this.app) {
      this.app.locals.polling = {
        isPolling: isRunning,
        videoId:   isRunning ? this.videoId : null,
      };
    }

    // Broadcast status ke dashboard via Socket.IO
    this.io.emit('polling_status', {
      isRunning,
      videoId: isRunning ? this.videoId : null,
    });
  }

  /**
   * Proses satu pesan chat dari youtube-chat.
   * Filter ketat — hanya viewer terdaftar + punya tier + sudah pilih avatar.
   *
   * @param {object} msg - object pesan dari library youtube-chat
   * msg.author.name  = nama channel YouTube pengirim
   * msg.message      = array dari text/emoji objects (atau string tergantung versi library)
   */
  _handleMessage(msg) {
    this.stats.messagesReceived++;

    // ─── Ambil nama pengirim ────────────────────────────────────────────────
    const senderName = msg?.author?.name;
    if (!senderName) return;

    // ─── Ekstrak teks pesan ─────────────────────────────────────────────────
    // youtube-chat v2 mengembalikan msg.message sebagai array of { text } | { emojiText }
    const messageText = this._extractText(msg.message);
    if (!messageText) return;

    // ─── Cek apakah viewer terdaftar dan eligible ───────────────────────────
    const db = getDB();

    const viewer = db.prepare(`
      SELECT
        v.id, v.youtube_name, v.avatar_id, v.tier_id,
        a.frame_count, a.frame_width, a.frame_height,
        t.color_hex AS tier_color
      FROM viewers v
      JOIN avatars a ON v.avatar_id = a.id
      JOIN tiers   t ON v.tier_id   = t.id
      WHERE LOWER(v.youtube_name) = LOWER(?)
        AND v.is_active   = 1
        AND v.avatar_id  IS NOT NULL
        AND v.tier_id    IS NOT NULL
    `).get(senderName);

    // Viewer tidak terdaftar / belum pilih avatar → abaikan (by design)
    if (!viewer) return;

    this.stats.messagesEmitted++;

    // ─── Update last_seen ───────────────────────────────────────────────────
    db.prepare(
      `UPDATE viewers SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(viewer.id);

    // ─── Simpan ke chat_log ─────────────────────────────────────────────────
    db.prepare(
      `INSERT INTO chat_log (youtube_name, avatar_id, tier_id, message) VALUES (?, ?, ?, ?)`
    ).run(viewer.youtube_name, viewer.avatar_id, viewer.tier_id, messageText);

    // ─── Broadcast ke overlay & dashboard via Socket.IO ────────────────────
    const payload = {
      viewer_name:  viewer.youtube_name,
      avatar_id:    viewer.avatar_id,
      tier_id:      viewer.tier_id,
      tier_color:   viewer.tier_color,
      frame_count:  viewer.frame_count,
      frame_width:  viewer.frame_width,
      frame_height: viewer.frame_height,
      message:      messageText,
      timestamp:    Date.now(),
    };

    this.io.emit('chat_message', payload);

    console.log(`[YtPoller] ✉ ${viewer.youtube_name} [${viewer.tier_id}]: ${messageText.substring(0, 60)}${messageText.length > 60 ? '…' : ''}`);
  }

  /**
   * Ekstrak teks plain dari format message youtube-chat v2.
   * msg.message bisa berupa:
   *   - string (versi lama)
   *   - array of { text: string } | { emojiText: string } (versi baru)
   *
   * @param {string|Array} message
   * @returns {string} teks gabungan, atau string kosong jika tidak ada teks
   */
  _extractText(message) {
    if (!message) return '';

    // Sudah string
    if (typeof message === 'string') return message.trim();

    // Array of objects
    if (Array.isArray(message)) {
      return message
        .map(part => part?.text || part?.emojiText || '')
        .join('')
        .trim();
    }

    return '';
  }
}

module.exports = YtPoller;
