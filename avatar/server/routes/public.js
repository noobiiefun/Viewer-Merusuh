/**
 * avatar/server/routes/public.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoint publik yang diakses oleh halaman /pick (viewer).
 * Tidak perlu auth — viewer akses langsung dari browser.
 *
 * GET  /api/viewers/check?name=...    → cek apakah viewer terdaftar + info tier
 * GET  /api/avatars?tier_id=...       → list avatar yang tersedia untuk tier ini
 * POST /api/viewers/pick              → simpan pilihan avatar viewer
 */

'use strict';

const express = require('express');
const { getDB } = require('../db/setup');

const router = express.Router();

// ─── GET /api/viewers/check ────────────────────────────────────────────────
// Query: ?name=NamaYouTube
// Response: { success, data: { registered, youtube_name, tier, has_avatar, avatar_id, avatar_name } }
router.get('/viewers/check', (req, res) => {
  const name = (req.query.name || '').trim();

  if (!name) {
    return res.status(400).json({ success: false, error: 'Parameter name wajib diisi.' });
  }

  const db = getDB();

  const viewer = db.prepare(`
    SELECT
      v.*,
      t.id            AS tier_id,
      t.display_name  AS tier_display_name,
      t.color_hex     AS tier_color_hex,
      a.display_name  AS avatar_name
    FROM viewers v
    LEFT JOIN tiers   t ON v.tier_id   = t.id
    LEFT JOIN avatars a ON v.avatar_id = a.id
    WHERE LOWER(v.youtube_name) = LOWER(?)
      AND v.is_active = 1
  `).get(name);

  if (!viewer || !viewer.tier_id) {
    return res.json({
      success: true,
      data: { registered: false },
    });
  }

  res.json({
    success: true,
    data: {
      registered:   true,
      youtube_name: viewer.youtube_name,
      has_avatar:   !!viewer.avatar_id,
      avatar_id:    viewer.avatar_id   || null,
      avatar_name:  viewer.avatar_name || null,
      tier: {
        id:           viewer.tier_id,
        display_name: viewer.tier_display_name,
        color_hex:    viewer.tier_color_hex,
      },
    },
  });
});

// ─── GET /api/avatars ─────────────────────────────────────────────────────
// Query: ?tier_id=rusuh_biasa
// Response: { success, data: [ { id, display_name, frame_count, frame_width, frame_height } ] }
router.get('/avatars', (req, res) => {
  const tierId = (req.query.tier_id || '').trim();

  if (!tierId) {
    return res.status(400).json({ success: false, error: 'Parameter tier_id wajib diisi.' });
  }

  const db = getDB();

  const avatars = db.prepare(`
    SELECT
      a.id,
      a.display_name,
      a.frame_count,
      a.frame_width,
      a.frame_height
    FROM avatars a
    INNER JOIN tier_avatars ta ON a.id = ta.avatar_id
    WHERE ta.tier_id = ?
      AND a.is_enabled = 1
    ORDER BY a.display_name ASC
  `).all(tierId);

  res.json({ success: true, data: avatars });
});

// ─── POST /api/viewers/pick ───────────────────────────────────────────────
// Body: { youtube_name, avatar_id }
// Response: { success, data: { youtube_name, avatar_id, avatar_name } }
router.post('/viewers/pick', (req, res) => {
  const { youtube_name, avatar_id } = req.body;

  if (!youtube_name || !avatar_id) {
    return res.status(400).json({ success: false, error: 'youtube_name dan avatar_id wajib diisi.' });
  }

  const db = getDB();

  // Cek viewer ada dan aktif
  const viewer = db.prepare(`
    SELECT v.id, v.tier_id FROM viewers v
    WHERE LOWER(v.youtube_name) = LOWER(?) AND v.is_active = 1
  `).get(youtube_name.trim());

  if (!viewer || !viewer.tier_id) {
    return res.status(403).json({ success: false, error: 'Viewer tidak ditemukan atau belum punya tier.' });
  }

  // Cek avatar tersedia untuk tier ini
  const allowed = db.prepare(`
    SELECT 1 FROM tier_avatars ta
    INNER JOIN avatars a ON ta.avatar_id = a.id
    WHERE ta.tier_id = ? AND ta.avatar_id = ? AND a.is_enabled = 1
  `).get(viewer.tier_id, avatar_id);

  if (!allowed) {
    return res.status(403).json({ success: false, error: 'Avatar tidak tersedia untuk tier kamu.' });
  }

  // Simpan pilihan
  db.prepare(`UPDATE viewers SET avatar_id = ? WHERE id = ?`).run(avatar_id, viewer.id);

  const avatar = db.prepare(`SELECT display_name FROM avatars WHERE id = ?`).get(avatar_id);

  // Broadcast ke dashboard agar stat "Punya Avatar" update
  const io = req.app.get('io');
  if (io) io.emit('viewer_registered', { youtube_name: youtube_name.trim() });

  res.json({
    success: true,
    data: {
      youtube_name: youtube_name.trim(),
      avatar_id,
      avatar_name: avatar?.display_name || avatar_id,
    },
  });
});

module.exports = router;
