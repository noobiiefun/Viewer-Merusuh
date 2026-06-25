/**
 * RC Module — Fleet Manager
 * 
 * Mengelola armada RC/drone:
 * - Daftar semua RC yang terdaftar
 * - Status setiap RC (available, in_use, offline, maintenance)
 * - Ping / health check
 * 
 * Phase 1: In-memory store (tanpa DB)
 * Phase 3: Akan disambungkan ke SQLite
 */

const { EventEmitter } = require('events');

// Status RC yang valid
const RC_STATUS = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  QUEUED: 'queued',       // Ada yang antri, tapi RC sedang available
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
};

// Adapter yang didukung
const ADAPTERS = ['esp32', 'raspi', 'mavlink', 'simulator'];

// Tipe RC
const RC_TYPES = ['car', 'drone', 'boat'];

class FleetManager extends EventEmitter {
  constructor() {
    super();

    /**
     * Map of RC units
     * Key: rc_id
     * Value: RC object
     */
    this.fleet = new Map();
  }

  /**
   * Daftarkan RC baru
   * @param {Object} opts
   * @param {string} opts.name
   * @param {string} opts.type - 'car' | 'drone' | 'boat'
   * @param {string} opts.adapter - 'esp32' | 'raspi' | 'mavlink' | 'simulator'
   * @param {string} [opts.ip_address]
   * @param {number} [opts.ws_port] - default 81
   * @param {string} [opts.cam_url]
   * @returns {Object} RC data
   */
  register(opts) {
    const { name, type, adapter, ip_address, ws_port, cam_url } = opts;

    if (!RC_TYPES.includes(type)) {
      throw new Error(`Tipe RC tidak valid: ${type}. Valid: ${RC_TYPES.join(', ')}`);
    }
    if (!ADAPTERS.includes(adapter)) {
      throw new Error(`Adapter tidak valid: ${adapter}. Valid: ${ADAPTERS.join(', ')}`);
    }

    const rc_id = `rc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const rc = {
      id: rc_id,
      name,
      type,
      adapter,
      ip_address: ip_address || null,
      ws_port: ws_port || 81,
      cam_url: cam_url || null,
      status: adapter === 'simulator' ? RC_STATUS.AVAILABLE : RC_STATUS.OFFLINE,
      battery_pct: 100,
      last_seen: null,
      created_at: new Date().toISOString(),
    };

    this.fleet.set(rc_id, rc);

    this.emit('fleet_update', { rc_id, data: this._sanitize(rc) });
    console.log(`[FleetManager] RC terdaftar: ${name} (${type}/${adapter}) — ID: ${rc_id}`);

    return this._sanitize(rc);
  }

  /**
   * Update data RC
   * @param {string} rc_id
   * @param {Object} updates
   */
  update(rc_id, updates) {
    const rc = this.fleet.get(rc_id);
    if (!rc) throw new Error('RC_NOT_FOUND');

    const allowed = ['name', 'ip_address', 'ws_port', 'cam_url', 'adapter'];
    for (const key of allowed) {
      if (updates[key] !== undefined) rc[key] = updates[key];
    }

    this.emit('fleet_update', { rc_id, data: this._sanitize(rc) });
    return this._sanitize(rc);
  }

  /**
   * Hapus RC dari fleet
   * @param {string} rc_id
   */
  remove(rc_id) {
    const rc = this.fleet.get(rc_id);
    if (!rc) throw new Error('RC_NOT_FOUND');
    if (rc.status === RC_STATUS.IN_USE) throw new Error('RC_IN_USE');

    this.fleet.delete(rc_id);
    this.emit('fleet_update', { rc_id, data: null }); // null = deleted
    console.log(`[FleetManager] RC dihapus: ${rc.name}`);
    return true;
  }

  /**
   * Set status RC
   * @param {string} rc_id
   * @param {string} status
   */
  setStatus(rc_id, status) {
    const rc = this.fleet.get(rc_id);
    if (!rc) return false;

    rc.status = status;
    rc.last_seen = status !== RC_STATUS.OFFLINE ? new Date().toISOString() : rc.last_seen;

    this.emit('rc_status', { rc_id, status });
    return true;
  }

  /**
   * Update level baterai
   * @param {string} rc_id
   * @param {number} battery_pct
   */
  setBattery(rc_id, battery_pct) {
    const rc = this.fleet.get(rc_id);
    if (!rc) return false;
    rc.battery_pct = battery_pct;
    this.emit('battery_update', { rc_id, battery_pct });
    return true;
  }

  /**
   * Ambil RC pertama yang tersedia
   * @param {string} [type] - filter by type
   * @returns {Object|null}
   */
  getAvailable(type = null) {
    for (const [, rc] of this.fleet) {
      if (rc.status === RC_STATUS.AVAILABLE) {
        if (!type || rc.type === type) return this._sanitize(rc);
      }
    }
    return null;
  }

  /**
   * Ambil RC berdasarkan ID
   * @param {string} rc_id
   * @returns {Object|null}
   */
  get(rc_id) {
    const rc = this.fleet.get(rc_id);
    return rc ? this._sanitize(rc) : null;
  }

  /**
   * Ambil semua RC
   * @returns {Array}
   */
  getAll() {
    return Array.from(this.fleet.values()).map(rc => this._sanitize(rc));
  }

  /**
   * Hapus field internal dari RC object
   * @private
   */
  _sanitize(rc) {
    return { ...rc };
  }

  /**
   * Seed beberapa RC simulator untuk development
   */
  seedSimulators() {
    this.register({
      name: 'RC Simulator #1 🔴',
      type: 'car',
      adapter: 'simulator',
    });
    this.register({
      name: 'RC Simulator #2 🔵',
      type: 'car',
      adapter: 'simulator',
    });
    this.register({
      name: 'Drone Simulator 🚁',
      type: 'drone',
      adapter: 'simulator',
    });
    console.log('[FleetManager] 3 RC simulator sudah di-seed untuk development');
  }
}

module.exports = new FleetManager();
module.exports.RC_STATUS = RC_STATUS;
