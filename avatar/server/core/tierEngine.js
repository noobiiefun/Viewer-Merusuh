/**
 * avatar/server/core/tierEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Core engine untuk evaluasi dan pengelolaan tier viewer.
 *
 * TANGGUNG JAWAB:
 *   - Evaluasi tier berdasarkan total_donation dan total_rc_sessions
 *   - Selalu ambil tier dengan priority TERTINGGI yang terpenuhi
 *   - Upsert viewer saat ada donasi / sesi RC baru
 *   - Catat semua perubahan di donor_log
 *   - Assign tier manual oleh streamer
 *   - Re-evaluasi semua viewer saat streamer ubah syarat tier
 *
 * LOGIKA TIER:
 *   - Tier dievaluasi dari priority tertinggi ke terendah
 *   - Tier terpenuhi jika: min_donation > 0 dan total_donation >= min_donation
 *                          ATAU min_rc_sessions > 0 dan total_rc_sessions >= min_rc_sessions
 *   - Tier dengan min_donation=0 DAN min_rc_sessions=0 → manual-only (skip evaluasi auto)
 *   - Viewer mendapat tier TERTINGGI yang memenuhi syarat
 *
 * EKSPOR:
 *   evaluateTier(youtubeName)                          → object|null
 *   addDonation({ youtubeName, amount, platform, meta }) → object|null
 *   addRcSession({ youtubeName, sessionId, rcId, durationSec }) → object|null
 *   assignTierManual({ youtubeName, tierId, note })    → object
 *   reevaluateAll()                                    → { updated: number, results: [] }
 *   getViewerInfo(youtubeName)                         → object|null
 */

const { getDB } = require('../db/setup');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Pastikan viewer ada di DB. Jika belum ada, insert dengan nilai default.
 * @param {string} youtubeName
 * @returns {object} row viewer
 */
function _ensureViewer(youtubeName) {
  const db = getDB();

  db.prepare(`
    INSERT INTO viewers (youtube_name)
    VALUES (?)
    ON CONFLICT(youtube_name) DO NOTHING
  `).run(youtubeName);

  return db.prepare(
    `SELECT * FROM viewers WHERE LOWER(youtube_name) = LOWER(?)`
  ).get(youtubeName);
}

/**
 * Cari tier tertinggi yang memenuhi syarat untuk viewer ini.
 * @param {object} viewer - row dari tabel viewers
 * @returns {object|null} tier yang memenuhi syarat, atau null
 */
function _findEligibleTier(viewer) {
  const db = getDB();

  const tiers = db.prepare(
    `SELECT * FROM tiers ORDER BY priority DESC`
  ).all();

  for (const tier of tiers) {
    // Tier manual-only: skip dari evaluasi otomatis
    if (tier.min_donation === 0 && tier.min_rc_sessions === 0) continue;

    const donationOk = tier.min_donation > 0 && viewer.total_donation >= tier.min_donation;
    const rcOk       = tier.min_rc_sessions > 0 && viewer.total_rc_sessions >= tier.min_rc_sessions;

    // Salah satu syarat terpenuhi → eligible
    if (donationOk || rcOk) {
      return tier;
    }
  }

  return null;
}

/**
 * Update tier viewer di DB dan catat ke donor_log.
 * @param {object} viewer - row viewer saat ini
 * @param {object|null} newTier - tier baru, atau null jika tidak berubah
 * @param {string} eventType - 'donation' | 'rc_session' | 'manual'
 * @param {object} logData - { amount, platform, meta }
 */
