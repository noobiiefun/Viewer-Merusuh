/**
 * src/index.js
 * Entry point utama Viewer Merusuh Client.
 *
 * Alur startup:
 *  1. Load config dari .env
 *  2. Validasi config
 *  3. Init AdapterManager (load adapter yang aktif)
 *  4. Buka koneksi Socket.IO ke server
 *  5. Tunggu dan proses efek
 */

'use strict';

const { validate } = require('./utils/config');
const logger       = require('./utils/logger');
const AdapterManager = require('./core/adapterManager');
const Connection     = require('./core/connection');

const PKG = require('../package.json');

// ── Banner ──────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════╗
║   Viewer Merusuh — CLIENT  v${PKG.version.padEnd(16)}║
║   "Penonton Bayar, Game Kacau."              ║
╚══════════════════════════════════════════════╝
`);

// ── Validasi env ────────────────────────────────────────────────
validate();

// ── Bootstrap ───────────────────────────────────────────────────
async function main() {
  const { config } = require('./utils/config');

  logger.info('Main', `Client Name : ${config.clientName}`);
  logger.info('Main', `Server URL  : ${config.serverUrl}`);
  logger.info('Main', `Log Level   : ${config.logLevel}`);

  // 1. Init adapter manager
  const adapterManager = new AdapterManager();
  await adapterManager.init();

  // 2. Buka koneksi ke server
  const connection = new Connection(adapterManager);
  connection.connect();

  // ── Graceful shutdown ──────────────────────────────────────────
  function shutdown(signal) {
    logger.info('Main', `Menerima ${signal} — menutup koneksi...`);
    connection.disconnect();
    process.exit(0);
  }

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Tangkap uncaught agar client tidak langsung crash
  process.on('uncaughtException', (err) => {
    logger.error('Main', `Uncaught exception: ${err.message}`);
    logger.error('Main', err.stack);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Main', `Unhandled rejection: ${reason}`);
  });
}

main().catch((err) => {
  console.error('❌ Fatal error saat startup:', err);
  process.exit(1);
});
