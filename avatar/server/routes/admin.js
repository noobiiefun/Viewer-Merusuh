/**
 * avatar/server/routes/admin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * REST API untuk dashboard streamer — semua operasi CRUD dan kontrol polling.
 *
 * BASE: /admin
 *
 * Tier Management:
 *   GET    /admin/tiers                       → List semua tier
 *   POST   /admin/tiers                       → Buat tier baru
 *   PUT    /admin/tiers/:id                   → Update tier
 *   DELETE /admin/tiers/:id                   → Hapus tier
 *   POST   /admin/tiers/:id/avatars           → Assign avatar ke tier
 *   DELETE /admin/tiers/:id/avatars/:avid     → Lepas avatar dari tier
 *
 * Avatar Management:
 *   GET    /admin/avatars                     → List semua avatar
 *   POST   /admin/avatars/sync                → Scan folder public/avatars/
 *   PUT    /admin/avatars/:id                 → Update metadata avatar
 *   POST   /admin/avatars/:id/toggle          → Enable/disable avatar
 *
 * Viewer Management:
 *   GET    /admin/viewers                     → List semua viewer
 *   POST   /admin/viewers                     → Tambah viewer manual
 *   PUT    /admin/viewers/:id/tier            → Override tier manual
 *   POST   /admin/viewers/:id/donation        → Input donasi manual
 *   POST   /admin/viewers/:id/rc-session      → Input sesi RC manual
 *   DELETE /admin/viewers/:id                 → Hapus viewer
 *   POST   /admin/viewers/:id/toggle          → Aktifkan/nonaktifkan viewer
 *
 * Polling Control:
 *   POST   /admin/polling/start               → Start YouTube polling
 *   POST   /admin/polling/stop                → Stop polling
 *   GET    /admin/polling/status              → Status polling
 *
 * Log:
 *   GET    /admin/donor-log                   → Riwayat event donasi/RC
 *   GET    /admin/chat-log                    → Riwayat chat yang tampil
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { getDB } = require('../db/setup');
const tierEngine = require('../core/tierEngine');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok(res, data = {}) {
  return res.json({ success: true, ...data });
}

function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

// Validasi ID: hanya huruf kecil, angka, underscore, strip
function isValidId(id) {
  return /^[a-z0-9_-]+$/.test(id);
}

// ═════════════════════════════════════════════════════════════════════════════
// TIER MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

// GET /admin/tiers
// List semua tier, include jumlah viewer per tier
router.get('/tiers', (req, res) => {
  const db = getDB();

  const tiers = db.prepare(`
    SELECT
      t.*,
      COUNT(v.id) as viewer_count,
      COUNT(ta.avatar_id) as avatar_count
    FROM tiers t
    LEFT JOIN viewers v     ON t.id = v.tier_id AND v.is_active = 1
    LEFT JOIN tier_avatars ta ON t.id = ta.tier_id
    GROUP BY t.id
    ORDER BY t.priority DESC
  `).all();

  ok(res, { tiers });
});

// POST /admin/tiers
// Buat tier baru
// Body: { id, display_name, color_hex?, min_donation?, min_rc_sessions?, allow_manual?, priority? }
router.post('/tiers', (req, res) => {
  const { id, display_name, color_hex = '#ffffff', min_donation = 0, min_rc_sessions = 0, allow_manual = 1, priority = 0 } = req.body;

  if (!id || !display_name) {
    return fail(res, 'id dan display_name wajib diisi');
  }
  if (!isValidId(id)) {
    return fail(res, 'id hanya boleh huruf kecil, angka, underscore, strip (contoh: rusuh_biasa)');
  }

  const db = getDB();

  try {
    db.prepare(`
      INSERT INTO tiers (id, display_name, color_hex, min_donation, min_rc_sessions, allow_manual, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, display_name, color_hex, min_donation, min_rc_sessions, allow_manual ? 1 : 0, priority);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return fail(res, `Tier dengan id "${id}" sudah ada`);
    throw e;
  }

  const tier = db.prepare(`SELECT * FROM tiers WHERE id = ?`).get(id);
  ok(res, { tier });
});

// PUT /admin/tiers/:id
// Update tier — setelah update, re-evaluasi semua viewer auto
// Body: { display_name?, color_hex?, min_donation?, min_rc_sessions?, allow_manual?, priority? }
router.put('/tiers/:id', (req, res) => {
  const db   = getDB();
  const tier = db.prepare(`SELECT * FROM tiers WHERE id = ?`).get(req.params.id);

  if (!tier) return fail(res, `Tier tidak ditemukan: ${req.params.id}`, 404);

  const {
    display_name   = tier.display_name,
    color_hex      = tier.color_hex,
    min_donation   = tier.min_donation,
    min_rc_sessions = tier.min_rc_sessions,
    allow_manual   = tier.allow_manual,
    priority       = tier.priority,
  } = req.body;

  db.prepare(`
    UPDATE tiers SET
      display_name    = ?,
      color_hex       = ?,
      min_donation    = ?,
      min_rc_sessions = ?,
      allow_manual    = ?,
      priority        = ?
    WHERE id = ?
  `).run(display_name, color_hex, min_donation, min_rc_sessions, allow_manual ? 1 : 0, priority, tier.id);

  // Syarat tier berubah → re-evaluasi semua viewer auto
  const reeval = tierEngine.reevaluateAll();

  ok(res, {
    tier: db.prepare(`SELECT * FROM tiers WHERE id = ?`).get(tier.id),
    reevaluated: reeval,
  });
});

// DELETE /admin/tiers/:id
router.delete('/tiers/:id', (req, res) => {
  const db   = getDB();
  const tier = db.prepare(`SELECT id FROM tiers WHERE id = ?`).get(req.params.id);

  if (!tier) return fail(res, `Tier tidak ditemukan: ${req.params.id}`, 404);

  // Lepas tier dari viewer yang memakai tier ini
  db.prepare(`UPDATE viewers SET tier_id = NULL WHERE tier_id = ?`).run(tier.id);
  db.prepare(`DELETE FROM tiers WHERE id = ?`).run(tier.id);

  ok(res, { deleted: tier.id });
});

// POST /admin/tiers/:id/avatars
// Assign avatar ke tier
// Body: { avatar_id }
router.post('/tiers/:id/avatars', (req, res) => {
  const db      = getDB();
  const { avatar_id } = req.body;

  if (!avatar_id) return fail(res, 'avatar_id wajib diisi');

  const tier   = db.prepare(`SELECT id FROM tiers   WHERE id = ?`).get(req.params.id);
  const avatar = db.prepare(`SELECT id FROM avatars WHERE id = ?`).get(avatar_id);

  if (!tier)   return fail(res, `Tier tidak ditemukan: ${req.params.id}`, 404);
  if (!avatar) return fail(res, `Avatar tidak ditemukan: ${avatar_id}`, 404);

  try {
    db.prepare(`INSERT INTO tier_avatars (tier_id, avatar_id) VALUES (?, ?)`).run(tier.id, avatar.id);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return fail(res, 'Avatar sudah ada di tier ini');
    throw e;
  }

  ok(res, { tier_id: tier.id, avatar_id: avatar.id });
});

// DELETE /admin/tiers/:id/avatars/:avid
// Lepas avatar dari tier
router.delete('/tiers/:id/avatars/:avid', (req, res) => {
  const db = getDB();

  const result = db.prepare(
    `DELETE FROM tier_avatars WHERE tier_id = ? AND avatar_id = ?`
  ).run(req.params.id, req.params.avid);

  if (result.changes === 0) {
    return fail(res, 'Relasi tier-avatar tidak ditemukan', 404);
  }

  ok(res, { tier_id: req.params.id, avatar_id: req.params.avid });
});

// ═════════════════════════════════════════════════════════════════════════════
// AVATAR MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

const AVATARS_DIR = path.join(__dirname, '../../public/avatars');

// GET /admin/avatars
// List semua avatar, termasuk yang disabled
router.get('/avatars', (req, res) => {
  const db = getDB();

  const avatars = db.prepare(`
    SELECT
      a.*,
      GROUP_CONCAT(ta.tier_id) as tier_ids
    FROM avatars a
    LEFT JOIN tier_avatars ta ON a.id = ta.avatar_id
    GROUP BY a.id
    ORDER BY a.display_name ASC
  `).all().map(a => ({
    ...a,
    tier_ids: a.tier_ids ? a.tier_ids.split(',') : [],
  }));

  ok(res, { avatars });
});

// POST /admin/avatars/sync
// Scan folder public/avatars/, daftarkan file PNG baru ke DB
// File yang sudah ada di DB tidak di-overwrite
router.post('/avatars/sync', (req, res) => {
  const db = getDB();

  let files;
  try {
    files = fs.readdirSync(AVATARS_DIR).filter(f => f.toLowerCase().endsWith('.png'));
  } catch {
    return fail(res, `Folder avatars tidak ditemukan: ${AVATARS_DIR}`, 500);
  }

  let added = 0;
  const skipped = [];

  for (const filename of files) {
    const displayName = filename.replace(/\.png$/i, '').replace(/[_-]/g, ' ');
    try {
      db.prepare(`
        INSERT INTO avatars (id, display_name) VALUES (?, ?)
        ON CONFLICT(id) DO NOTHING
      `).run(filename, displayName);

      // Cek apakah row baru dibuat atau sudah ada
      const existing = db.prepare(`SELECT rowid FROM avatars WHERE id = ?`).get(filename);
      if (existing) added++;
    } catch {
      skipped.push(filename);
    }
  }

  // Re-query untuk hasil akhir
  const total = db.prepare(`SELECT COUNT(*) as c FROM avatars`).get().c;

  ok(res, {
    scanned: files.length,
    added,
    skipped,
    total_in_db: total,
  });
});

// PUT /admin/avatars/:id
// Update metadata avatar (display_name, frame_count, frame_width, frame_height)
router.put('/avatars/:id', (req, res) => {
  const db     = getDB();
  const avatar = db.prepare(`SELECT * FROM avatars WHERE id = ?`).get(req.params.id);

  if (!avatar) return fail(res, `Avatar tidak ditemukan: ${req.params.id}`, 404);

  const {
    display_name  = avatar.display_name,
    frame_count   = avatar.frame_count,
    frame_width   = avatar.frame_width,
    frame_height  = avatar.frame_height,
  } = req.body;

  db.prepare(`
    UPDATE avatars SET display_name = ?, frame_count = ?, frame_width = ?, frame_height = ?
    WHERE id = ?
  `).run(display_name, frame_count, frame_width, frame_height, avatar.id);

  ok(res, { avatar: db.prepare(`SELECT * FROM avatars WHERE id = ?`).get(avatar.id) });
});

// POST /admin/avatars/:id/toggle
// Enable/disable avatar — viewer yang sudah pakai tidak terpengaruh sampai mereka ganti
router.post('/avatars/:id/toggle', (req, res) => {
  const db     = getDB();
  const avatar = db.prepare(`SELECT * FROM avatars WHERE id = ?`).get(req.params.id);

  if (!avatar) return fail(res, `Avatar tidak ditemukan: ${req.params.id}`, 404);

  const newState = avatar.is_enabled ? 0 : 1;
  db.prepare(`UPDATE avatars SET is_enabled = ? WHERE id = ?`).run(newState, avatar.id);

  ok(res, { id: avatar.id, is_enabled: newState });
});

// ═════════════════════════════════════════════════════════════════════════════
// VIEWER MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

// GET /admin/viewers
// List semua viewer + tier + avatar + statistik
// Query: ?tier_id=... (filter)
router.get('/viewers', (req, res) => {
  const db     = getDB();
  const filter = req.query.tier_id ? `AND v.tier_id = '${req.query.tier_id}'` : '';

  const viewers = db.prepare(`
    SELECT
      v.*,
      t.display_name  AS tier_name,
      t.color_hex     AS tier_color,
      a.display_name  AS avatar_name
    FROM viewers v
    LEFT JOIN tiers   t ON v.tier_id   = t.id
    LEFT JOIN avatars a ON v.avatar_id = a.id
    WHERE 1=1 ${filter}
    ORDER BY v.registered_at DESC
  `).all();

  ok(res, { viewers });
});

// POST /admin/viewers
// Tambah viewer manual (langsung assign tier)
// Body: { youtube_name, tier_id }
router.post('/viewers', (req, res) => {
  const { youtube_name, tier_id } = req.body;

  if (!youtube_name || !tier_id) {
    return fail(res, 'youtube_name dan tier_id wajib diisi');
  }

  const db   = getDB();
  const tier = db.prepare(`SELECT id FROM tiers WHERE id = ?`).get(tier_id);
  if (!tier) return fail(res, `Tier tidak ditemukan: ${tier_id}`, 404);

  try {
    tierEngine.assignTierManual({ youtubeName: youtube_name.trim(), tierId: tier_id, note: 'Tambah manual dari dashboard' });
  } catch (e) {
    return fail(res, e.message);
  }

  const viewer = tierEngine.getViewerInfo(youtube_name.trim());
  ok(res, { viewer });
});

// PUT /admin/viewers/:id/tier
// Override tier manual
// Body: { tier_id }
router.put('/viewers/:id/tier', (req, res) => {
  const db     = getDB();
  const viewer = db.prepare(`SELECT * FROM viewers WHERE id = ?`).get(req.params.id);

  if (!viewer) return fail(res, `Viewer tidak ditemukan`, 404);

  const { tier_id } = req.body;
  if (!tier_id) return fail(res, 'tier_id wajib diisi');

  try {
    tierEngine.assignTierManual({ youtubeName: viewer.youtube_name, tierId: tier_id, note: 'Override dari dashboard' });
  } catch (e) {
    return fail(res, e.message);
  }

  ok(res, { viewer: tierEngine.getViewerInfo(viewer.youtube_name) });
});

// POST /admin/viewers/:id/donation
// Input donasi manual untuk viewer
// Body: { amount, platform? }
router.post('/viewers/:id/donation', (req, res) => {
  const db     = getDB();
  const viewer = db.prepare(`SELECT * FROM viewers WHERE id = ?`).get(req.params.id);

  if (!viewer) return fail(res, `Viewer tidak ditemukan`, 404);

  const { amount, platform = 'manual' } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return fail(res, 'amount wajib diisi dan harus lebih dari 0');
  }

  let newTier;
  try {
    newTier = tierEngine.addDonation({
      youtubeName: viewer.youtube_name,
      amount:      Number(amount),
      platform,
      meta:        { note: 'Input manual dari dashboard' },
    });
  } catch (e) {
    return fail(res, e.message);
  }

  ok(res, {
    viewer:    tierEngine.getViewerInfo(viewer.youtube_name),
    tier_changed: !!newTier,
    new_tier:  newTier ?? null,
  });
});

// POST /admin/viewers/:id/rc-session
// Input sesi RC manual untuk viewer
// Body: { session_id?, rc_id?, duration_sec? }
router.post('/viewers/:id/rc-session', (req, res) => {
  const db     = getDB();
  const viewer = db.prepare(`SELECT * FROM viewers WHERE id = ?`).get(req.params.id);

  if (!viewer) return fail(res, `Viewer tidak ditemukan`, 404);

  const { session_id = null, rc_id = null, duration_sec = 0 } = req.body;

  let newTier;
  try {
    newTier = tierEngine.addRcSession({
      youtubeName: viewer.youtube_name,
      sessionId:   session_id,
      rcId:        rc_id,
      durationSec: duration_sec,
    });
  } catch (e) {
    return fail(res, e.message);
  }

  ok(res, {
    viewer:       tierEngine.getViewerInfo(viewer.youtube_name),
    tier_changed: !!newTier,
    new_tier:     newTier ?? null,
  });
});

// DELETE /admin/viewers/:id
router.delete('/viewers/:id', (req, res) => {
  const db     = getDB();
  const viewer = db.prepare(`SELECT id, youtube_name FROM viewers WHERE id = ?`).get(req.params.id);

  if (!viewer) return fail(res, `Viewer tidak ditemukan`, 404);

  db.prepare(`DELETE FROM viewers WHERE id = ?`).run(viewer.id);

  ok(res, { deleted: viewer.youtube_name });
});

// POST /admin/viewers/:id/toggle
// Aktifkan / nonaktifkan viewer
router.post('/viewers/:id/toggle', (req, res) => {
  const db     = getDB();
  const viewer = db.prepare(`SELECT * FROM viewers WHERE id = ?`).get(req.params.id);

  if (!viewer) return fail(res, `Viewer tidak ditemukan`, 404);

  const newState = viewer.is_active ? 0 : 1;
  db.prepare(`UPDATE viewers SET is_active = ? WHERE id = ?`).run(newState, viewer.id);

  ok(res, { id: viewer.id, youtube_name: viewer.youtube_name, is_active: newState });
});

// ═════════════════════════════════════════════════════════════════════════════
// POLLING CONTROL
// ═════════════════════════════════════════════════════════════════════════════

// POST /admin/polling/start
// Body: { video_id }
router.post('/polling/start', async (req, res) => {
  const { video_id } = req.body;

  if (!video_id) return fail(res, 'video_id wajib diisi');

  const pollingState = req.app.locals.polling;

  if (pollingState?.isPolling) {
    return fail(res, `Polling sedang berjalan untuk video: ${pollingState.videoId}`);
  }

  const poller = req.app.locals.poller;
  if (!poller) return fail(res, 'YtPoller belum diinisialisasi', 500);

  // start() async — jalankan tanpa block response
  // State akan update otomatis lewat app.locals.polling via _setRunning()
  poller.start(video_id).then(connected => {
    if (!connected) {
      console.error(`[Admin] YtPoller gagal connect ke video: ${video_id}`);
    }
  });

  ok(res, {
    message:  `Polling dimulai untuk video: ${video_id}`,
    video_id,
  });
});

// POST /admin/polling/stop
router.post('/polling/stop', (req, res) => {
  const poller = req.app.locals.poller;

  if (!poller?.isRunning) {
    return fail(res, 'Polling tidak sedang berjalan');
  }

  poller.stop();
  ok(res, { message: 'Polling dihentikan' });
});

// GET /admin/polling/status
router.get('/polling/status', (req, res) => {
  const poller = req.app.locals.poller;
  const stats  = poller ? poller.getStats() : { isRunning: false, videoId: null };
  ok(res, stats);
});

// ═════════════════════════════════════════════════════════════════════════════
// LOG
// ═════════════════════════════════════════════════════════════════════════════

// GET /admin/donor-log
// Query: ?viewer=NamaChannel&limit=50
router.get('/donor-log', (req, res) => {
  const db    = getDB();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const where = req.query.viewer
    ? `WHERE LOWER(youtube_name) = LOWER('${req.query.viewer.replace(/'/g, "''")}')`
    : '';

  const logs = db.prepare(`
    SELECT * FROM donor_log
    ${where}
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  ok(res, { logs, count: logs.length });
});

// GET /admin/chat-log
// Query: ?viewer=NamaChannel&limit=50
router.get('/chat-log', (req, res) => {
  const db    = getDB();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const where = req.query.viewer
    ? `WHERE LOWER(youtube_name) = LOWER('${req.query.viewer.replace(/'/g, "''")}')`
    : '';

  const logs = db.prepare(`
    SELECT * FROM chat_log
    ${where}
    ORDER BY sent_at DESC
    LIMIT ?
  `).all(limit);

  ok(res, { logs, count: logs.length });
});

module.exports = router;
