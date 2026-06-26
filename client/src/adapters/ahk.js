'use strict';

/**
 * AHK Adapter — Step 2
 *
 * Menjalankan script AutoHotkey v2 berdasarkan action_key.
 * Support:
 *  - params diteruskan ke script via CLI args
 *  - per-script logging ke file logs/ahk/
 *  - fallback ke lib/generic_key.ahk jika script spesifik tidak ada
 *  - dry-run mode (LOG_LEVEL=debug, AHK_DRY_RUN=true)
 */

const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');
const logger    = require('../utils/logger');
const config    = require('../utils/config');

// ─────────────────────────────────────────────
// Resolusi path
// ─────────────────────────────────────────────

// Root folder scripts AHK (relatif terhadap root project client)
const AHK_ROOT = path.resolve(
  config.AHK_SCRIPTS_PATH || path.join(__dirname, '..', '..', 'adapters', 'ahk')
);

// Log folder untuk output per script
const LOG_DIR = path.resolve(config.LOG_DIR || path.join(__dirname, '..', '..', 'logs', 'ahk'));

// Pastikan log dir ada
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
// Registry: action_key → path relatif script
// ─────────────────────────────────────────────
// Mendukung path eksplisit per action.
// Jika tidak terdaftar, adapter akan coba auto-resolve dari subfolder games/.

const ACTION_REGISTRY = {
  // ── Racing ──────────────────────────────────
  brake_force:   'games/racing/brake_force.ahk',
  handbrake:     'games/racing/handbrake.ahk',
  full_throttle: 'games/racing/full_throttle.ahk',
  flip_car:      'games/racing/flip_car.ahk',
  slow_motion:   'games/racing/slow_motion.ahk',
  random_steer:  'games/racing/random_steer.ahk',

  // ── Action / Open World ─────────────────────
  horn_spam:        'games/action/horn_spam.ahk',
  explosion_rain:   'games/action/explosion_rain.ahk',
  wanted_level_up:  'games/action/wanted_level_up.ahk',
  ragdoll:          'games/action/ragdoll.ahk',
  super_jump:       'games/action/super_jump.ahk',
  chaos_mode:       'games/action/chaos_mode.ahk',

  // ── FPS ─────────────────────────────────────
  no_ammo:       'games/fps/no_ammo.ahk',
  invert_mouse:  'games/fps/invert_mouse.ahk',
  random_weapon: 'games/fps/random_weapon.ahk',

  // ── Survival ────────────────────────────────
  drop_item:    'games/survival/drop_item.ahk',
  camera_shake: 'games/survival/camera_shake.ahk',
};

