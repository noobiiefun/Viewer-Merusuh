'use strict';

/**
 * vJoy / ViGEmBus Adapter
 * Mengontrol virtual gamepad menggunakan ViGEmBus + vigemclient
 *
 * Dependency: npm install vigemclient
 * Requirement: ViGEmBus driver harus terinstall di PC
 *   https://github.com/nefarius/ViGEmBus/releases
 */

const logger = require('../utils/logger');

// Mapping action → fungsi handler
// Setiap handler menerima (client, controller, params)
const ACTION_MAP = {
  // ── Tombol ──────────────────────────────────────────────
  press_button:        handlePressButton,
  hold_button:         handleHoldButton,
  spam_button:         handleSpamButton,

  // ── Stick / Analog ──────────────────────────────────────
  tilt_left_stick:     handleTiltLeftStick,
  tilt_right_stick:    handleTiltRightStick,
  spin_left_stick:     handleSpinLeftStick,

  // ── Trigger ─────────────────────────────────────────────
  press_trigger:       handlePressTrigger,
  spam_trigger:        handleSpamTrigger,

  // ── Combo chaos ─────────────────────────────────────────
  chaos_input:         handleChaosInput,
  full_release:        handleFullRelease,
};

// Nama tombol DS4/Xbox yang didukung vigemclient
const BUTTON_NAMES = [
  'CROSS', 'CIRCLE', 'SQUARE', 'TRIANGLE',
  'L1', 'R1', 'L2', 'R2', 'L3', 'R3',
  'OPTIONS', 'SHARE', 'DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT',
  'PS',
];

// ─── State ─────────────────────────────────────────────────────────────────

let ViGEmClient, ViGEmTarget;
let client  = null;
let target  = null;
let enabled = false;
let initAttempted = false;

// ─── Init / Teardown ───────────────────────────────────────────────────────

async function init() {
  if (initAttempted) return enabled;
  initAttempted = true;

  try {
    ({ ViGEmClient, ViGEmTarget } = require('vigemclient'));
  } catch {
    logger.warn('[vJoy] Package "vigemclient" tidak ditemukan.');
    logger.warn('[vJoy] Jalankan: npm install vigemclient');
    logger.warn('[vJoy] Adapter dinonaktifkan.');
    return false;
  }

  try {
    client = new ViGEmClient();
    client.connect();

    target = client.createDS4Controller();
    target.connect();

    // Reset semua input ke netral
    neutralState();
    target.update();

    enabled = true;
    logger.info('[vJoy] ViGEmBus terhubung. DS4 virtual aktif.');
  } catch (err) {
    logger.error('[vJoy] Gagal konek ke ViGEmBus:', err.message);
    logger.error('[vJoy] Pastikan ViGEmBus driver sudah terinstall.');
    logger.error('[vJoy]   https://github.com/nefarius/ViGEmBus/releases');
    enabled = false;
  }

  return enabled;
}

