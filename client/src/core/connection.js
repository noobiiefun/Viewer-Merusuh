'use strict';

/**
 * connection.js — Koneksi Socket.IO ke server Viewer Merusuh
 * Step 2: tidak ada perubahan dari Step 1 kecuali minor logging improvement
 */

const { io }    = require('socket.io-client');
const logger    = require('../utils/logger');
const config    = require('../utils/config');
const adapterManager = require('./adapterManager');

let socket     = null;
let reconnectN = 0;

function connect() {
  const serverUrl = config.SERVER_URL;
  if (!serverUrl) {
    logger.error('[Connection] SERVER_URL tidak dikonfigurasi di .env');
    process.exit(1);
  }

  logger.info(`[Connection] Menghubungkan ke server: ${serverUrl}`);

  socket = io(serverUrl, {
    auth: {
      secret:     config.CLIENT_SECRET || '',
      clientName: config.CLIENT_NAME   || 'GamePC',
      role:       'game-client',
    },
    reconnection:        true,
    reconnectionAttempts: Infinity,
    reconnectionDelay:   1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.3,
  });

  // ── Event handlers ─────────────────────────

  socket.on('connect', () => {
    reconnectN = 0;
    logger.info(`[Connection] ✓ Terhubung ke server (id: ${socket.id})`);
  });

  socket.on('disconnect', (reason) => {
    logger.warn(`[Connection] Terputus: ${reason}`);
  });

  socket.on('reconnect_attempt', (n) => {
    reconnectN = n;
    logger.info(`[Connection] Mencoba reconnect ke-${n}...`);
  });

  socket.on('reconnect', () => {
    logger.info(`[Connection] ✓ Berhasil reconnect setelah ${reconnectN} percobaan`);
  });

  socket.on('reconnect_failed', () => {
    logger.error('[Connection] Reconnect gagal total. Cek SERVER_URL dan jaringan.');
  });

  socket.on('auth_error', (msg) => {
    logger.error(`[Connection] Auth gagal: ${msg}. Cek CLIENT_SECRET.`);
    socket.disconnect();
  });

  // ── Terima efek dari server ─────────────────
  socket.on('effect', (payload) => {
    adapterManager.execute(payload).catch((err) => {
      logger.error(`[Connection] Error execute effect: ${err.message}`);
    });
  });

  return socket;
}

function disconnect() {
  if (socket) socket.disconnect();
}

function getSocket() {
  return socket;
}

module.exports = { connect, disconnect, getSocket };
