'use strict';

/**
 * connection.js — v0.5.1 (patch: emit conn:status lengkap ke eventBus)
 *
 * Perubahan dari v0.5.0:
 *  - Emit conn:status ke eventBus dengan field: socketId, reconnects, effectCount, connectedAt
 *  - Export getState() untuk /api/state di dashboard
 *  - Export reconnect() untuk /api/reconnect di dashboard
 */

const { io }    = require('socket.io-client');
const logger    = require('../utils/logger');
const config    = require('../utils/config');
const adapterManager = require('./adapterManager');
const eventBus  = require('./eventBus');

let socket      = null;
let reconnectN  = 0;
let effectCount = 0;
let connectedAt = null;

// ─── Emit status ke eventBus (→ SSE dashboard) ────────────────────────────

function emitStatus(extra = {}) {
  eventBus.emit('conn:status', {
    status:      socket?.connected ? 'connected' : 'disconnected',
    socketId:    socket?.id || null,
    serverUrl:   config.SERVER_URL,
    reconnects:  reconnectN,
    effectCount: effectCount,
    connectedAt: connectedAt?.toISOString() || null,
    ...extra,
  });
}

// ─── connect() ────────────────────────────────────────────────────────────

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
    reconnection:         true,
    reconnectionAttempts: Infinity,
    reconnectionDelay:    1000,
    reconnectionDelayMax: 30000,
    randomizationFactor:  0.3,
  });

  socket.on('connect', () => {
    reconnectN  = 0;
    connectedAt = new Date();
    logger.info(`[Connection] ✓ Terhubung ke server (id: ${socket.id})`);
    emitStatus({ status: 'connected' });
    eventBus.emit('log', { level: 'info', message: `Terhubung ke ${serverUrl} (${socket.id})` });
  });

  socket.on('disconnect', (reason) => {
    logger.warn(`[Connection] Terputus: ${reason}`);
    connectedAt = null;
    emitStatus({ status: 'disconnected' });
    eventBus.emit('log', { level: 'warn', message: `Terputus: ${reason}` });
  });

  socket.on('reconnect_attempt', (n) => {
    reconnectN = n;
    logger.info(`[Connection] Mencoba reconnect ke-${n}...`);
    emitStatus({ status: 'reconnecting' });
  });

  socket.on('reconnect', () => {
    connectedAt = new Date();
    logger.info(`[Connection] ✓ Berhasil reconnect setelah ${reconnectN} percobaan`);
    emitStatus({ status: 'connected' });
    eventBus.emit('log', { level: 'info', message: `Reconnect berhasil setelah ${reconnectN} percobaan` });
  });

  socket.on('reconnect_failed', () => {
    logger.error('[Connection] Reconnect gagal total.');
    emitStatus({ status: 'disconnected' });
  });

  socket.on('auth_error', (msg) => {
    logger.error(`[Connection] Auth gagal: ${msg}. Cek CLIENT_SECRET.`);
    eventBus.emit('log', { level: 'error', message: `Auth error: ${msg}` });
    socket.disconnect();
  });

  socket.on('effect', (payload) => {
    effectCount++;
    eventBus.emit('effect', payload);
    adapterManager.execute(payload).catch((err) => {
      logger.error(`[Connection] Error execute effect: ${err.message}`);
      eventBus.emit('log', { level: 'error', message: `Effect error: ${err.message}` });
    });
  });

  return socket;
}

// ─── disconnect() ─────────────────────────────────────────────────────────

function disconnect() {
  if (socket) {
    socket.disconnect();
    logger.info('[Connection] Koneksi diputus manual');
    eventBus.emit('log', { level: 'warn', message: 'Koneksi diputus dari dashboard' });
  }
}

// ─── reconnect() — dipanggil dari /api/reconnect ──────────────────────────

function reconnect() {
  if (socket) {
    socket.disconnect();
    setTimeout(() => {
      if (socket) {
        socket.connect();
        logger.info('[Connection] Reconnect dipicu dari dashboard');
        emitStatus({ status: 'reconnecting' });
      }
    }, 500);
  } else {
    connect();
  }
}

// ─── getState() — untuk /api/state ───────────────────────────────────────

function getState() {
  return {
    status:      socket?.connected ? 'connected' : 'disconnected',
    socketId:    socket?.id || null,
    serverUrl:   config.SERVER_URL,
    reconnects:  reconnectN,
    effectCount: effectCount,
    connectedAt: connectedAt?.toISOString() || null,
    since:       connectedAt ? connectedAt.getTime() : null,
  };
}

function getSocket()      { return socket; }
function getEffectCount() { return effectCount; }

module.exports = { connect, disconnect, reconnect, getSocket, getState, getEffectCount };
