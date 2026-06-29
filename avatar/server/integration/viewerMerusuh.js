/**
 * avatar/server/integration/viewerMerusuh.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook integrasi antara Viewer Merusuh (server utama) dan Avatar Module.
 *
 * Yang dilakukan:
 *   - Dengarkan event 'donation' dari eventBus → addDonation ke tierEngine
 *   - Dengarkan event 'chat_message' dari eventBus → update last_seen viewer
 *   - Broadcast perubahan tier ke semua client dashboard via Socket.IO
 *
 * Dipanggil dari: avatar/server/index.js → init()
 * Jangan panggil langsung dari server utama.
 */

'use strict';

const tierEngine = require('../core/tierEngine');

/**
 * @param {EventEmitter} eventBus - eventBus dari server utama Viewer Merusuh
 * @param {import('socket.io').Server} io - Socket.IO instance dari avatar server
 */
function initViewerMerusuhIntegration(eventBus, io) {

  // ── Event: donasi masuk ────────────────────────────────────────────────────
  // Payload dari Viewer Merusuh (lihat adapters/saweria.js, adapters/trakteer.js):
  //   { donatorName, amount, platform, message? }
  // donatorName = nama YouTube Channel pengirim donasi
  eventBus.on('donation', (donation) => {
    // Support donatorName (format Viewer Merusuh) dan username (fallback)
    const username = donation.donatorName || donation.username
    const { amount, platform = 'unknown', message: note } = donation

    if (!username || !amount) {
      console.warn('[Avatar] Event donation tidak lengkap, skip:', donation)
      return
    }

    try {
      const newTier = tierEngine.addDonation({
        youtubeName: username,
        amount:      Number(amount),
        platform,
        meta:        { source: 'viewer_merusuh_event', note: note || '' },
      })

      if (newTier) {
        console.log(`[Avatar] ${username} naik ke tier: ${newTier.display_name} (via donasi Rp ${Number(amount).toLocaleString('id-ID')})`)
        io.emit('viewer_tier_changed', {
          youtube_name:      username,
          new_tier_id:       newTier.id,
          new_tier_name:     newTier.display_name,
          new_tier_color:    newTier.color_hex,
          trigger:           'donation',
          amount,
          platform,
        })
      }

      // Selalu broadcast agar dashboard reload data terbaru
      io.emit('viewer_registered', { youtube_name: username })

    } catch (err) {
      console.error(`[Avatar] Gagal proses donasi untuk ${username}:`, err.message)
    }
  })

  // ── Event: chat masuk dari YouTube ────────────────────────────────────────
  // Payload: { username, message, timestamp? }
  // Dipakai untuk update `last_seen` viewer di tabel viewers
  // sehingga dashboard bisa tampilkan "Terakhir Chat" yang akurat.
  eventBus.on('chat_message', (chat) => {
    const { username } = chat;
    if (!username) return;

    try {
      // tierEngine.updateLastSeen hanya update kolom last_seen — tidak evaluasi tier
      tierEngine.updateLastSeen(username);
    } catch (err) {
      // Silent: viewer mungkin belum terdaftar, tidak apa-apa
    }
  });

  // ── Event: RC session start ────────────────────────────────────────────────
  // Jika server utama Viewer Merusuh juga punya RC module terintegrasi
  // dan emit event ini, avatar module ikut dengarkan.
  // Payload: { username, session_id, rc_id, duration_sec? }
  eventBus.on('rc_session_start', (session) => {
    const { username, session_id, rc_id, duration_sec = 0 } = session;

    if (!username) {
      console.warn('[Avatar] Event rc_session_start tidak ada username, skip.');
      return;
    }

    try {
      const newTier = tierEngine.addRcSession({
        youtubeName: username,
        sessionId:   session_id || `auto_${Date.now()}`,
        rcId:        rc_id || 'unknown',
        durationSec: duration_sec,
      });

      if (newTier) {
        console.log(`[Avatar] ${username} naik ke tier: ${newTier.display_name} (via sesi RC)`);
        io.emit('viewer_tier_changed', {
          youtube_name:   username,
          new_tier_id:    newTier.id,
          new_tier_name:  newTier.display_name,
          new_tier_color: newTier.color_hex,
          trigger:        'rc_session',
          session_id,
          rc_id,
        });
      }

      io.emit('viewer_registered', { youtube_name: username });

    } catch (err) {
      console.error(`[Avatar] Gagal proses rc_session untuk ${username}:`, err.message);
    }
  });

  console.log('[Avatar] Integration dengan Viewer Merusuh aktif — mendengarkan: donation, chat_message, rc_session_start');
}

module.exports = { initViewerMerusuhIntegration };
