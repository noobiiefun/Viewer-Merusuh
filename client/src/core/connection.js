'use strict';

/**
 * connection.js
 * Koneksi Socket.IO ke server dengan:
 *   - Auto-reconnect (exponential backoff)
 *   - Auth handshake (clientSecret + clientName)
 *   - Emit event ke dashboard via eventBus
 */

const { io }   = require('socket.io-client');
const logger   = require('../utils/logger');
const bus      = require('./eventBus');

let socket = null;

function start(adapterManager) {
  const SERVER_URL    = process.env.SERVER_URL    || 'http://localhost:3000';
  const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
  const CLIENT_NAME   = process.env.CLIENT_NAME   || 'GamePC';

  logger.info(`[Connection] Menghubungkan ke ${SERVER_URL} ...`);

  socket = io(SERVER_URL, {
    auth: {
      secret:     CLIENT_SECRET,
      clientName: CLIENT_NAME,
      role:       'game-client',
    },
    reconnection:        true,
    reconnectionDelay:   1000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    logger.info(`[Connection] ✓ Terhubung ke server (id: ${socket.id})`);
    bus.emit('conn:status', { status: 'connected', serverUrl: SERVER_URL, since: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    logger.warn(`[Connection] Terputus: ${reason}`);
    bus.emit('conn:status', { status: 'disconnected', serverUrl: SERVER_URL });
  });

  socket.on('reconnect_attempt', (n) => {
    logger.info(`[Connection] Mencoba reconnect (#${n})...`);
    bus.emit('conn:status', { status: 'reconnecting', serverUrl: SERVER_URL });
  });

  socket.on('reconnect', () => {
    logger.info('[Connection] Berhasil reconnect!');
    bus.emit('conn:status', { status: 'connected', serverUrl: SERVER_URL, since: Date.now() });
  });

  socket.on('auth_error', (msg) => {
    logger.error(`[Connection] Auth gagal: ${msg || 'CLIENT_SECRET salah?'}`);
    bus.emit('log', { level: 'error', message: `Auth gagal: ${msg || 'Cek CLIENT_SECRET di .env'}` });
    socket.disconnect();
  });

  socket.on('effect', (payload) => {
    logger.info(`[Connection] Efek masuk: [${payload.adapter}] ${payload.action}`);
    // Forward ke dashboard
    bus.emit('effect', payload);
    // Eksekusi
    adapterManager.execute(payload).catch(err => {
      logger.error('[Connection] Error eksekusi efek:', err.message);
    });
  });

  // Teruskan log ke dashboard
  bus.on('log', (entry) => {
    // Log sudah ditangani logger, ini hanya untuk SSE ke UI
  });
}

function stop() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

module.exports = { start, stop };
