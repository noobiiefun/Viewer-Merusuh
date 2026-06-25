/**
 * RC Module — ESP32 RC Adapter
 * 
 * Adapter untuk mengontrol RC yang menggunakan ESP32 sebagai controller.
 * ESP32 berjalan WebSocket server di port 81 dan menerima perintah JSON.
 * 
 * ⏳ Phase 3 — Belum implementasi penuh.
 *    Saat ini hanya skeleton dengan interface yang sudah benar.
 *    Isi implementasi WebSocket saat hardware sudah siap.
 * 
 * Protokol komunikasi:
 * - Server → ESP32: JSON via WebSocket
 * - ESP32 → Server: JSON (status, battery, dll)
 * 
 * Format perintah yang dikirim ke ESP32:
 * { "cmd": "move", "f": 0.8, "t": -0.3 }
 * { "cmd": "stop" }
 * { "cmd": "ping" }
 */

const { EventEmitter } = require('events');

// TODO Phase 3: uncomment saat install ws library
// const WebSocket = require('ws');

class RcEsp32Adapter extends EventEmitter {
  /**
   * @param {Object} config
   * @param {string} config.rc_id
   * @param {string} config.name
   * @param {string} config.ip_address - IP ESP32 di jaringan WiFi
   * @param {number} [config.ws_port] - default 81
   * @param {number} [config.command_interval_ms] - throttle perintah, default 100ms
   */
  constructor(config) {
    super();
    this.rc_id = config.rc_id;
    this.name = config.name;
    this.ip = config.ip_address;
    this.port = config.ws_port || 81;
    this.commandIntervalMs = config.command_interval_ms || 100;

    this.ws = null;
    this.connected = false;
    this._lastCommandTime = 0;
    this._reconnectTimer = null;
    this._pingInterval = null;
  }

  /**
   * Konek ke ESP32 via WebSocket
   * @returns {Promise<boolean>}
   */
  async connect() {
    // TODO Phase 3: implementasi koneksi WebSocket ke ESP32
    // Contoh implementasi:
    //
    // return new Promise((resolve, reject) => {
    //   const url = `ws://${this.ip}:${this.port}`;
    //   this.ws = new WebSocket(url);
    //
    //   this.ws.on('open', () => {
    //     this.connected = true;
    //     console.log(`[ESP32] ${this.name} terhubung: ${url}`);
    //     this._startPing();
    //     this.emit('connected', { rc_id: this.rc_id });
    //     resolve(true);
    //   });
    //
    //   this.ws.on('message', (data) => {
    //     this._handleMessage(JSON.parse(data));
    //   });
    //
    //   this.ws.on('close', () => {
    //     this.connected = false;
    //     this.emit('disconnected', { rc_id: this.rc_id });
    //     this._scheduleReconnect();
    //   });
    //
    //   this.ws.on('error', (err) => {
    //     console.error(`[ESP32] ${this.name} error:`, err.message);
    //     reject(err);
    //   });
    // });

    console.warn(`[ESP32] ${this.name} — Adapter belum diimplementasi (Phase 3)`);
    console.warn(`[ESP32] Target IP: ${this.ip}:${this.port}`);
    return false;
  }

  /**
   * Disconnect dari ESP32
   */
  disconnect() {
    if (this._pingInterval) clearInterval(this._pingInterval);
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);

    // TODO Phase 3:
    // if (this.ws) this.ws.close();

    this.connected = false;
    console.log(`[ESP32] ${this.name} disconnect`);
  }

  /**
   * Kirim perintah kontrol ke ESP32
   * @param {Object} command
   * @returns {boolean}
   */
  sendCommand(command) {
    if (!this.connected) {
      console.warn(`[ESP32] ${this.name} belum terhubung`);
      return false;
    }

    // Throttle perintah (jangan terlalu sering)
    const now = Date.now();
    if (now - this._lastCommandTime < this.commandIntervalMs) {
      return false;
    }
    this._lastCommandTime = now;

    const payload = this._buildPayload(command);

    // TODO Phase 3:
    // this.ws.send(JSON.stringify(payload));

    console.log(`[ESP32] ${this.name} → perintah:`, JSON.stringify(payload));
    return true;
  }

  /**
   * Konversi command object ke format yang dipahami ESP32
   * @private
   */
  _buildPayload(command) {
    const { forward = 0, turn = 0, brake = false } = command;

    if (brake) {
      return { cmd: 'stop' };
    }

    return {
      cmd: 'move',
      f: Math.max(-1, Math.min(1, forward)),   // forward/reverse
      t: Math.max(-1, Math.min(1, turn)),       // turn
    };
  }

  /**
   * Handle pesan dari ESP32
   * @private
   */
  _handleMessage(msg) {
    // TODO Phase 3: handle berbagai tipe pesan dari ESP32
    // Contoh pesan yang mungkin dikirim ESP32:
    // { "type": "pong" }
    // { "type": "battery", "pct": 87 }
    // { "type": "status", "speed": 0.8, "direction": "forward" }

    if (msg.type === 'battery') {
      this.emit('battery_update', { rc_id: this.rc_id, battery_pct: msg.pct });
    } else if (msg.type === 'pong') {
      // Connection alive
    }
  }

  /**
   * Ping ESP32 secara periodik untuk cek koneksi
   * @private
   */
  _startPing() {
    this._pingInterval = setInterval(() => {
      // TODO Phase 3:
      // if (this.ws && this.connected) {
      //   this.ws.send(JSON.stringify({ cmd: 'ping' }));
      // }
    }, 5000);
  }

  /**
   * Jadwalkan reconnect setelah koneksi putus
   * @private
   */
  _scheduleReconnect() {
    this._reconnectTimer = setTimeout(() => {
      console.log(`[ESP32] ${this.name} mencoba reconnect...`);
      this.connect().catch(() => {});
    }, 3000);
  }
}

/**
 * Registry adapter ESP32 aktif
 * Key: rc_id, Value: RcEsp32Adapter instance
 */
const adapters = new Map();

/**
 * Buat atau ambil adapter untuk RC tertentu
 * @param {string} rc_id
 * @param {Object} config
 * @returns {RcEsp32Adapter}
 */
function getAdapter(rc_id, config) {
  if (!adapters.has(rc_id)) {
    adapters.set(rc_id, new RcEsp32Adapter({ rc_id, ...config }));
  }
  return adapters.get(rc_id);
}

module.exports = {
  RcEsp32Adapter,
  getAdapter,
  adapters,
};
