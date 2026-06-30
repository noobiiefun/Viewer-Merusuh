/**
 * RC Module — Session Manager
 * 
 * Mengelola sesi sewa RC:
 * - Assign RC ke viewer
 * - Timer countdown
 * - Release RC setelah waktu habis
 * - Emit events ke Socket.IO
 * 
 * Phase: 1 (fondasi) — belum ada hardware, siap untuk simulator
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const { getDB } = require('../api/db/database');

class SessionManager extends EventEmitter {
  constructor() {
    super();

    /**
     * Map of active sessions
     * Key: session_id
     * Value: { id, rc_id, viewer_name, viewer_token, duration_sec, remaining_sec,
     *          started_at, source, donation_amount, _interval }
     */
    this.sessions = new Map();

    /**
     * Map of token → session_id (untuk validasi kontrol)
     * Key: viewer_token
     * Value: session_id
     */
    this.tokenIndex = new Map();
  }

  /**
   * Mulai sesi sewa baru
   * @param {Object} opts
   * @param {string} opts.rc_id
   * @param {string} opts.viewer_name
   * @param {number} opts.duration_sec
   * @param {string} opts.source - 'donation' | 'manual' | 'queue'
   * @param {number} [opts.donation_amount]
   * @returns {Object} session data + viewer_token + controller_url
   */
  start(opts) {
    const { rc_id, viewer_name, duration_sec, source, donation_amount } = opts;

    // Validasi input — penting sebelum hardware nyata terhubung,
    // supaya perintah aneh tidak pernah sampai ke motor/drone.
    if (!rc_id || typeof rc_id !== 'string') {
      throw new Error('rc_id wajib diisi');
    }
    if (!viewer_name || typeof viewer_name !== 'string' || viewer_name.trim().length === 0) {
      throw new Error('viewer_name wajib diisi');
    }
    if (!Number.isFinite(duration_sec) || duration_sec <= 0) {
      throw new Error('duration_sec harus angka positif');
    }
    if (duration_sec > 3600) {
      throw new Error('duration_sec maksimal 3600 detik (1 jam)');
    }
    if (this.isRcInUse(rc_id)) {
      throw new Error('RC_IN_USE');
    }

    const session_id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const viewer_token = crypto.randomBytes(16).toString('hex');

    const session = {
      id: session_id,
      rc_id,
      viewer_name,
      viewer_token,
      duration_sec,
      remaining_sec: duration_sec,
      started_at: new Date().toISOString(),
      source: source || 'manual',
      donation_amount: donation_amount || 0,
      _interval: null,
    };

    this.sessions.set(session_id, session);
    this.tokenIndex.set(viewer_token, session_id);

    // Mulai countdown timer
    session._interval = setInterval(() => {
      this._tick(session_id);
    }, 1000);

    // Emit event session started
    this.emit('session_start', {
      session_id,
      rc_id,
      viewer_name,
      duration_sec,
      viewer_token,
      source,
    });

    console.log(`[SessionManager] Sesi dimulai: ${viewer_name} → RC ${rc_id} (${duration_sec}s)`);

    return {
      session_id,
      viewer_token,
      rc_id,
      viewer_name,
      duration_sec,
      started_at: session.started_at,
      controller_url: `/rc/controller?token=${viewer_token}`,
    };
  }

  /**
   * Tick timer setiap detik
   * @private
   */
  _tick(session_id) {
    const session = this.sessions.get(session_id);
    if (!session) return;

    session.remaining_sec -= 1;

    this.emit('session_tick', {
      session_id,
      rc_id: session.rc_id,
      viewer_name: session.viewer_name,
      remaining_sec: session.remaining_sec,
    });

    if (session.remaining_sec <= 0) {
      this.end(session_id, 'expired');
    }
  }

  /**
   * Akhiri sesi
   * @param {string} session_id
   * @param {string} reason - 'expired' | 'admin' | 'viewer' | 'error'
   */
  end(session_id, reason = 'admin') {
    const session = this.sessions.get(session_id);
    if (!session) return false;

    // Stop timer
    if (session._interval) {
      clearInterval(session._interval);
    }

    // Hapus dari index
    this.tokenIndex.delete(session.viewer_token);
    this.sessions.delete(session_id);

    // Simpan ke riwayat (session_history) — supaya tidak hilang setelah restart
    // dan bisa dipakai untuk laporan/statistik nanti.
    try {
      const db = getDB();
      db.prepare(`
        INSERT INTO session_history
          (id, rc_id, viewer_name, duration_sec, duration_used_sec, source, donation_amount, reason_ended, started_at, ended_at)
        VALUES (@id, @rc_id, @viewer_name, @duration_sec, @duration_used_sec, @source, @donation_amount, @reason_ended, @started_at, @ended_at)
      `).run({
        id: session.id,
        rc_id: session.rc_id,
        viewer_name: session.viewer_name,
        duration_sec: session.duration_sec,
        duration_used_sec: session.duration_sec - session.remaining_sec,
        source: session.source,
        donation_amount: session.donation_amount,
        reason_ended: reason,
        started_at: session.started_at,
        ended_at: new Date().toISOString(),
      });
    } catch (err) {
      // Riwayat gagal tersimpan tidak boleh menghentikan flow utama (RC tetap harus release)
      console.error('[SessionManager] Gagal simpan session_history:', err.message);
    }

    // Emit event session ended
    this.emit('session_end', {
      session_id,
      rc_id: session.rc_id,
      viewer_name: session.viewer_name,
      reason,
      duration_used_sec: session.duration_sec - session.remaining_sec,
    });

    console.log(`[SessionManager] Sesi berakhir: ${session.viewer_name} (${reason})`);
    return true;
  }

  /**
   * Validasi token viewer, return session jika valid
   * @param {string} viewer_token
   * @returns {Object|null} session atau null jika tidak valid
   */
  validateToken(viewer_token) {
    const session_id = this.tokenIndex.get(viewer_token);
    if (!session_id) return null;
    return this.sessions.get(session_id) || null;
  }

  /**
   * Ambil session berdasarkan RC ID
   * @param {string} rc_id
   * @returns {Object|null}
   */
  getSessionByRcId(rc_id) {
    for (const [, session] of this.sessions) {
      if (session.rc_id === rc_id) return session;
    }
    return null;
  }

  /**
   * Apakah RC sedang dipakai?
   * @param {string} rc_id
   * @returns {boolean}
   */
  isRcInUse(rc_id) {
    return this.getSessionByRcId(rc_id) !== null;
  }

  /**
   * Ambil semua sesi aktif (untuk API response)
   * @returns {Array}
   */
  getAll() {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      rc_id: s.rc_id,
      viewer_name: s.viewer_name,
      viewer_token: s.viewer_token,
      duration_sec: s.duration_sec,
      remaining_sec: s.remaining_sec,
      started_at: s.started_at,
      source: s.source,
      donation_amount: s.donation_amount,
    }));
  }

  /**
   * Ambil riwayat sesi dari database (untuk endpoint /api/session/history)
   * @param {Object} opts
   * @param {number} [opts.limit=50]
   * @param {string} [opts.rc_id] - filter by RC
   * @returns {Array}
   */
  getHistory({ limit = 50, rc_id = null } = {}) {
    const db = getDB();
    if (rc_id) {
      return db.prepare(`
        SELECT * FROM session_history WHERE rc_id = ? ORDER BY started_at DESC LIMIT ?
      `).all(rc_id, limit);
    }
    return db.prepare(`
      SELECT * FROM session_history ORDER BY started_at DESC LIMIT ?
    `).all(limit);
  }

  /**
   * Akhiri semua sesi (untuk cleanup saat server shutdown)
   */
  endAll() {
    for (const [session_id] of this.sessions) {
      this.end(session_id, 'server_shutdown');
    }
  }
}

// Singleton
module.exports = new SessionManager();
