#!/usr/bin/env node
'use strict';

/**
 * sync-scripts.js — Step 2
 *
 * Tool untuk menyinkronkan folder adapters/ahk/ dari PC Server ke PC Client.
 * Server harus expose endpoint GET /api/scripts/list dan GET /api/scripts/file?path=...
 *
 * Penggunaan:
 *   node scripts/sync-scripts.js
 *   node scripts/sync-scripts.js --dry-run      (lihat apa yang akan diunduh)
 *   node scripts/sync-scripts.js --force         (timpa semua, termasuk yang sama)
 *
 * Env yang diperlukan: SERVER_URL, CLIENT_SECRET
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const url      = require('url');

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const SERVER_URL    = process.env.SERVER_URL;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const DRY_RUN       = process.argv.includes('--dry-run');
const FORCE         = process.argv.includes('--force');

const LOCAL_AHK_ROOT = path.resolve(
  process.env.AHK_SCRIPTS_PATH || path.join(__dirname, '..', 'adapters', 'ahk')
);

// ─────────────────────────────────────────────
// Colors untuk output terminal
// ─────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m',
};

const log = {
  info:    (msg) => console.log(`${C.cyan}[sync]${C.reset} ${msg}`),
  ok:      (msg) => console.log(`${C.green}[✓]${C.reset} ${msg}`),
  skip:    (msg) => console.log(`${C.gray}[─]${C.reset} ${msg}`),
  warn:    (msg) => console.log(`${C.yellow}[!]${C.reset} ${msg}`),
  error:   (msg) => console.error(`${C.red}[✗]${C.reset} ${msg}`),
  dry:     (msg) => console.log(`${C.yellow}[DRY]${C.reset} ${msg}`),
  section: (msg) => console.log(`\n${C.bold}${msg}${C.reset}`),
};

// ─────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────
function request(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(urlStr);
    const isHttps = parsed.protocol === 'https:';
    const client  = isHttps ? https : http;

    const reqOptions = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || 'GET',
      headers: {
        'x-client-secret': CLIENT_SECRET || '',
        'x-client-name':   process.env.CLIENT_NAME || 'sync-tool',
        ...options.headers,
      },
    };

    const req = client.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.end();
  });
}

async function fetchJSON(urlStr) {
  const res = await request(urlStr);
  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status} dari ${urlStr}`);
  }
  return JSON.parse(res.body.toString('utf8'));
}

async function fetchBinary(urlStr) {
  const res = await request(urlStr);
  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status} dari ${urlStr}`);
  }
  return res.body;
}

// ─────────────────────────────────────────────
// Checksum sederhana untuk compare file
// ─────────────────────────────────────────────
function simpleHash(buf) {
  let h = 0x811c9dc5;
  for (const b of buf) {
    h ^= b;
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// ─────────────────────────────────────────────
// Sync logic
// ─────────────────────────────────────────────
async function syncScripts() {
  log.section('=== Viewer Merusuh — Script Sync Tool ===');

  if (!SERVER_URL) {
    log.error('SERVER_URL tidak diset di .env');
    process.exit(1);
  }
  if (!CLIENT_SECRET) {
    log.warn('CLIENT_SECRET tidak diset — server mungkin menolak request');
  }

  if (DRY_RUN) log.warn('Mode DRY_RUN aktif — tidak ada file yang akan ditulis');

  log.info(`Server : ${SERVER_URL}`);
  log.info(`Target : ${LOCAL_AHK_ROOT}`);

  // 1. Ambil daftar file dari server
  log.section('1. Mengambil daftar script dari server...');

  let fileList;
  try {
    const endpoint = `${SERVER_URL}/api/scripts/list`;
    fileList = await fetchJSON(endpoint);
    log.ok(`${fileList.length} file ditemukan di server`);
  } catch (err) {
    log.error(`Gagal mengambil daftar: ${err.message}`);
    log.info('Pastikan server menjalankan endpoint GET /api/scripts/list');
    process.exit(1);
  }

  if (!Array.isArray(fileList) || fileList.length === 0) {
    log.warn('Server mengembalikan daftar kosong. Tidak ada yang disync.');
    return;
  }

  // 2. Proses setiap file
  log.section('2. Menyinkronkan file...');

  const stats = { downloaded: 0, skipped: 0, failed: 0, created_dirs: 0 };

  for (const entry of fileList) {
    // entry: { path: 'games/racing/brake_force.ahk', hash?: string, size?: number }
    const relPath  = entry.path || entry; // support array of strings
    const localPath = path.join(LOCAL_AHK_ROOT, relPath);
    const localDir  = path.dirname(localPath);

    // Buat direktori jika belum ada
    if (!fs.existsSync(localDir)) {
      if (!DRY_RUN) {
        fs.mkdirSync(localDir, { recursive: true });
        stats.created_dirs++;
      }
      log.ok(`Dir: ${path.relative(LOCAL_AHK_ROOT, localDir)}`);
    }

    // Skip jika file ada dan hash sama (kecuali --force)
    if (!FORCE && fs.existsSync(localPath) && entry.hash) {
      const localBuf  = fs.readFileSync(localPath);
      const localHash = simpleHash(localBuf);
      if (localHash === entry.hash) {
        log.skip(`sama : ${relPath}`);
        stats.skipped++;
        continue;
      }
    }

    // Download file
    try {
      const encodedPath = encodeURIComponent(relPath);
      const fileUrl     = `${SERVER_URL}/api/scripts/file?path=${encodedPath}`;

      if (DRY_RUN) {
        log.dry(`akan unduh: ${relPath}`);
        stats.downloaded++;
        continue;
      }

      const buf = await fetchBinary(fileUrl);
      fs.writeFileSync(localPath, buf);
      log.ok(`unduh : ${relPath} (${buf.length} bytes)`);
      stats.downloaded++;
    } catch (err) {
      log.error(`gagal   : ${relPath} — ${err.message}`);
      stats.failed++;
    }
  }

  // 3. Summary
  log.section('3. Ringkasan');
  console.log(`  ${C.green}Diunduh   : ${stats.downloaded}${C.reset}`);
  console.log(`  ${C.gray}Dilewati  : ${stats.skipped}${C.reset}`);
  console.log(`  ${C.red}Gagal     : ${stats.failed}${C.reset}`);
  if (stats.created_dirs > 0) {
    console.log(`  Dir dibuat: ${stats.created_dirs}`);
  }

  if (stats.failed > 0) {
    log.warn('Ada file yang gagal diunduh. Cek koneksi dan konfigurasi server.');
    process.exit(1);
  } else {
    log.ok('Sync selesai!');
  }
}

syncScripts().catch((err) => {
  log.error(`Fatal: ${err.message}`);
  process.exit(1);
});