// ─────────────────────────────────────────────
// Helper: serialize params menjadi argumen CLI
// ─────────────────────────────────────────────
// Format yang dikirim ke script AHK: key=value sebagai arg posisi 1
// Script AHK bisa parse: A_Args[1] berisi JSON string
//
// Contoh: { duration_ms: 3000, intensity: 2 }
//   → AutoHotkey64.exe script.ahk "{""duration_ms"":3000,""intensity"":2}"
//
function buildAhkArgs(scriptPath, params = {}) {
  const args = [scriptPath];
  if (params && Object.keys(params).length > 0) {
    // JSON → escape double quotes untuk Windows CLI
    const json = JSON.stringify(params).replace(/"/g, '""');
    args.push(json);
  }
  return args;
}

// ─────────────────────────────────────────────
// Helper: resolve path script
// ─────────────────────────────────────────────
function resolveScriptPath(action) {
  // 1. Cek registry eksplisit
  if (ACTION_REGISTRY[action]) {
    const p = path.join(AHK_ROOT, ACTION_REGISTRY[action]);
    if (fs.existsSync(p)) return p;
    logger.warn(`[AHK] Registry entry untuk "${action}" tidak ditemukan: ${p}`);
  }

  // 2. Auto-resolve: cari di semua subfolder games/
  const gamesDir = path.join(AHK_ROOT, 'games');
  if (fs.existsSync(gamesDir)) {
    for (const group of fs.readdirSync(gamesDir)) {
      const candidate = path.join(gamesDir, group, `${action}.ahk`);
      if (fs.existsSync(candidate)) {
        logger.debug(`[AHK] Auto-resolved "${action}" → ${candidate}`);
        return candidate;
      }
    }
  }

  // 3. Fallback ke lib/generic_key.ahk
  const fallback = path.join(AHK_ROOT, 'lib', 'generic_key.ahk');
  if (fs.existsSync(fallback)) {
    logger.warn(`[AHK] Script untuk "${action}" tidak ditemukan, fallback ke generic_key.ahk`);
    return fallback;
  }

  return null;
}

// ─────────────────────────────────────────────
// Helper: per-script file logger
// ─────────────────────────────────────────────
function getScriptLogStream(action) {
  const logFile = path.join(LOG_DIR, `${action}.log`);
  return fs.createWriteStream(logFile, { flags: 'a' });
}

function writeScriptLog(stream, tag, data) {
  const ts  = new Date().toISOString();
  const line = `[${ts}] [${tag}] ${data}\n`;
  stream.write(line);
}

// ─────────────────────────────────────────────
// Core: eksekusi script AHK
// ─────────────────────────────────────────────
function execute({ action, params = {}, duration_ms, donation } = {}) {
  return new Promise((resolve, reject) => {
    const ahkExe = config.AHK_EXE_PATH;
    if (!ahkExe) {
      return reject(new Error('AHK_EXE_PATH tidak dikonfigurasi di .env'));
    }

    const scriptPath = resolveScriptPath(action);
    if (!scriptPath) {
      return reject(new Error(`Tidak ada script AHK untuk action "${action}"`));
    }

    // Gabungkan params + durasi ke payload
    const effectParams = { duration_ms, ...params };

    const args    = buildAhkArgs(scriptPath, effectParams);
    const logTag  = donation?.username ? `${donation.username}/${action}` : action;
    const logStream = getScriptLogStream(action);

    logger.info(`[AHK] Eksekusi: ${action} | params: ${JSON.stringify(effectParams)}`);
    logger.debug(`[AHK] Command: "${ahkExe}" ${args.join(' ')}`);

    writeScriptLog(logStream, 'START', `action=${action} params=${JSON.stringify(effectParams)} script=${scriptPath}`);
    if (donation) {
      writeScriptLog(logStream, 'DONATION', `user=${donation.username} amount=${donation.amount} msg="${donation.message}"`);
    }

    // Dry-run: skip proses nyata
    if (config.AHK_DRY_RUN === 'true') {
      logger.warn(`[AHK] DRY_RUN aktif — skip eksekusi nyata: ${action}`);
      writeScriptLog(logStream, 'DRY_RUN', 'skipped');
      logStream.end();
      return resolve({ action, dryRun: true });
    }

    const proc = spawn(ahkExe, args, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        stdout += text + '\n';
        logger.debug(`[AHK][${action}] stdout: ${text}`);
        writeScriptLog(logStream, 'STDOUT', text);
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        stderr += text + '\n';
        logger.warn(`[AHK][${action}] stderr: ${text}`);
        writeScriptLog(logStream, 'STDERR', text);
      }
    });

    proc.on('error', (err) => {
      logger.error(`[AHK] Gagal spawn proses: ${err.message}`);
      writeScriptLog(logStream, 'ERROR', err.message);
      logStream.end();
      reject(err);
    });

    proc.on('close', (code) => {
      const status = code === 0 ? 'OK' : `EXIT_${code}`;
      logger.info(`[AHK] Selesai: ${action} (${status})`);
      writeScriptLog(logStream, 'END', `exit_code=${code}`);
      logStream.end();

      if (code !== 0) {
        reject(new Error(`Script AHK "${action}" keluar dengan kode ${code}\n${stderr}`));
      } else {
        resolve({ action, exitCode: code, stdout, stderr });
      }
    });
  });
}

// ─────────────────────────────────────────────
// Info: daftar action yang tersedia
// ─────────────────────────────────────────────
function getAvailableActions() {
  const result = [];

  for (const [action, relPath] of Object.entries(ACTION_REGISTRY)) {
    const absPath = path.join(AHK_ROOT, relPath);
    result.push({
      action,
      path:   relPath,
      exists: fs.existsSync(absPath),
    });
  }

  // Scan games/ untuk script yang tidak terdaftar di registry
  const gamesDir = path.join(AHK_ROOT, 'games');
  if (fs.existsSync(gamesDir)) {
    for (const group of fs.readdirSync(gamesDir)) {
      const groupDir = path.join(gamesDir, group);
      if (!fs.statSync(groupDir).isDirectory()) continue;
      for (const file of fs.readdirSync(groupDir)) {
        if (!file.endsWith('.ahk')) continue;
        const action = file.replace('.ahk', '');
        if (!ACTION_REGISTRY[action]) {
          result.push({
            action,
            path:      `games/${group}/${file}`,
            exists:    true,
            untracked: true,
          });
        }
      }
    }
  }

  return result;
}

module.exports = {
  name: 'ahk',
  execute,
  getAvailableActions,
  resolveScriptPath,
  AHK_ROOT,
};
