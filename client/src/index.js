'use strict';

/**
 * Viewer Merusuh — CLIENT
 * Entry point: registrasi adapter aktif, lalu connect ke server
 */

const logger         = require('./utils/logger');
const config         = require('./utils/config');
const adapterManager = require('./core/adapterManager');
const connection     = require('./core/connection');

logger.info('=== Viewer Merusuh Client ===');
logger.info(`Nama   : ${config.CLIENT_NAME}`);
logger.info(`Server : ${config.SERVER_URL}`);

// ── Register adapters ───────────────────────
if (config.ADAPTER_AHK) {
  const ahkAdapter = require('./adapters/ahk');
  adapterManager.register('ahk', ahkAdapter);
  logger.info(`AHK adapter aktif — exe: ${config.AHK_EXE_PATH}`);

  // Log available actions
  const actions = ahkAdapter.getAvailableActions();
  const ready   = actions.filter(a => a.exists);
  const missing = actions.filter(a => !a.exists);
  logger.info(`AHK scripts: ${ready.length} siap, ${missing.length} belum ada`);
  if (missing.length > 0) {
    logger.warn(`Script belum ada: ${missing.map(a => a.action).join(', ')}`);
    logger.warn('Jalankan: npm run sync-scripts  (untuk sync dari server)');
  }
}

if (config.ADAPTER_VJOY) {
  logger.warn('ADAPTER_VJOY=true tapi stub belum diimplementasikan (Step 3)');
}

if (config.ADAPTER_PLUGIN) {
  logger.warn('ADAPTER_PLUGIN=true tapi stub belum diimplementasikan (Step 4)');
}

// ── Koneksi ke server ───────────────────────
connection.connect();

// ── Graceful shutdown ───────────────────────
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  logger.info('Stats: ' + JSON.stringify(adapterManager.getStats(), null, 2));
  connection.disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err?.message || err}`);
});
