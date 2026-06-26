'use strict';

/**
 * Viewer Merusuh — CLIENT
 * Entry point utama
 */

require('dotenv').config();

const logger         = require('./utils/logger');
const config         = require('./utils/config');
const connection     = require('./core/connection');
const adapterManager = require('./core/adapterManager');

// ── Adapters ────────────────────────────────────────────
const ahkAdapter    = require('./adapters/ahk');
const vjoyAdapter   = require('./adapters/vjoy');
const pluginAdapter = require('./adapters/plugin');

async function main() {
  logger.info('═══════════════════════════════════════');
  logger.info('  Viewer Merusuh CLIENT  starting up   ');
  logger.info('═══════════════════════════════════════');

  if (config.ADAPTER_AHK)    adapterManager.register('ahk',    ahkAdapter);
  if (config.ADAPTER_VJOY)   adapterManager.register('vjoy',   vjoyAdapter);
  if (config.ADAPTER_PLUGIN) adapterManager.register('plugin', pluginAdapter);

  await adapterManager.initAll();
  connection.start(adapterManager);

  const shutdown = async (signal) => {
    logger.info(`\n[Main] Menerima ${signal} — shutting down...`);
    connection.stop();
    await adapterManager.destroyAll();
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(err => {
  logger.error('[Main] Fatal error:', err);
  process.exit(1);
});