function destroy() {
  if (target)  { try { target.disconnect();  } catch {} }
  if (client)  { try { client.disconnect();  } catch {} }
  target  = null;
  client  = null;
  enabled = false;
  initAttempted = false;
  logger.info('[vJoy] Adapter dimatikan.');
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Set semua input ke posisi netral */
function neutralState() {
  if (!target) return;
  BUTTON_NAMES.forEach(btn => {
    try { target.button[btn].setValue(false); } catch {}
  });
  try {
    target.axis.LX.setValue(0x80);
    target.axis.LY.setValue(0x80);
    target.axis.RX.setValue(0x80);
    target.axis.RY.setValue(0x80);
    target.axis.LT.setValue(0x00);
    target.axis.RT.setValue(0x00);
  } catch {}
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Konversi -1.0~1.0 ke byte 0x00~0xFF (0x80 = center) */
function axisValue(normalized) {
  return clamp(Math.round((normalized + 1) * 127.5), 0, 255);
}

/** Konversi 0.0~1.0 ke byte 0x00~0xFF untuk trigger */
function triggerValue(normalized) {
  return clamp(Math.round(normalized * 255), 0, 255);
}

function resolveButton(name) {
  const upper = (name || '').toUpperCase();
  if (BUTTON_NAMES.includes(upper)) return upper;
  // alias umum
  const alias = {
    'X': 'CROSS', 'O': 'CIRCLE', 'A': 'CROSS', 'B': 'CIRCLE',
    'UP': 'DPAD_UP', 'DOWN': 'DPAD_DOWN', 'LEFT': 'DPAD_LEFT', 'RIGHT': 'DPAD_RIGHT',
    'START': 'OPTIONS', 'SELECT': 'SHARE',
  };
  return alias[upper] || null;
}

// ─── Action Handlers ───────────────────────────────────────────────────────

/**
 * Tekan satu tombol lalu lepas setelah durasi
 * params: { button, duration_ms }
 */
async function handlePressButton(params) {
  const btn = resolveButton(params.button || 'CROSS');
  const dur = Number(params.duration_ms) || 200;
  if (!btn) { logger.warn(`[vJoy] Tombol tidak dikenal: ${params.button}`); return; }

  logger.debug(`[vJoy] press_button ${btn} selama ${dur}ms`);
  target.button[btn].setValue(true);
  target.update();
  await sleep(dur);
  target.button[btn].setValue(false);
  target.update();
}

/**
 * Tahan tombol selama durasi — mirip press_button tapi semantik berbeda
 * params: { button, duration_ms }
 */
async function handleHoldButton(params) {
  return handlePressButton({ ...params, duration_ms: params.duration_ms || 2000 });
}

/**
 * Spam tombol berkali-kali (toggle cepat)
 * params: { button, count, interval_ms }
 */
async function handleSpamButton(params) {
  const btn   = resolveButton(params.button || 'CROSS');
  const count = Number(params.count) || 10;
  const iv    = Number(params.interval_ms) || 80;
  if (!btn) { logger.warn(`[vJoy] Tombol tidak dikenal: ${params.button}`); return; }

  logger.debug(`[vJoy] spam_button ${btn} x${count} interval ${iv}ms`);
  for (let i = 0; i < count; i++) {
    target.button[btn].setValue(true);
    target.update();
    await sleep(iv / 2);
    target.button[btn].setValue(false);
    target.update();
    await sleep(iv / 2);
  }
}

/**
 * Miringkan left stick ke arah tertentu lalu kembali
 * params: { x, y, duration_ms }  — x/y dalam range -1.0 ~ 1.0
 */
async function handleTiltLeftStick(params) {
  const x   = Number(params.x ?? 0);
  const y   = Number(params.y ?? 1);     // default: maju
  const dur = Number(params.duration_ms) || 1500;

  logger.debug(`[vJoy] tilt_left_stick x=${x} y=${y} dur=${dur}ms`);
  target.axis.LX.setValue(axisValue(x));
  target.axis.LY.setValue(axisValue(y));
  target.update();
  await sleep(dur);
  target.axis.LX.setValue(0x80);
  target.axis.LY.setValue(0x80);
  target.update();
}

/**
 * Miringkan right stick ke arah tertentu lalu kembali
 * params: { x, y, duration_ms }
 */
async function handleTiltRightStick(params) {
  const x   = Number(params.x ?? 1);
  const y   = Number(params.y ?? 0);
  const dur = Number(params.duration_ms) || 1500;

  logger.debug(`[vJoy] tilt_right_stick x=${x} y=${y} dur=${dur}ms`);
  target.axis.RX.setValue(axisValue(x));
  target.axis.RY.setValue(axisValue(y));
  target.update();
  await sleep(dur);
  target.axis.RX.setValue(0x80);
  target.axis.RY.setValue(0x80);
  target.update();
}

/**
 * Putar left stick 360° (circular motion)
 * params: { duration_ms, radius }  — radius 0.0~1.0
 */
async function handleSpinLeftStick(params) {
  const dur    = Number(params.duration_ms) || 3000;
  const radius = Number(params.radius ?? 1.0);
  const steps  = 36;
  const stepMs = dur / steps;

  logger.debug(`[vJoy] spin_left_stick dur=${dur}ms radius=${radius}`);
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    target.axis.LX.setValue(axisValue(Math.cos(angle) * radius));
    target.axis.LY.setValue(axisValue(Math.sin(angle) * radius));
    target.update();
    await sleep(stepMs);
  }
  target.axis.LX.setValue(0x80);
  target.axis.LY.setValue(0x80);
  target.update();
}

/**
 * Tekan trigger (L2/R2) ke nilai tertentu lalu lepas
 * params: { side, value, duration_ms }  — side: 'L'|'R', value 0.0~1.0
 */
async function handlePressTrigger(params) {
  const side = (params.side || 'R').toUpperCase();
  const val  = Number(params.value ?? 1.0);
  const dur  = Number(params.duration_ms) || 500;
  const axis = side === 'L' ? target.axis.LT : target.axis.RT;

  logger.debug(`[vJoy] press_trigger ${side}T val=${val} dur=${dur}ms`);
  axis.setValue(triggerValue(val));
  target.update();
  await sleep(dur);
  axis.setValue(0x00);
  target.update();
}

/**
 * Spam trigger naik-turun
 * params: { side, count, interval_ms }
 */
async function handleSpamTrigger(params) {
  const side  = (params.side || 'R').toUpperCase();
  const count = Number(params.count) || 8;
  const iv    = Number(params.interval_ms) || 100;
  const axis  = side === 'L' ? target.axis.LT : target.axis.RT;

  logger.debug(`[vJoy] spam_trigger ${side}T x${count} interval ${iv}ms`);
  for (let i = 0; i < count; i++) {
    axis.setValue(0xFF);
    target.update();
    await sleep(iv / 2);
    axis.setValue(0x00);
    target.update();
    await sleep(iv / 2);
  }
}

/**
 * Chaos: random button + stick selama durasi
 * params: { duration_ms }
 */
async function handleChaosInput(params) {
  const dur    = Number(params.duration_ms) || 3000;
  const endAt  = Date.now() + dur;
  const chaos  = ['CROSS','CIRCLE','SQUARE','TRIANGLE','L1','R1','DPAD_UP','DPAD_DOWN'];

  logger.debug(`[vJoy] chaos_input selama ${dur}ms`);
  while (Date.now() < endAt) {
    // Random button
    const btn = chaos[Math.floor(Math.random() * chaos.length)];
    target.button[btn].setValue(true);

    // Random stick
    target.axis.LX.setValue(Math.floor(Math.random() * 256));
    target.axis.LY.setValue(Math.floor(Math.random() * 256));
    target.update();
    await sleep(80 + Math.random() * 120);

    target.button[btn].setValue(false);
    target.update();
    await sleep(30);
  }

  neutralState();
  target.update();
}

/**
 * Lepas semua input — reset ke netral
 */
async function handleFullRelease() {
  logger.debug('[vJoy] full_release — reset ke netral');
  neutralState();
  target.update();
}

// ─── Interface Adapter ─────────────────────────────────────────────────────

const vjoyAdapter = {
  name: 'vjoy',

  async init() {
    return init();
  },

  async execute({ action, params = {} }) {
    if (!enabled) {
      logger.warn('[vJoy] Adapter belum aktif. Pastikan ViGEmBus terinstall dan ADAPTER_VJOY=true.');
      return;
    }

    const handler = ACTION_MAP[action];
    if (!handler) {
      logger.warn(`[vJoy] Action tidak dikenal: "${action}"`);
      logger.warn(`[vJoy] Action yang tersedia: ${Object.keys(ACTION_MAP).join(', ')}`);
      return;
    }

    try {
      await handler(params);
      logger.info(`[vJoy] ✓ action "${action}" selesai`);
    } catch (err) {
      logger.error(`[vJoy] Error saat menjalankan "${action}":`, err.message);
      // Safety: reset ke netral supaya gamepad tidak stuck
      try { neutralState(); target.update(); } catch {}
    }
  },

  destroy,

  /** Untuk test mode dari CLI */
  async test(action, params = {}) {
    logger.info(`[vJoy] TEST mode: ${action}`, params);
    if (!enabled) await init();
    if (!enabled) return;
    await this.execute({ action, params });
    await sleep(500);
    destroy();
  },
};

module.exports = vjoyAdapter;
