/**
 * Test — Session Manager
 */

const { setupTestDB } = require('./testSetup');

let db;
let sessionManager;

beforeEach(() => {
  // Fresh DB + fresh module instance setiap test, supaya state (Map sessions)
  // tidak bocor antar test.
  jest.resetModules();
  db = setupTestDB();
  sessionManager = require('../sessionManager');
});

afterEach(() => {
  // Pastikan semua interval timer dibersihkan supaya Jest tidak hang
  sessionManager.endAll();
  db.close();
});

describe('start()', () => {
  test('berhasil membuat sesi dengan data lengkap', () => {
    const result = sessionManager.start({
      rc_id: 'rc_1',
      viewer_name: 'Budi',
      duration_sec: 60,
      source: 'manual',
    });

    expect(result.session_id).toBeDefined();
    expect(result.viewer_token).toBeDefined();
    expect(result.controller_url).toContain(result.viewer_token);
  });

  test('menolak jika rc_id kosong', () => {
    expect(() => sessionManager.start({ viewer_name: 'Budi', duration_sec: 60 }))
      .toThrow('rc_id wajib diisi');
  });

  test('menolak jika viewer_name kosong', () => {
    expect(() => sessionManager.start({ rc_id: 'rc_1', duration_sec: 60 }))
      .toThrow('viewer_name wajib diisi');
  });

  test('menolak duration_sec negatif', () => {
    expect(() => sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: -10 }))
      .toThrow();
  });

  test('menolak duration_sec nol', () => {
    expect(() => sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 0 }))
      .toThrow();
  });

  test('menolak duration_sec lebih dari 1 jam', () => {
    expect(() => sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 99999 }))
      .toThrow('maksimal 3600');
  });

  test('menolak start sesi baru untuk RC yang sudah dipakai', () => {
    sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 60 });
    expect(() => sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Siti', duration_sec: 60 }))
      .toThrow('RC_IN_USE');
  });

  test('mengizinkan dua RC berbeda dipakai bersamaan', () => {
    expect(() => {
      sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 60 });
      sessionManager.start({ rc_id: 'rc_2', viewer_name: 'Siti', duration_sec: 60 });
    }).not.toThrow();
  });
});

describe('validateToken()', () => {
  test('token valid mengembalikan session', () => {
    const { viewer_token } = sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 60 });
    const session = sessionManager.validateToken(viewer_token);
    expect(session).not.toBeNull();
    expect(session.viewer_name).toBe('Budi');
  });

  test('token tidak valid mengembalikan null', () => {
    expect(sessionManager.validateToken('token-ngasal')).toBeNull();
  });

  test('token dari sesi yang sudah berakhir tidak valid lagi', () => {
    const { session_id, viewer_token } = sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 60 });
    sessionManager.end(session_id, 'admin');
    expect(sessionManager.validateToken(viewer_token)).toBeNull();
  });
});

describe('end()', () => {
  test('mengakhiri sesi dan release RC', () => {
    const { session_id } = sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 60 });
    const ok = sessionManager.end(session_id, 'admin');
    expect(ok).toBe(true);
    expect(sessionManager.isRcInUse('rc_1')).toBe(false);
  });

  test('mengakhiri sesi yang tidak ada mengembalikan false', () => {
    expect(sessionManager.end('sess_ngasal')).toBe(false);
  });

  test('mencatat session ke history saat berakhir', () => {
    const { session_id } = sessionManager.start({
      rc_id: 'rc_1',
      viewer_name: 'Budi',
      duration_sec: 60,
      source: 'donation',
      donation_amount: 25000,
    });
    sessionManager.end(session_id, 'expired');

    const history = sessionManager.getHistory({ limit: 10 });
    expect(history.length).toBe(1);
    expect(history[0].viewer_name).toBe('Budi');
    expect(history[0].reason_ended).toBe('expired');
    expect(history[0].donation_amount).toBe(25000);
  });
});

describe('getAll()', () => {
  test('mengembalikan semua sesi aktif', () => {
    sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 60 });
    sessionManager.start({ rc_id: 'rc_2', viewer_name: 'Siti', duration_sec: 60 });
    expect(sessionManager.getAll().length).toBe(2);
  });

  test('tidak menyertakan viewer_token internal yang sensitif secara tidak sengaja terstruktur salah', () => {
    sessionManager.start({ rc_id: 'rc_1', viewer_name: 'Budi', duration_sec: 60 });
    const all = sessionManager.getAll();
    // viewer_token memang sengaja disertakan untuk admin dashboard,
    // tapi pastikan strukturnya benar (bukan field internal lain yang bocor)
    expect(all[0]).toHaveProperty('viewer_token');
    expect(all[0]).not.toHaveProperty('_interval');
  });
});
