#!/usr/bin/env node
'use strict';

/**
 * Test mode CLI untuk Plugin Adapter
 *
 * Usage:
 *   node scripts/test-plugin.js [command] [args]
 *
 * Commands:
 *   start              — jalankan HTTP server lokal (default)
 *   send <action>      — kirim efek ke queue lalu poll hasilnya
 *   poll               — poll /api/plugin/pending
 *   status             — cek status server
 *   clear              — kosongkan queue
 *
 * Contoh:
 *   node scripts/test-plugin.js start
 *   node scripts/test-plugin.js send flip_car '{"intensity":1}'
 *   node scripts/test-plugin.js poll
 */

const path = require('path');
process.chdir(path.resolve(__dirname, '..'));
require('dotenv').config();

const pluginAdapter = require('../src/adapters/plugin');
const logger        = require('../src/utils/logger');

const PORT  = parseInt(process.env.PLUGIN_LOCAL_PORT || '3001', 10);
const TOKEN = process.env.PLUGIN_TOKEN || '';

const BASE  = `http://127.0.0.1:${PORT}`;
const HEADERS = {
  'Content-Type': 'application/json',
  ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
};

async function fetchJSON(url, options = {}) {
  const { default: fetch } = await import('node-fetch').catch(() => {
    // node 18+ punya fetch bawaan
    return { default: globalThis.fetch };
  });
  const res = await (fetch || globalThis.fetch)(url, options);
  return res.json();
}

const [,, cmd = 'start', ...rest] = process.argv;

(async () => {
  // ── start ──────────────────────────────────────────────────────────────
  if (cmd === 'start') {
    logger.info('[TestPlugin] Menjalankan Plugin HTTP server...');
    await pluginAdapter.init();
    logger.info('[TestPlugin] Server aktif. Tekan Ctrl+C untuk berhenti.');
    logger.info(`[TestPlugin] Coba:  curl http://127.0.0.1:${PORT}/api/plugin/status`);

    // Demo: kirim beberapa efek ke queue setelah 2 detik
    setTimeout(async () => {
      const demoEffects = [
        { action: 'flip_car',     params: {},                   duration_ms: 3000 },
        { action: 'spawn_cops',   params: { wanted_level: 3 },  duration_ms: 15000 },
        { action: 'change_weather', params: { weather: 'rain' }, duration_ms: 30000 },
      ];

      for (const eff of demoEffects) {
        await pluginAdapter.execute({ ...eff, donation: { username: 'test_viewer', amount: 5000 } });
        await new Promise(r => setTimeout(r, 300));
      }

      logger.info(`[TestPlugin] 3 efek demo dimasukkan ke queue.`);
      logger.info(`[TestPlugin] Poll: curl ${BASE}/api/plugin/pending`);
    }, 2000);

    process.on('SIGINT', async () => {
      await pluginAdapter.destroy();
      process.exit(0);
    });
    return;
  }

  // ── send ───────────────────────────────────────────────────────────────
  if (cmd === 'send') {
    const action = rest[0] || 'test_action';
    let params = {};
    try { params = rest[1] ? JSON.parse(rest[1]) : {}; } catch {}

    logger.info(`[TestPlugin] Menginisialisasi adapter...`);
    await pluginAdapter.init();

    logger.info(`[TestPlugin] Mengirim efek: ${action}`);
    await pluginAdapter.execute({ action, params, duration_ms: 5000, donation: { username: 'test', amount: 1000 } });

    logger.info(`[TestPlugin] Polling efek...`);
    await new Promise(r => setTimeout(r, 500));

    try {
      const data = await fetchJSON(`${BASE}/api/plugin/pending`, { headers: HEADERS });
      logger.info('[TestPlugin] Response pending:', JSON.stringify(data, null, 2));

      if (data.effects && data.effects.length > 0) {
        const eff = data.effects[0];
        logger.info(`[TestPlugin] Simulasi complete untuk: ${eff.id}`);
        await new Promise(r => setTimeout(r, 500));
        const done = await fetchJSON(`${BASE}/api/plugin/complete/${eff.id}`, {
          method:  'POST',
          headers: HEADERS,
        });
        logger.info('[TestPlugin] Complete response:', JSON.stringify(done));
      }
    } catch (err) {
      logger.error('[TestPlugin] Fetch error:', err.message);
    }

    await pluginAdapter.destroy();
    process.exit(0);
    return;
  }

  // ── poll ───────────────────────────────────────────────────────────────
  if (cmd === 'poll') {
    try {
      const data = await fetchJSON(`${BASE}/api/plugin/pending`, { headers: HEADERS });
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      logger.error('Gagal poll (server aktif?):', err.message);
    }
    process.exit(0);
    return;
  }

  // ── status ─────────────────────────────────────────────────────────────
  if (cmd === 'status') {
    try {
      const data = await fetchJSON(`${BASE}/api/plugin/status`, { headers: HEADERS });
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      logger.error('Gagal fetch status (server aktif?):', err.message);
    }
    process.exit(0);
    return;
  }

  // ── clear ──────────────────────────────────────────────────────────────
  if (cmd === 'clear') {
    try {
      const data = await fetchJSON(`${BASE}/api/plugin/clear`, { method: 'POST', headers: HEADERS });
      console.log(JSON.stringify(data, null, 2));
    } catch (err) {
      logger.error('Gagal clear queue:', err.message);
    }
    process.exit(0);
    return;
  }

  console.log(`
  Viewer Merusuh — Plugin Adapter Test CLI

  Usage: node scripts/test-plugin.js [command]

  Commands:
    start              Jalankan HTTP server + masukkan 3 efek demo ke queue
    send <action>      Kirim 1 efek, poll, lalu simulasi complete
    poll               Poll /api/plugin/pending (server harus jalan duluan)
    status             Cek status server
    clear              Kosongkan queue

  Contoh:
    node scripts/test-plugin.js start
    node scripts/test-plugin.js send flip_car
    node scripts/test-plugin.js send spawn_cops '{"wanted_level":3}'
  `);
  process.exit(0);
})();
