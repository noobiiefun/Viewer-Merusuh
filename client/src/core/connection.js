/**
 * core/connection.js
 * Mengelola koneksi Socket.IO ke server Viewer Merusuh.
 *
 * Fitur:
 *  - Auto-reconnect dengan exponential backoff
 *  - Autentikasi via CLIENT_SECRET
 *  - Meneruskan event 'effect' ke AdapterManager
 *  - Heartbeat log setiap 60 detik (debug)
 */

'use strict';

const { io }    = require('socket.io-client');
const logger    = require('../utils/logger');
const { config } = require('../utils/config');

const LABEL = 'Connection';

class Connection {
  constructor(adapterManager) {
    this.adapterManager = adapterManager;
    this.socket = null;
    this._heartbeatTimer = null;
  }

  connect() {
    const url = config.serverUrl;
    logger.info(LABEL, `Menghubungkan ke server: ${url}`);

    this.socket = io(url, {
      // Kirim secret sebagai auth payload — diterima server di handshake
      auth: {
        secret: config.clientSecret,
        clientName: config.clientName,
        role: 'game-client',
      },
      // Reconnect otomatis
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      // Timeout koneksi awal
      timeout: 10000,
    });

    this._bindEvents();
  }

  _bindEvents() {
    const s = this.socket;

    // ── Lifecycle ─────────────────────────────────────────────
    s.on('connect', () => {
      logger.success(LABEL, `✅  Terhubung ke server (socket id: ${s.id})`);
      this._startHeartbeat();
    });

    s.on('disconnect', (reason) => {
      logger.warn(LABEL, `⚠️  Terputus dari server. Alasan: ${reason}`);
      this._stopHeartbeat();
    });

    s.on('connect_error', (err) => {
      logger.error(LABEL, `Gagal konek: ${err.message}`);
    });

    s.on('reconnect', (attempt) => {
      logger.success(LABEL, `🔄  Berhasil reconnect setelah ${attempt} percobaan`);
    });

    s.on('reconnect_attempt', (attempt) => {
      logger.info(LABEL, `Mencoba reconnect... (percobaan ke-${attempt})`);
    });

    // ── Auth error dari server (jika server mengimplementasi guard) ──
    s.on('auth_error', (msg) => {
      logger.error(LABEL, `🔒 Auth ditolak server: ${msg}`);
      logger.error(LABEL, 'Pastikan CLIENT_SECRET di .env sama dengan di server.');
      s.disconnect();
    });

    // ── Event utama: efek dari server ─────────────────────────
    s.on('effect', (payload) => {
      logger.info(LABEL, `📥  Menerima efek: [${payload.adapter}] ${payload.action}`);
      logger.debug(LABEL, 'Payload lengkap:', JSON.stringify(payload));
      this.adapterManager.execute(payload);
    });

    // ── Konfirmasi dari server bahwa client ini dikenali ──────
    s.on('client_registered', (info) => {
      logger.success(LABEL, `🎮  Client terdaftar di server sebagai "${info.name}"`);
    });
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      logger.debug(LABEL, `Heartbeat — socket: ${this.socket?.id || 'N/A'}`);
    }, 60_000);
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  disconnect() {
    this._stopHeartbeat();
    this.socket?.disconnect();
  }
}

module.exports = Connection;
