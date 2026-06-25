/**
 * RC Module — Simulator Adapter
 * 
 * Mensimulasikan RC tanpa hardware nyata.
 * Berguna untuk development dan testing.
 * 
 * Menerima perintah kontrol → log ke console → emit state update
 * 
 * Phase: 2 (simulator)
 */

const { EventEmitter } = require('events');

class RcSimulator extends EventEmitter {
  constructor(rc_id, name) {
    super();
    this.rc_id = rc_id;
    this.name = name || `Simulator-${rc_id}`;
    this.connected = false;

    // State fisika sederhana
    this.state = {
      x: 0,           // posisi X (cm)
      y: 0,           // posisi Y (cm)
      heading: 0,     // arah (derajat, 0 = utara)
      speed: 0,       // kecepatan saat ini (0-100)
      battery: 100,   // level baterai (%)
    };

    this._drainInterval = null;
  }

  /**
   * "Konek" ke simulator
   * @returns {Promise<boolean>}
   */
  async connect() {
    this.connected = true;

    // Simulasi drain baterai perlahan
    this._drainInterval = setInterval(() => {
      this.state.battery = Math.max(0, this.state.battery - 0.1);
      this.emit('battery_update', {
        rc_id: this.rc_id,
        battery_pct: Math.round(this.state.battery),
      });

      if (this.state.battery <= 0) {
        this.emit('battery_dead', { rc_id: this.rc_id });
        this.disconnect();
      }
    }, 10000); // drain setiap 10 detik

    console.log(`[Simulator] ${this.name} terhubung (simulasi)`);
    this.emit('connected', { rc_id: this.rc_id });
    return true;
  }

  /**
   * Disconnect simulator
   */
  disconnect() {
    this.connected = false;
    if (this._drainInterval) clearInterval(this._drainInterval);
    console.log(`[Simulator] ${this.name} disconnect`);
    this.emit('disconnected', { rc_id: this.rc_id });
  }

  /**
   * Kirim perintah kontrol ke simulator
   * 
   * @param {Object} command
   * @param {number} [command.forward]  -1.0 s/d 1.0 (- = mundur)
   * @param {number} [command.turn]     -1.0 s/d 1.0 (- = kiri)
   * @param {boolean} [command.brake]
   * @param {number} [command.throttle] 0.0 s/d 1.0 (khusus drone)
   * @param {number} [command.pitch]    drone pitch
   * @param {number} [command.yaw]      drone yaw
   */
  sendCommand(command) {
    if (!this.connected) {
      console.warn(`[Simulator] ${this.name} belum terhubung`);
      return false;
    }

    const { forward = 0, turn = 0, brake = false, throttle, pitch, yaw } = command;

    // Update state sederhana
    if (brake) {
      this.state.speed = 0;
    } else {
      this.state.speed = Math.max(-100, Math.min(100, forward * 100));
    }

    // Update heading
    this.state.heading = (this.state.heading + turn * 5 + 360) % 360;

    // Update posisi berdasarkan kecepatan dan heading
    const rad = (this.state.heading * Math.PI) / 180;
    this.state.x += this.state.speed * 0.01 * Math.sin(rad);
    this.state.y += this.state.speed * 0.01 * Math.cos(rad);

    // Log singkat
    const dir = forward > 0.1 ? '▲' : forward < -0.1 ? '▼' : '■';
    const turnDir = turn > 0.1 ? '►' : turn < -0.1 ? '◄' : '';
    console.log(
      `[Simulator] ${this.name} ${dir}${turnDir} speed=${this.state.speed.toFixed(0)}% ` +
      `pos=(${this.state.x.toFixed(1)}, ${this.state.y.toFixed(1)}) heading=${this.state.heading.toFixed(0)}°`
    );

    // Emit state update (untuk web controller nampilkan posisi di simulator)
    this.emit('state_update', {
      rc_id: this.rc_id,
      state: { ...this.state },
    });

    return true;
  }

  /**
   * Ambil state RC saat ini
   * @returns {Object}
   */
  getState() {
    return {
      rc_id: this.rc_id,
      connected: this.connected,
      ...this.state,
    };
  }

  /**
   * Reset posisi ke origin
   */
  reset() {
    this.state = { x: 0, y: 0, heading: 0, speed: 0, battery: this.state.battery };
    this.emit('state_update', { rc_id: this.rc_id, state: { ...this.state } });
    console.log(`[Simulator] ${this.name} di-reset ke posisi awal`);
  }
}

/**
 * Registry simulator aktif
 * Key: rc_id, Value: RcSimulator instance
 */
const simulators = new Map();

/**
 * Buat atau ambil simulator untuk RC tertentu
 * @param {string} rc_id
 * @param {string} name
 * @returns {RcSimulator}
 */
function getSimulator(rc_id, name) {
  if (!simulators.has(rc_id)) {
    simulators.set(rc_id, new RcSimulator(rc_id, name));
  }
  return simulators.get(rc_id);
}

module.exports = {
  RcSimulator,
  getSimulator,
  simulators,
};
