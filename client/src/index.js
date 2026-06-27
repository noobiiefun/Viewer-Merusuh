'use strict';

/**
 * Viewer Merusuh — CLIENT v0.5.0
 * Entry point utama
 */

require('dotenv').config();

const logger         = require('./utils/logger');
const adapterManager = require('./core/adapterManager');
const connection     = require('./core/connection');
const dashboard      = require('./core/dashboard');

// Adapters
const ahkAdapter    = require('./adapters/ahk');
const vjoyAdapter   = require('./adapters/vjoy');
const pluginAdapter = require('./adapters/plugin');

async function main() {
  logger.info('═══════════════════════════════════════');
  logger.info('  Viewer Merusuh CLIENT  v0.5.0        ');
  logger.info('═══════════════════════════════════════');

  // Daftarkan adapter
  if (process.env.ADAPTER_AHK    !== 'false') adapterManager.register('ahk',    ahkAdapter);
  if (process.env.ADAPTER_VJOY   === 'true')  adapterManager.register('vjoy',   vjoyAdapter);
  if (process.env.ADAPTER_PLUGIN === 'true')  adapterManager.register('plugin', pluginAdapter);

  // Init adapter
  await adapterManager.initAll();

  // Web Dashboard
  if (process.env.DASHBOARD_ENABLED !== 'false') {
    try {
      await dashboard.init(adapterManager, connection);
    } catch (err) {
      logger.warn('[Main] Dashboard gagal start (tidak fatal):', err.message);
    }
  }

  // Koneksi ke server
  connection.start(adapterManager);

  const shutdown = async (signal) => {
    logger.info(`\n[Main] ${signal} — shutting down...`);
    connection.stop();
    await adapterManager.destroyAll();
    await dashboard.destroy();
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(err => {
  logger.error('[Main] Fatal error:', err);
  process.exit(1);
});
