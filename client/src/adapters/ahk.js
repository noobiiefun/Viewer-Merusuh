'use strict';

/**
 * AHK Adapter — Step 1 & 2
 * Menjalankan script AutoHotkey v2 berdasarkan action yang diterima.
 *
 * Resolusi path script:
 *   adapters/ahk/games/<category>/<action>.ahk   (utama)
 *   adapters/ahk/lib/<action>.ahk                 (fallback)
 *   adapters/ahk/lib/generic_key.ahk              (fallback terakhir)
 */

const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');
const logger     = require('../utils/logger');

const AHK_EXE    = process.env.AHK_EXE_PATH || 'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe';
const AHK_ROOT   = path.resolve(process.cwd(), 'adapters', 'ahk');

// Direktori pencarian script (urutan prioritas)
const SEARCH_DIRS = [
  path.join(AHK_ROOT, 'games', 'racing'),
  path.join(AHK_ROOT, 'games', 'action'),
  path.join(AHK_ROOT, 'games', 'fps'),
  path.join(AHK_ROOT, 'games', 'misc'),
  path.join(AHK_ROOT, 'games'),
  path.join(AHK_ROOT, 'lib'),
];

const FALLBACK_SCRIPT = path.join(AHK_ROOT, 'lib', 'generic_key.ahk');

// ─── Helpers ───────────────────────────────────────────────────────────────

function findScript(action) {
  const filename = `${action}.ahk`;
  for (const dir of SEARCH_DIRS) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  if (fs.existsSync(FALLBACK_SCRIPT)) return FALLBACK_SCRIPT;
  return null;
}

/**
 * Jalankan script AHK dan tunggu sampai selesai.
 * @param {string} scriptPath
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function runAHK(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    logger.debug(`[AHK] Menjalankan: "${AHK_EXE}" "${scriptPath}" ${args.join(' ')}`);

    const proc = spawn(AHK_EXE, [scriptPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    proc.stdout.on('data', d => logger.debug(`[AHK stdout] ${d.toString().trim()}`));
    proc.stderr.on('data', d => logger.warn(`[AHK stderr] ${d.toString().trim()}`));

    proc.on('error', err => {
      if (err.code === 'ENOENT') {
        reject(new Error(`AutoHotkey tidak ditemukan di: ${AHK_EXE}\nCek AHK_EXE_PATH di .env`));
      } else {
        reject(err);
      }
    });

    proc.on('close', code => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`AHK exit code ${code} untuk script: ${scriptPath}`));
      }
    });
  });
}

// ─── Adapter Interface ─────────────────────────────────────────────────────

const ahkAdapter = {
  name: 'ahk',

  async init() {
    // Cek apakah AHK executable ada
    if (!fs.existsSync(AHK_EXE)) {
      logger.warn(`[AHK] AutoHotkey tidak ditemukan: ${AHK_EXE}`);
      logger.warn(`[AHK] Pastikan AutoHotkey v2 terinstall dan AHK_EXE_PATH di .env sudah benar.`);
      // Tetap return true — mungkin AHK ada di PATH system
    }

    if (!fs.existsSync(AHK_ROOT)) {
      logger.warn(`[AHK] Folder adapters/ahk/ tidak ditemukan.`);
      logger.warn(`[AHK] Salin folder adapters/ahk/ dari PC Server ke sini.`);
    }

    logger.info(`[AHK] Adapter aktif. Script root: ${AHK_ROOT}`);
    return true;
  },

  async execute({ action, params = {} }) {
    const scriptPath = findScript(action);

    if (!scriptPath) {
      logger.warn(`[AHK] Script tidak ditemukan untuk action: "${action}"`);
      logger.warn(`[AHK] Buat file: adapters/ahk/games/<kategori>/${action}.ahk`);
      logger.debug(`[AHK] Path yang dicari: ${SEARCH_DIRS.map(d => path.join(d, action + '.ahk')).join(', ')}`);
      return;
    }

    logger.info(`[AHK] Menjalankan: ${path.relative(process.cwd(), scriptPath)}`);

    // Kirim params sebagai argumen JSON ke script AHK
    const args = Object.keys(params).length > 0 ? [JSON.stringify(params)] : [];

    try {
      await runAHK(scriptPath, args);
      logger.info(`[AHK] ✓ "${action}" selesai`);
    } catch (err) {
      logger.error(`[AHK] Error "${action}": ${err.message}`);
    }
  },
};

module.exports = ahkAdapter;
