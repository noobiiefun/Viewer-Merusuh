/**
 * routes/ngrok.js
 * Endpoint untuk kelola tunnel ngrok dari dashboard (tab Konfigurasi).
 *
 * Mounting di server/index.js:
 *   app.use('/api/ngrok', require('./routes/ngrok'));
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const ngrokManager = require('../core/ngrokManager');

// Path .env mengikuti pola yang sama dengan routes/env.js (ENV_PATH dari Electron, atau ./env saat dev)
const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, '../../.env');

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const result = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    result[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  });
  return result;
}

function writeEnvKey(key, value) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
  const lines = content.split('\n');
  let found = false;

  const newLines = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    if (newLines.length && newLines[newLines.length - 1].trim() !== '') {
      newLines.push('');
    }
    newLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(ENV_PATH, newLines.join('\n'));
  process.env[key] = value;
}

/**
 * GET /api/ngrok/status
 * Status tunnel saat ini + apakah token sudah tersimpan.
 */
router.get('/status', (req, res) => {
  const env = readEnvFile();
  res.json({
    success: true,
    data: {
      ...ngrokManager.getState(),
      tokenSaved: Boolean(env.NGROK_AUTHTOKEN),
      autostart: env.NGROK_AUTOSTART === 'true',
    },
  });
});

/**
 * POST /api/ngrok/token
 * Body: { authtoken: string, autostart: boolean }
 * Simpan authtoken ke .env (tidak langsung connect).
 */
router.post('/token', (req, res) => {
  const { authtoken, autostart } = req.body;

  if (!authtoken || typeof authtoken !== 'string' || authtoken.trim().length < 10) {
    return res.status(400).json({ success: false, error: 'Authtoken tidak valid.' });
  }

  writeEnvKey('NGROK_AUTHTOKEN', authtoken.trim());
  writeEnvKey('NGROK_AUTOSTART', autostart ? 'true' : 'false');

  res.json({ success: true, data: { saved: true } });
});

/**
 * POST /api/ngrok/start
 * Mulai tunnel pakai token yang sudah tersimpan di .env (atau token baru dari body jika dikirim).
 */
router.post('/start', async (req, res) => {
  try {
    const env = readEnvFile();
    const authtoken = req.body.authtoken || env.NGROK_AUTHTOKEN || process.env.NGROK_AUTHTOKEN;
    const port = process.env.PORT || 3000;

    if (!authtoken) {
      return res.status(400).json({
        success: false,
        error: 'Authtoken belum diisi. Paste token ngrok dulu lalu simpan.',
      });
    }

    const result = await ngrokManager.start({ authtoken, port });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Gagal memulai tunnel.' });
  }
});

/**
 * POST /api/ngrok/stop
 */
router.post('/stop', async (req, res) => {
  try {
    await ngrokManager.stop();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ngrok/test
 * Cek apakah tunnel benar-benar bisa diakses dari internet (round-trip lewat URL publik).
 */
router.post('/test', async (req, res) => {
  try {
    const result = await ngrokManager.testConnection();
    res.json({ success: result.ok, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ngrok/ping-target
 * Endpoint internal yang dipanggil LEWAT URL publik ngrok saat tombol "Test Koneksi" ditekan.
 * Kalau request ini berhasil sampai ke sini, berarti tunnel benar-benar reachable dari internet.
 */
router.get('/ping-target', (req, res) => {
  res.json({ success: true, message: 'pong', timestamp: Date.now() });
});

module.exports = router;
