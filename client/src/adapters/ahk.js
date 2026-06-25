/**
 * adapters/ahk.js
 * Adapter AutoHotkey untuk sisi client.
 *
 * Cara kerja:
 *  - Menerima payload efek dari AdapterManager
 *  - Meresolve path script AHK berdasarkan action
 *  - Spawn proses AutoHotkey.exe dengan script yang sesuai
 *
 * Kompatibel dengan struktur folder adapters/ahk/ yang sama
 * seperti di server Viewer Merusuh.
 */

'use strict';

const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');
const logger    = require('../utils/logger');
const { config } = require('../utils/config');

const LABEL = 'AHK';

class AhkAdapter {
  constructor() {
    // Path ke folder scripts AHK
    // Default: ambil dari folder adapters/ahk/ di root proyek client
    this.scriptsRoot = config.ahkScriptsPath
      ? path.resolve(config.ahkScriptsPath)
      : path.resolve(__dirname, '..', '..', 'adapters', 'ahk');

    this.ahkExe = config.ahkExePath;
  }

  async init() {
    // Cek apakah AutoHotkey.exe ada
    if (!fs.existsSync(this.ahkExe)) {
      logger.warn(LABEL, `AutoHotkey tidak ditemukan di: ${this.ahkExe}`);
      logger.warn(LABEL, 'Set AHK_EXE_PATH di .env ke path AutoHotkey v2 yang benar.');
      // Tidak throw — tetap lanjut, akan gagal saat eksekusi saja
    } else {
      logger.info(LABEL, `AutoHotkey ditemukan: ${this.ahkExe}`);
    }

    logger.info(LABEL, `Scripts root: ${this.scriptsRoot}`);
  }

  /**
   * Eksekusi efek AHK.
   * @param {{ action: string, params: object }} payload
   */
  execute({ action, params }) {
    const scriptPath = this._resolveScript(action);
    if (!scriptPath) {
      logger.warn(LABEL, `Script tidak ditemukan untuk action: ${action}`);
      return;
    }

    logger.info(LABEL, `Menjalankan: ${path.basename(scriptPath)} (action: ${action})`);

    // Kirim params sebagai argument CLI ke script AHK
    // Contoh: AutoHotkey64.exe script.ahk param1 param2
    const args = [scriptPath];
    if (params && typeof params === 'object') {
      Object.values(params).forEach(v => args.push(String(v)));
    }

    const proc = spawn(this.ahkExe, args, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', d => logger.debug(LABEL, `[stdout] ${d.toString().trim()}`));
    proc.stderr.on('data', d => logger.warn(LABEL, `[stderr] ${d.toString().trim()}`));

    proc.on('close', (code) => {
      if (code === 0) {
        logger.success(LABEL, `✅ ${action} selesai`);
      } else {
        logger.warn(LABEL, `Script exit dengan kode: ${code}`);
      }
    });

    proc.on('error', (err) => {
      logger.error(LABEL, `Gagal spawn AHK: ${err.message}`);
    });
  }

  /**
   * Resolve path script AHK dari action string.
   *
   * Urutan pencarian:
   *  1. adapters/ahk/games/<action>.ahk         (untuk action sederhana)
   *  2. adapters/ahk/games/<cat>/<action>.ahk   (dikategorikan)
   *  3. adapters/ahk/lib/generic_key.ahk        (fallback generic)
   *
   * Contoh action:
   *  'brake_force'   → games/racing/brake_force.ahk
   *  'horn_spam'     → games/action/horn_spam.ahk
   *  'custom_key_1'  → lib/generic_key.ahk
   *
   * @param {string} action
   * @returns {string|null} path absolut atau null jika tidak ditemukan
   */
  _resolveScript(action) {
    const candidates = [
      // Flat di root games/
      path.join(this.scriptsRoot, 'games', `${action}.ahk`),
      // Kategorisasi (racing, action, fps, survival, global)
      ...['racing', 'action', 'fps', 'survival', 'global', 'gta5', 'beamng'].map(cat =>
        path.join(this.scriptsRoot, 'games', cat, `${action}.ahk`)
      ),
      // Generic key fallback
      path.join(this.scriptsRoot, 'lib', 'generic_key.ahk'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }
}

module.exports = AhkAdapter;
