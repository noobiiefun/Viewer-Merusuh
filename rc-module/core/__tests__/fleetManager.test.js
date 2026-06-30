/**
 * Test — Fleet Manager
 */

const { setupTestDB } = require('./testSetup');

let db;
let fleetManager;

beforeEach(() => {
  jest.resetModules();
  db = setupTestDB();
  fleetManager = require('../fleetManager');
  fleetManager.loadFromDB(); // mulai dari state kosong di DB in-memory
});

afterEach(() => {
  db.close();
});

describe('register()', () => {
  test('berhasil daftar RC simulator tanpa ip_address', () => {
    const rc = fleetManager.register({ name: 'Sim 1', type: 'car', adapter: 'simulator' });
    expect(rc.id).toBeDefined();
    expect(rc.status).toBe('available'); // simulator langsung available
  });

  test('RC dengan adapter esp32 wajib ada ip_address', () => {
    expect(() => fleetManager.register({ name: 'ESP1', type: 'car', adapter: 'esp32' }))
      .toThrow('ip_address wajib diisi');
  });

  test('RC esp32 dengan ip_address valid berstatus offline saat baru daftar', () => {
    const rc = fleetManager.register({ name: 'ESP1', type: 'car', adapter: 'esp32', ip_address: '192.168.1.5' });
    expect(rc.status).toBe('offline');
  });

  test('menolak nama kosong', () => {
    expect(() => fleetManager.register({ name: '', type: 'car', adapter: 'simulator' })).toThrow();
  });

  test('menolak tipe tidak valid', () => {
    expect(() => fleetManager.register({ name: 'X', type: 'pesawat', adapter: 'simulator' })).toThrow();
  });

  test('menolak adapter tidak valid', () => {
    expect(() => fleetManager.register({ name: 'X', type: 'car', adapter: 'bluetooth' })).toThrow();
  });

  test('data RC tersimpan ke DB, bisa di-load ulang', () => {
    fleetManager.register({ name: 'Sim Persisten', type: 'car', adapter: 'simulator' });

    // Simulasikan restart server: load ulang dari DB
    fleetManager.loadFromDB();

    const all = fleetManager.getAll();
    expect(all.some(rc => rc.name === 'Sim Persisten')).toBe(true);
  });

  test('RC esp32 di-reset ke offline setelah reload (simulasi restart)', () => {
    const rc = fleetManager.register({ name: 'ESP1', type: 'car', adapter: 'esp32', ip_address: '192.168.1.5' });
    fleetManager.setStatus(rc.id, 'in_use'); // status berubah saat berjalan

    fleetManager.loadFromDB(); // restart

    const reloaded = fleetManager.get(rc.id);
    expect(reloaded.status).toBe('offline'); // koneksi WS lama sudah putus, harus offline
  });
});

describe('update()', () => {
  test('berhasil update nama dan IP', () => {
    const rc = fleetManager.register({ name: 'Awal', type: 'car', adapter: 'simulator' });
    const updated = fleetManager.update(rc.id, { name: 'Sudah Diubah' });
    expect(updated.name).toBe('Sudah Diubah');
  });

  test('update RC yang tidak ada melempar error', () => {
    expect(() => fleetManager.update('rc_ngasal', { name: 'X' })).toThrow('RC_NOT_FOUND');
  });
});

describe('remove()', () => {
  test('berhasil hapus RC yang available', () => {
    const rc = fleetManager.register({ name: 'Akan Dihapus', type: 'car', adapter: 'simulator' });
    expect(fleetManager.remove(rc.id)).toBe(true);
    expect(fleetManager.get(rc.id)).toBeNull();
  });

  test('menolak hapus RC yang sedang in_use', () => {
    const rc = fleetManager.register({ name: 'Dipakai', type: 'car', adapter: 'simulator' });
    fleetManager.setStatus(rc.id, 'in_use');
    expect(() => fleetManager.remove(rc.id)).toThrow('RC_IN_USE');
  });
});

describe('getAvailable()', () => {
  test('mengembalikan RC pertama yang available', () => {
    fleetManager.register({ name: 'RC1', type: 'car', adapter: 'simulator' });
    const available = fleetManager.getAvailable();
    expect(available).not.toBeNull();
  });

  test('mengembalikan null jika semua RC sedang dipakai', () => {
    const rc = fleetManager.register({ name: 'RC1', type: 'car', adapter: 'simulator' });
    fleetManager.setStatus(rc.id, 'in_use');
    expect(fleetManager.getAvailable()).toBeNull();
  });

  test('filter by type bekerja', () => {
    fleetManager.register({ name: 'Mobil', type: 'car', adapter: 'simulator' });
    fleetManager.register({ name: 'Drone', type: 'drone', adapter: 'simulator' });

    const drone = fleetManager.getAvailable('drone');
    expect(drone.type).toBe('drone');
  });
});

describe('setBattery()', () => {
  test('battery di-clamp 0-100', () => {
    const rc = fleetManager.register({ name: 'RC1', type: 'car', adapter: 'simulator' });
    fleetManager.setBattery(rc.id, 150);
    expect(fleetManager.get(rc.id).battery_pct).toBe(100);

    fleetManager.setBattery(rc.id, -20);
    expect(fleetManager.get(rc.id).battery_pct).toBe(0);
  });
});

describe('seedSimulators()', () => {
  test('tidak menduplikasi simulator jika dipanggil dua kali', () => {
    fleetManager.seedSimulators();
    fleetManager.seedSimulators();

    const simCount = fleetManager.getAll().filter(rc => rc.adapter === 'simulator').length;
    expect(simCount).toBe(3); // hanya 3 dari panggilan pertama
  });
});
