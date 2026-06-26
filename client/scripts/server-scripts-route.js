'use strict';

/**
 * routes/scripts.js — tambahkan ke server (Step 2)
 *
 * Expose folder adapters/ahk/ agar bisa disync oleh sync-scripts.js di client.
 *
 * Daftarkan di server/index.js:
 *   const scriptsRouter = require('./routes/scripts');
 *   app.use('/api/scripts', scriptsRouter);
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

// Path folder ahk di server
const AHK_ROOT = path.resolve(
  process.env.AHK_SCRIPTS_PATH || path.join(__dirname, '..', '..', 'adapters', 'ahk')
);

// ─────────────────────────────────────────────
// Auth middleware — cek CLIENT_SECRET
// ─────────────────────────────────────────────
function authCheck(req, res, next) {
  const secret = process.env.CLIENT_SECRET;
  if (secret) {
    const provided = req.headers['x-client-secret'];
    if (provided !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
}

// ─────────────────────────────────────────────
// Helper: FNV-1a hash sederhana
// ─────────────────────────────────────────────
function fileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  let h = 0x811c9dc5;
  for (const b of buf) {
    h ^= b;
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// ─────────────────────────────────────────────
// Helper: scan folder rekursif
// ─────────────────────────────────────────────
function scanDir(dir, base = '') {
  const result = [];
  if (!fs.existsSync(dir)) return result;

  for (const entry of fs.readdirSync(dir)) {
    const absPath = path.join(dir, entry);
    const relPath = base ? `${base}/${entry}` : entry;
    const stat    = fs.statSync(absPath);

    if (stat.isDirectory()) {
      result.push(...scanDir(absPath, relPath));
    } else if (entry.endsWith('.ahk')) {
      result.push({
        path: relPath,
        size: stat.size,
        hash: fileHash(absPath),
        mtime: stat.mtimeMs,
      });
    }
  }
  return result;
}

// ─────────────────────────────────────────────
// GET /api/scripts/list
// Kembalikan daftar semua .ahk dengan hash
// ─────────────────────────────────────────────
router.get('/list', authCheck, (req, res) => {
  try {
    const files = scanDir(AHK_ROOT);
    res.json(files);
  } catch (err) {
    console.error('[Scripts] Error scanning AHK dir:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/scripts/file?path=games/racing/brake_force.ahk
// Download satu file
// ─────────────────────────────────────────────
router.get('/file', authCheck, (req, res) => {
  const relPath = req.query.path;
  if (!relPath) {
    return res.status(400).json({ error: 'Parameter path diperlukan' });
  }

  // Security: cegah path traversal
  const resolved = path.resolve(AHK_ROOT, relPath);
  if (!resolved.startsWith(AHK_ROOT)) {
    return res.status(403).json({ error: 'Path tidak diizinkan' });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-File-Hash', fileHash(resolved));
  res.sendFile(resolved);
});

module.exports = router;
