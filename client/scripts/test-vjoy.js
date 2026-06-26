#!/usr/bin/env node
'use strict';

/**
 * Test mode CLI untuk vJoy Adapter
 *
 * Usage:
 *   node scripts/test-vjoy.js <action> [paramsJSON]
 *
 * Contoh:
 *   node scripts/test-vjoy.js press_button '{"button":"CROSS","duration_ms":300}'
 *   node scripts/test-vjoy.js spam_button '{"button":"TRIANGLE","count":5}'
 *   node scripts/test-vjoy.js tilt_left_stick '{"x":0,"y":1,"duration_ms":2000}'
 *   node scripts/test-vjoy.js chaos_input '{"duration_ms":3000}'
 *   node scripts/test-vjoy.js full_release
 */

const path = require('path');
// Pastikan config bisa di-load dari root project
process.chdir(path.resolve(__dirname, '..'));

require('dotenv').config();
const vjoyAdapter = require('../src/adapters/vjoy');
const logger      = require('../src/utils/logger');

const [,, action, rawParams] = process.argv;

if (!action) {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║         vJoy Adapter — Test CLI                   ║
  ╚═══════════════════════════════════════════════════╝

  Usage: node scripts/test-vjoy.js <action> [paramsJSON]

  Actions tersedia:
    press_button     { button, duration_ms }
    hold_button      { button, duration_ms }
    spam_button      { button, count, interval_ms }
    tilt_left_stick  { x, y, duration_ms }
    tilt_right_stick { x, y, duration_ms }
    spin_left_stick  { duration_ms, radius }
    press_trigger    { side, value, duration_ms }
    spam_trigger     { side, count, interval_ms }
    chaos_input      { duration_ms }
    full_release

  Nama tombol (button):
    CROSS CIRCLE SQUARE TRIANGLE
    L1 R1 L2 R2 L3 R3
    DPAD_UP DPAD_DOWN DPAD_LEFT DPAD_RIGHT
    OPTIONS SHARE PS

  Alias: X=CROSS O=CIRCLE A=CROSS B=CIRCLE
         UP DOWN LEFT RIGHT START SELECT

  Contoh:
    node scripts/test-vjoy.js press_button '{"button":"CROSS"}'
    node scripts/test-vjoy.js spam_button '{"button":"R1","count":10,"interval_ms":100}'
    node scripts/test-vjoy.js chaos_input '{"duration_ms":5000}'
  `);
  process.exit(0);
}

let params = {};
if (rawParams) {
  try {
    params = JSON.parse(rawParams);
  } catch {
    logger.error('params JSON tidak valid:', rawParams);
    process.exit(1);
  }
}

(async () => {
  logger.info(`[Test] Menjalankan action: ${action}`);
  logger.info(`[Test] Params: ${JSON.stringify(params)}`);
  await vjoyAdapter.test(action, params);
  logger.info('[Test] Selesai.');
  process.exit(0);
})();
