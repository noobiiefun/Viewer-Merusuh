/**
 * Test — Command Sanitizer
 * 
 * Ini modul paling kritikal untuk keamanan: SEMUA command yang menyentuh
 * motor/drone fisik nantinya wajib lewat sini. Test harus mencakup
 * kasus-kasus "nakal" (NaN, string aneh, angka di luar rentang),
 * bukan cuma happy path.
 */

const {
  sanitizeGroundCommand,
  sanitizeDroneCommand,
  sanitizeCommand,
  clampNumber,
  CommandRateLimiter,
} = require('../commandSanitizer');

describe('clampNumber', () => {
  test('mengembalikan angka asli jika dalam rentang', () => {
    expect(clampNumber(0.5, -1, 1)).toBe(0.5);
  });

  test('clamp ke max jika melebihi batas atas', () => {
    expect(clampNumber(999, -1, 1)).toBe(1);
  });

  test('clamp ke min jika melebihi batas bawah', () => {
    expect(clampNumber(-999, -1, 1)).toBe(-1);
  });

  test('return fallback jika NaN', () => {
    expect(clampNumber(NaN, -1, 1, 0)).toBe(0);
  });

  test('return fallback jika string bukan angka', () => {
    expect(clampNumber('halo', -1, 1, 0)).toBe(0);
  });

  test('return fallback jika undefined', () => {
    expect(clampNumber(undefined, -1, 1, 0)).toBe(0);
  });

  test('string angka valid tetap dikonversi', () => {
    expect(clampNumber('0.5', -1, 1, 0)).toBe(0.5);
  });
});

describe('sanitizeGroundCommand', () => {
  test('command normal diteruskan apa adanya', () => {
    const result = sanitizeGroundCommand({ forward: 0.8, turn: -0.3, brake: false });
    expect(result).toEqual({ forward: 0.8, turn: -0.3, brake: false });
  });

  test('forward di luar rentang di-clamp ke -1..1', () => {
    const result = sanitizeGroundCommand({ forward: 999, turn: 0 });
    expect(result.forward).toBe(1);
  });

  test('forward negatif ekstrem di-clamp ke -1', () => {
    const result = sanitizeGroundCommand({ forward: -999, turn: 0 });
    expect(result.forward).toBe(-1);
  });

  test('NaN diperlakukan sebagai 0, bukan diteruskan mentah', () => {
    const result = sanitizeGroundCommand({ forward: NaN, turn: NaN });
    expect(result.forward).toBe(0);
    expect(result.turn).toBe(0);
  });

  test('field kosong/undefined default ke 0', () => {
    const result = sanitizeGroundCommand({});
    expect(result).toEqual({ forward: 0, turn: 0, brake: false });
  });

  test('brake hanya true jika persis true (bukan truthy string)', () => {
    expect(sanitizeGroundCommand({ brake: 'true' }).brake).toBe(false);
    expect(sanitizeGroundCommand({ brake: 1 }).brake).toBe(false);
    expect(sanitizeGroundCommand({ brake: true }).brake).toBe(true);
  });

  test('field asing (tidak dikenal) tidak ikut diteruskan', () => {
    const result = sanitizeGroundCommand({ forward: 0.5, evil_field: 'DROP TABLE fleet' });
    expect(result).not.toHaveProperty('evil_field');
  });
});

describe('sanitizeDroneCommand', () => {
  test('altitude di-clamp maksimal 120 meter (regulasi Permenhub)', () => {
    const result = sanitizeDroneCommand({ altitude: 99999 });
    expect(result.altitude).toBe(120);
  });

  test('altitude negatif di-clamp ke 0', () => {
    const result = sanitizeDroneCommand({ altitude: -50 });
    expect(result.altitude).toBe(0);
  });

  test('altitude undefined tetap null (bukan dipaksa 0 — artinya "tidak berubah")', () => {
    const result = sanitizeDroneCommand({});
    expect(result.altitude).toBeNull();
  });

  test('throttle di-clamp ke 0..1 (bukan -1..1 seperti ground)', () => {
    expect(sanitizeDroneCommand({ throttle: -0.5 }).throttle).toBe(0);
    expect(sanitizeDroneCommand({ throttle: 5 }).throttle).toBe(1);
  });

  test('land dan rth selalu boolean murni — tidak boleh "kabur" jadi truthy lain', () => {
    expect(sanitizeDroneCommand({ land: 'yes' }).land).toBe(false);
    expect(sanitizeDroneCommand({ land: true }).land).toBe(true);
    expect(sanitizeDroneCommand({ rth: true }).rth).toBe(true);
  });
});

describe('sanitizeCommand (dispatcher by type)', () => {
  test('tipe car/boat pakai skema ground', () => {
    const result = sanitizeCommand('car', { forward: 0.5, turn: 0.2 });
    expect(result).toHaveProperty('forward');
    expect(result).toHaveProperty('brake');
    expect(result).not.toHaveProperty('throttle');
  });

  test('tipe drone pakai skema drone', () => {
    const result = sanitizeCommand('drone', { throttle: 0.5 });
    expect(result).toHaveProperty('throttle');
    expect(result).toHaveProperty('land');
    expect(result).not.toHaveProperty('forward');
  });
});

describe('CommandRateLimiter', () => {
  test('command pertama selalu diizinkan', () => {
    const limiter = new CommandRateLimiter(100);
    expect(limiter.allow('rc_1')).toBe(true);
  });

  test('command kedua dalam interval pendek ditolak', () => {
    const limiter = new CommandRateLimiter(1000); // 1 detik
    expect(limiter.allow('rc_1')).toBe(true);
    expect(limiter.allow('rc_1')).toBe(false); // langsung lagi, masih dalam window
  });

  test('RC berbeda punya rate limit independen', () => {
    const limiter = new CommandRateLimiter(1000);
    expect(limiter.allow('rc_1')).toBe(true);
    expect(limiter.allow('rc_2')).toBe(true); // RC lain, tidak terpengaruh rc_1
  });

  test('cleanup membuang entry yang sudah lama', () => {
    const limiter = new CommandRateLimiter(100);
    limiter.allow('rc_old');
    // Paksa timestamp jadi sangat lama
    limiter.lastSent.set('rc_old', Date.now() - 999999);
    limiter.cleanup(1000);
    expect(limiter.lastSent.has('rc_old')).toBe(false);
  });
});
