/**
 * RC Module — Fleet Manager (with persistence)
 * 
 * Mengelola armada RC/drone, sekarang dengan SQLite persistence.
 * 
 * Perubahan dari versi sebelumnya (in-memory only):
 * - register/update/remove sekarang menulis ke DB juga
 * - saat server start, fleet di-load dari DB ke in-memory cache
 * - in-memory Map tetap dipakai untuk akses cepat (hot path),
 *   DB hanya sumber kebenaran untuk persistence
 * 
 * Kenapa hybrid begini (bukan query DB tiap kali)?
 * Karena status RC berubah sangat sering (tiap detik saat ada sesi aktif via
 * battery drain, dll), query SQLite tiap saat itu boros. Jadi: baca dari
 * memory, tulis ke DB hanya saat ada perubahan signifikan (status, battery, dll).
 */

const { EventEmitter } = require('events');
const { getDB } = require('../api/db/database');

// Status RC yang valid
const RC_STATUS = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  QUEUED: 'queued',
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
     * In-memory cache untuk akses cepat
     * Key: rc_id
     * Value: RC object
     */
    this.fleet = new Map();

    this._dbReady = false;
  }

  /**
   * Load fleet dari database ke memory.
   * WAJIB dipanggil sekali saat server start, sebelum endpoint apapun dipakai.
   */
  loadFromDB() {
    const db = getDB();
    const rows = db.prepare(`SELECT * FROM fleet`).all();

    this.fleet.clear();
    for (const row of rows) {
      // RC yang pakai adapter hardware (bukan simulator) di-reset ke OFFLINE
      // setiap restart server, karena koneksi WebSocket sebelumnya sudah putus.
      // RC simulator boleh langsung AVAILABLE karena tidak butuh koneksi fisik.
      const status = row.adapter === 'simulator' ? RC_STATUS.AVAILABLE : RC_STATUS.OFFLINE;
      this.fleet.set(row.id, { ...row, status });
    }

    this._dbReady = true;
    console.log(`[FleetManager] ${rows.length} RC dimuat dari database`);
  }

  /**
   * Daftarkan RC baru — tersimpan permanen di DB
   * @param {Object} opts
   * @returns {Object} RC data
   */
  register(opts) {
    const { name, type, adapter, ip_address, ws_port, cam_url } = opts;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Nama RC wajib diisi');
    }
    if (!RC_TYPES.includes(type)) {
      throw new Error(`Tipe RC tidak valid: ${type}. Valid: ${RC_TYPES.join(', ')}`);
    }
    if (!ADAPTERS.includes(adapter)) {
      throw new Error(`Adapter tidak valid: ${adapter}. Valid: ${ADAPTERS.join(', ')}`);
    }
    if (adapter !== 'simulator' && !ip_address) {
      throw new Error('ip_address wajib diisi untuk adapter selain simulator');
    }

    const rc_id = `rc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const status = adapter === 'simulator' ? RC_STATUS.AVAILABLE : RC_STATUS.OFFLINE;
    const created_at = new Date().toISOString();

    const rc = {
      id: rc_id,
      name: name.trim(),
      type,
      adapter,
      ip_address: ip_address || null,
      ws_port: ws_port || 81,
      cam_url: cam_url || null,
      status,
      battery_pct: 100,
      last_seen: null,
      created_at,
    };

    // Tulis ke DB
    const db = getDB();
    db.prepare(`
      INSERT INTO fleet (id, name, type, adapter, ip_address, ws_port, cam_url, status, battery_pct, last_seen, created_at)
      VALUES (@id, @name, @type, @adapter, @ip_address, @ws_port, @cam_url, @status, @battery_pct, @last_seen, @created_at)
    `).run(rc);

    // Update cache
    this.fleet.set(rc_id, rc);

    this.emit('fleet_update', { rc_id, data: this._sanitize(rc) });
    console.log(`[FleetManager] RC terdaftar: ${name} (${type}/${adapter}) — ID: ${rc_id}`);

    return this._sanitize(rc);
  }

  /**
   * Update data RC (field statis: nama, IP, dll — bukan status/battery yang
   * berubah sering, itu pakai setStatus/setBattery)
   * @param {string} rc_id
   * @param {Object} updates
   */
  update(rc_id, updates) {
    const rc = this.fleet.get(rc_id);
    if (!rc) throw new Error('RC_NOT_FOUND');

    const allowed = ['name', 'ip_address', 'ws_port', 'cam_url', 'adapter'];
    const changes = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        rc[key] = updates[key];
        changes[key] = updates[key];
      }
    }

    if (Object.keys(changes).length > 0) {
      const db = getDB();
      const setClause = Object.keys(changes).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE fleet SET ${setClause} WHERE id = @id`).run({ ...changes, id: rc_id });
    }

    this.emit('fleet_update', { rc_id, data: this._sanitize(rc) });
    return this._sanitize(rc);
  }

  /**
   * Hapus RC dari fleet (permanen, dari DB juga)
   * @param {string} rc_id
   */
  remove(rc_id) {
    const rc = this.fleet.get(rc_id);
    if (!rc) throw new Error('RC_NOT_FOUND');
    if (rc.status === RC_STATUS.IN_USE) throw new Error('RC_IN_USE');

    const db = getDB();
    db.prepare(`DELETE FROM fleet WHERE id = ?`).run(rc_id);

    this.fleet.delete(rc_id);
    this.emit('fleet_update', { rc_id, data: null });
    console.log(`[FleetManager] RC dihapus: ${rc.name}`);
    return true;
  }

  /**
   * Set status RC — hanya update memory + DB (lightweight, dipanggil sering)
   * @param {string} rc_id
   * @param {string} status
   */
  setStatus(rc_id, status) {
    const rc = this.fleet.get(rc_id);
    if (!rc) return false;

    rc.status = status;
    rc.last_seen = status !== RC_STATUS.OFFLINE ? new Date().toISOString() : rc.last_seen;

    // Tulis ke DB (status RC penting untuk persist, kalau crash kita tahu kondisi terakhir)
    const db = getDB();
    db.prepare(`UPDATE fleet SET status = ?, last_seen = ? WHERE id = ?`)
      .run(status, rc.last_seen, rc_id);

    this.emit('rc_status', { rc_id, status });
    return true;
  }

  /**
   * Update level baterai.
   * Sengaja TIDAK menulis ke DB setiap kali dipanggil (battery update sangat
   * sering / per beberapa detik) — supaya tidak membebani disk I/O.
   * Battery hanya di-flush ke DB secara periodik via flushBatteryToDB().
   * @param {string} rc_id
   * @param {number} battery_pct
   */
  setBattery(rc_id, battery_pct) {
    const rc = this.fleet.get(rc_id);
    if (!rc) return false;
    rc.battery_pct = Math.max(0, Math.min(100, Math.round(battery_pct)));
    this.emit('battery_update', { rc_id, battery_pct: rc.battery_pct });
    return true;
  }

  /**
   * Flush battery_pct semua RC ke DB. Panggil ini secara periodik
   * (misal tiap 30 detik) dari server.js, bukan tiap kali battery berubah.
   */
  flushBatteryToDB() {
    if (this.fleet.size === 0) return;

    const db = getDB();
    const update = db.prepare(`UPDATE fleet SET battery_pct = ? WHERE id = ?`);
    const updateMany = db.transaction((entries) => {
      for (const [rc_id, rc] of entries) {
        update.run(rc.battery_pct, rc_id);
      }
    });
    updateMany(Array.from(this.fleet.entries()));
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
   * Hapus field internal dari RC object sebelum dikirim ke client
   * @private
   */
  _sanitize(rc) {
    return { ...rc };
  }

  /**
   * Seed beberapa RC simulator untuk development.
   * Aman dipanggil berkali-kali — cek dulu apakah sudah ada simulator
   * sebelum menambah, supaya tidak numpuk tiap restart.
   */
  seedSimulators() {
    const hasSimulators = this.getAll().some(rc => rc.adapter === 'simulator');
    if (hasSimulators) {
      console.log('[FleetManager] RC simulator sudah ada di DB, skip seeding');
      return;
    }

    this.register({ name: 'RC Simulator #1 🔴', type: 'car', adapter: 'simulator' });
    this.register({ name: 'RC Simulator #2 🔵', type: 'car', adapter: 'simulator' });
    this.register({ name: 'Drone Simulator 🚁', type: 'drone', adapter: 'simulator' });
    console.log('[FleetManager] 3 RC simulator sudah di-seed untuk development');
  }
}

module.exports = new FleetManager();
module.exports.RC_STATUS = RC_STATUS;
