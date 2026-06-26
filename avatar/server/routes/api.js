/**
 * avatar/server/routes/api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * REST API publik — diakses oleh halaman /pick (viewer) dan overlay.
 *
 * BASE: /api
 *
 * Endpoint:
 *   GET  /api/status                      → Status server
 *   GET  /api/viewers/check?name=...      → Cek status viewer (terdaftar? tier? avatar?)
 *   GET  /api/avatars?tier_id=...         → List avatar yang bisa dipilih viewer
 *   POST /api/viewers/pick                → Viewer submit pilihan avatar
 *
 * CATATAN DESAIN:
 *   Endpoint ini hanya melayani viewer yang SUDAH TERDAFTAR (punya tier).
 *   Viewer yang tidak terdaftar akan mendapat respons { registered: false }.
 *   Ini by design — lihat dokumentasi Section 1.1.
 */

const express = require('express');
const path    = require('path');
const { getDB } = require('../db/setup');
const { getViewerInfo } = require('../core/tierEngine');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok(res, data) {
  return res.json({ success: true, ...data });
}

function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

// ─── GET /api/status ─────────────────────────────────────────────────────────
/**
 * Status server — dipakai overlay dan dashboard untuk health check.
 * Field isPolling dan videoId diisi oleh ytPoller via module state (nanti).
 */
router.get('/status', (req, res) => {
  const db = getDB();

  const viewerCount = db.prepare(`SELECT COUNT(*) as c FROM viewers WHERE is_active = 1`).get().c;
  const avatarCount = db.prepare(`SELECT COUNT(*) as c FROM avatars WHERE is_enabled = 1`).get().c;
  const tierCount   = db.prepare(`SELECT COUNT(*) as c FROM tiers`).get().c;

  // isPolling & videoId akan di-inject oleh ytPoller nanti via req.app.locals
  const pollingState = req.app.locals.polling || { isPolling: false, videoId: null };

  ok(res, {
    module:       'Avatar Overlay',
    version:      '0.1.0',
    isPolling:    pollingState.isPolling,
    videoId:      pollingState.videoId,
    viewerCount,
    avatarCount,
    tierCount,
  });
});

// ─── GET /api/viewers/check ───────────────────────────────────────────────────
/**
 * Cek apakah viewer terdaftar dan punya hak avatar.
 *
 * Query: ?name=NamaYouTubeChannel
 *
 * Response:
 *   { registered: false }
 *   { registered: true, tier: {...}, has_avatar: false, avatar_id: null }
 *   { registered: true, tier: {...}, has_avatar: true,  avatar_id: "warrior.png" }
 */
router.get('/viewers/check', (req, res) => {
  const name = (req.query.name || '').trim();

  if (!name) {
    return fail(res, 'Parameter ?name wajib diisi');
  }

  const viewer = getViewerInfo(name);

  if (!viewer || !viewer.tier_id) {
    return ok(res, {
      registered: false,
      message: 'Nama kamu belum ada di daftar. Minta link ke streamer setelah donasi atau sewa RC.',
    });
  }

  if (!viewer.is_active) {
    return ok(res, {
      registered: false,
      message: 'Akun kamu sedang dinonaktifkan. Hubungi streamer.',
    });
  }

  return ok(res, {
    registered:  true,
    has_avatar:  !!viewer.avatar_id,
    avatar_id:   viewer.avatar_id ?? null,
    avatar_name: viewer.avatar_name ?? null,
    tier: {
      id:           viewer.tier_id,
      display_name: viewer.tier_name,
      color_hex:    viewer.tier_color,
    },
  });
});

// ─── GET /api/avatars ─────────────────────────────────────────────────────────
/**
 * List avatar yang bisa dipilih viewer berdasarkan tier mereka.
 *
 * Query: ?tier_id=rusuh_biasa
 *
 * Hanya avatar yang:
 *   1. Terdaftar di tabel tier_avatars untuk tier tersebut
 *   2. is_enabled = 1
 *
 * Response: { avatars: [ { id, display_name, frame_count, frame_width, frame_height } ] }
 */
router.get('/avatars', (req, res) => {
  const tierId = (req.query.tier_id || '').trim();

  if (!tierId) {
    return fail(res, 'Parameter ?tier_id wajib diisi');
  }

  const db = getDB();

  // Cek tier ada
  const tier = db.prepare(`SELECT id, display_name FROM tiers WHERE id = ?`).get(tierId);
  if (!tier) {
    return fail(res, `Tier tidak ditemukan: ${tierId}`, 404);
  }

  const avatars = db.prepare(`
    SELECT a.id, a.display_name, a.frame_count, a.frame_width, a.frame_height
    FROM avatars a
    JOIN tier_avatars ta ON a.id = ta.avatar_id
    WHERE ta.tier_id  = ?
      AND a.is_enabled = 1
    ORDER BY a.display_name ASC
  `).all(tierId);

  return ok(res, { tier, avatars });
});

// ─── POST /api/viewers/pick ───────────────────────────────────────────────────
/**
 * Viewer submit pilihan avatar mereka.
 *
 * Body: { youtube_name, avatar_id }
 *
 * Validasi:
 *   - youtube_name harus terdaftar dan punya tier
 *   - avatar_id harus ada di tier_avatars tier viewer tersebut
 *   - avatar harus is_enabled = 1
 *
 * Response: { success: true, message: "Avatar disimpan!" }
 */
router.post('/viewers/pick', (req, res) => {
  const { youtube_name, avatar_id } = req.body;

  if (!youtube_name || !avatar_id) {
    return fail(res, 'youtube_name dan avatar_id wajib diisi');
  }

  const db     = getDB();
  const viewer = getViewerInfo(youtube_name.trim());

  if (!viewer || !viewer.tier_id) {
    return fail(res, 'Viewer tidak terdaftar atau belum punya tier', 403);
  }

  if (!viewer.is_active) {
    return fail(res, 'Akun dinonaktifkan. Hubungi streamer.', 403);
  }

  // Validasi: avatar harus ada di tier viewer dan enabled
  const valid = db.prepare(`
    SELECT 1
    FROM tier_avatars ta
    JOIN avatars a ON ta.avatar_id = a.id
    WHERE ta.tier_id   = ?
      AND ta.avatar_id = ?
      AND a.is_enabled = 1
  `).get(viewer.tier_id, avatar_id.trim());

  if (!valid) {
    return fail(res, 'Avatar tidak tersedia untuk tier kamu', 403);
  }

  // Simpan pilihan
  db.prepare(`
    UPDATE viewers SET avatar_id = ? WHERE LOWER(youtube_name) = LOWER(?)
  `).run(avatar_id.trim(), youtube_name.trim());

  return ok(res, {
    message: 'Avatar disimpan! Kamu akan muncul saat chat di live.',
    avatar_id: avatar_id.trim(),
  });
});

module.exports = router;