function _logEvent(viewer, newTier, eventType, { amount = 0, platform = null, meta = {} } = {}) {
  const db = getDB();

  const tierChanged = newTier && newTier.id !== viewer.tier_id;

  if (tierChanged) {
    db.prepare(
      `UPDATE viewers SET tier_id = ?, assigned_by = ? WHERE id = ?`
    ).run(newTier.id, eventType === 'manual' ? 'manual' : 'auto', viewer.id);
  }

  db.prepare(`
    INSERT INTO donor_log (youtube_name, event_type, amount, platform, meta, tier_before, tier_after)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    viewer.youtube_name,
    eventType,
    amount,
    platform,
    JSON.stringify(meta),
    viewer.tier_id ?? null,
    tierChanged ? newTier.id : (viewer.tier_id ?? null)
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluasi ulang tier viewer berdasarkan data terkini di DB.
 * Tidak mengubah data donation/RC — hanya re-cek tier yang sesuai.
 *
 * Berguna dipanggil setelah streamer mengubah syarat tier.
 *
 * @param {string} youtubeName
 * @returns {object|null} tier baru jika ada perubahan, null jika sama atau viewer tidak ada
 */
function evaluateTier(youtubeName) {
  const db = getDB();

  const viewer = db.prepare(
    `SELECT * FROM viewers WHERE LOWER(youtube_name) = LOWER(?)`
  ).get(youtubeName);

  if (!viewer) return null;

  // Skip jika tier di-assign manual — jangan auto-override
  if (viewer.assigned_by === 'manual') return null;

  const newTier = _findEligibleTier(viewer);

  if (newTier && newTier.id !== viewer.tier_id) {
    db.prepare(
      `UPDATE viewers SET tier_id = ? WHERE id = ?`
    ).run(newTier.id, viewer.id);

    console.log(`[TierEngine] ${viewer.youtube_name}: tier → ${newTier.display_name}`);
    return newTier;
  }

  return null;
}

/**
 * Proses donasi baru: tambah total_donation viewer, lalu evaluasi tier.
 * Jika viewer belum ada di DB, insert dulu.
 *
 * @param {object} params
 * @param {string} params.youtubeName  - nama channel YouTube (case-insensitive)
 * @param {number} params.amount       - nominal donasi dalam Rupiah
 * @param {string} params.platform     - 'saweria' | 'trakteer' | 'manual'
 * @param {object} [params.meta={}]    - data tambahan bebas (id transaksi, pesan, dll)
 * @returns {object|null} tier baru jika naik tier, null jika tidak berubah
 */
function addDonation({ youtubeName, amount, platform, meta = {} }) {
  const db = getDB();

  if (!youtubeName || !amount || amount <= 0) {
    throw new Error('[TierEngine] addDonation: youtubeName dan amount (> 0) wajib diisi');
  }

  // Upsert: tambah amount ke total_donation
  db.prepare(`
    INSERT INTO viewers (youtube_name, total_donation)
    VALUES (?, ?)
    ON CONFLICT(youtube_name) DO UPDATE SET
      total_donation = total_donation + excluded.total_donation
  `).run(youtubeName, amount);

  // Ambil data viewer terbaru (setelah update)
  const viewer = db.prepare(
    `SELECT * FROM viewers WHERE LOWER(youtube_name) = LOWER(?)`
  ).get(youtubeName);

  // Evaluasi tier — skip jika manual
  let newTier = null;
  if (viewer.assigned_by !== 'manual') {
    newTier = _findEligibleTier(viewer);
  }

  // Log event (termasuk update tier jika berubah)
  _logEvent(viewer, newTier, 'donation', { amount, platform, meta });

  if (newTier && newTier.id !== viewer.tier_id) {
    console.log(`[TierEngine] Donasi ${amount} dari ${youtubeName} → naik ke tier: ${newTier.display_name}`);
    return newTier;
  }

  console.log(`[TierEngine] Donasi ${amount} dari ${youtubeName} dicatat (total: ${viewer.total_donation})`);
  return null;
}

/**
 * Proses sesi RC baru: tambah total_rc_sessions viewer, lalu evaluasi tier.
 * Jika viewer belum ada di DB, insert dulu.
 *
 * @param {object} params
 * @param {string} params.youtubeName  - nama channel YouTube
 * @param {string} [params.sessionId]  - ID sesi RC (dari RC Module)
 * @param {string} [params.rcId]       - ID unit RC yang dipakai
 * @param {number} [params.durationSec] - durasi sesi dalam detik
 * @returns {object|null} tier baru jika naik tier, null jika tidak berubah
 */
function addRcSession({ youtubeName, sessionId = null, rcId = null, durationSec = 0 }) {
  const db = getDB();

  if (!youtubeName) {
    throw new Error('[TierEngine] addRcSession: youtubeName wajib diisi');
  }

  // Upsert: tambah 1 ke total_rc_sessions
  db.prepare(`
    INSERT INTO viewers (youtube_name, total_rc_sessions)
    VALUES (?, 1)
    ON CONFLICT(youtube_name) DO UPDATE SET
      total_rc_sessions = total_rc_sessions + 1
  `).run(youtubeName);

  const viewer = db.prepare(
    `SELECT * FROM viewers WHERE LOWER(youtube_name) = LOWER(?)`
  ).get(youtubeName);

  let newTier = null;
  if (viewer.assigned_by !== 'manual') {
    newTier = _findEligibleTier(viewer);
  }

  _logEvent(viewer, newTier, 'rc_session', {
    platform: 'rc_module',
    meta: { session_id: sessionId, rc_id: rcId, duration_sec: durationSec }
  });

  if (newTier && newTier.id !== viewer.tier_id) {
    console.log(`[TierEngine] Sesi RC oleh ${youtubeName} → naik ke tier: ${newTier.display_name}`);
    return newTier;
  }

  console.log(`[TierEngine] Sesi RC oleh ${youtubeName} dicatat (total sesi: ${viewer.total_rc_sessions})`);
  return null;
}

/**
 * Assign tier secara manual oleh streamer.
 * Tier manual TIDAK akan di-override oleh evaluasi otomatis.
 * Untuk lepas dari manual dan kembali ke auto, set assigned_by = 'auto' via DB atau
 * panggil evaluateTier setelah reset assigned_by secara manual.
 *
 * @param {object} params
 * @param {string} params.youtubeName - nama channel YouTube
 * @param {string} params.tierId      - ID tier yang mau di-assign
 * @param {string} [params.note]      - catatan opsional untuk log
 * @returns {object} viewer row setelah diupdate
 */
function assignTierManual({ youtubeName, tierId, note = '' }) {
  const db = getDB();

  if (!youtubeName || !tierId) {
    throw new Error('[TierEngine] assignTierManual: youtubeName dan tierId wajib diisi');
  }

  const tier = db.prepare(`SELECT * FROM tiers WHERE id = ?`).get(tierId);
  if (!tier) {
    throw new Error(`[TierEngine] Tier tidak ditemukan: ${tierId}`);
  }

  // Pastikan viewer ada
  const viewer = _ensureViewer(youtubeName);

  // Update tier dan tandai sebagai manual
  db.prepare(`
    UPDATE viewers SET tier_id = ?, assigned_by = 'manual' WHERE id = ?
  `).run(tierId, viewer.id);

  // Log event manual
  _logEvent(
    viewer,
    tier,
    'manual',
    { platform: 'manual', meta: { note } }
  );

  console.log(`[TierEngine] Manual assign: ${youtubeName} → ${tier.display_name} (${note || 'tanpa catatan'})`);

  return db.prepare(`SELECT * FROM viewers WHERE id = ?`).get(viewer.id);
}

/**
 * Re-evaluasi SEMUA viewer yang assigned_by = 'auto'.
 * Dipanggil saat streamer mengubah syarat tier (min_donation, min_rc_sessions).
 * Viewer manual tidak tersentuh.
 *
 * @returns {{ updated: number, results: Array<{ name: string, old_tier: string|null, new_tier: string }> }}
 */
function reevaluateAll() {
  const db = getDB();

  const viewers = db.prepare(
    `SELECT * FROM viewers WHERE assigned_by = 'auto' AND is_active = 1`
  ).all();

  const results = [];

  for (const viewer of viewers) {
    const newTier = _findEligibleTier(viewer);

    if (newTier && newTier.id !== viewer.tier_id) {
      db.prepare(
        `UPDATE viewers SET tier_id = ? WHERE id = ?`
      ).run(newTier.id, viewer.id);

      results.push({
        name: viewer.youtube_name,
        old_tier: viewer.tier_id,
        new_tier: newTier.id
      });

      console.log(`[TierEngine] Re-eval: ${viewer.youtube_name} ${viewer.tier_id ?? 'null'} → ${newTier.id}`);
    }
  }

  console.log(`[TierEngine] reevaluateAll selesai: ${results.length} viewer diupdate dari ${viewers.length} total`);
  return { updated: results.length, results };
}

/**
 * Ambil info lengkap satu viewer beserta tier dan avatar-nya.
 * Berguna untuk API endpoint /api/viewers/check
 *
 * @param {string} youtubeName
 * @returns {object|null}
 */
function getViewerInfo(youtubeName) {
  const db = getDB();

  return db.prepare(`
    SELECT
      v.*,
      t.display_name  AS tier_name,
      t.color_hex     AS tier_color,
      a.display_name  AS avatar_name,
      a.frame_count,
      a.frame_width,
      a.frame_height
    FROM viewers v
    LEFT JOIN tiers   t ON v.tier_id   = t.id
    LEFT JOIN avatars a ON v.avatar_id = a.id
    WHERE LOWER(v.youtube_name) = LOWER(?)
  `).get(youtubeName) ?? null;
}

module.exports = {
  evaluateTier,
  addDonation,
  addRcSession,
  assignTierManual,
  reevaluateAll,
  getViewerInfo,
};
