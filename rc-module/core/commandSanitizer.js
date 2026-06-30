/**
 * RC Module — Command Sanitizer
 * 
 * Satu titik validasi untuk SEMUA perintah kontrol sebelum diteruskan
 * ke adapter manapun (simulator, esp32, mavlink, dst).
 * 
 * Kenapa ini penting sebelum masuk hardware:
 * - Browser viewer bisa dimanipulasi (DevTools, request manual via curl/Postman)
 * - Tanpa sanitasi, command seperti { forward: 999, turn: NaN } bisa
 *   sampai ke motor RC asli dan berakibat fisik (motor ngebut, korslet, dll)
 * - Drone lebih sensitif lagi — command sembarangan bisa berbahaya
 * 
 * Aturan:
 * - Semua angka di-clamp ke rentang yang valid
 * - Field yang bukan angka (NaN, string, undefined) dianggap 0
 * - brake selalu boolean
 * - Field yang tidak dikenal diabaikan (tidak diteruskan ke adapter)
 */

/**
 * Clamp angka ke rentang [min, max]. Jika bukan angka valid, return fallback.
 */
function clampNumber(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * Sanitasi command untuk RC darat (car/boat)
 * @param {Object} raw - command mentah dari client
 * @returns {Object} command yang sudah aman
 */
function sanitizeGroundCommand(raw = {}) {
  return {
    forward: clampNumber(raw.forward, -1, 1, 0),
    turn: clampNumber(raw.turn, -1, 1, 0),
    brake: raw.brake === true,
  };
}

/**
 * Sanitasi command untuk drone — lebih ketat, ada batas tambahan
 * untuk altitude karena menyangkut keselamatan.
 * @param {Object} raw
 * @returns {Object}
 */
function sanitizeDroneCommand(raw = {}) {
  return {
    throttle: clampNumber(raw.throttle, 0, 1, 0),
    pitch: clampNumber(raw.pitch, -1, 1, 0),
    yaw: clampNumber(raw.yaw, -1, 1, 0),
    roll: clampNumber(raw.roll, -1, 1, 0),
    // Altitude target dibatasi 0-120 meter sesuai regulasi Permenhub No. 37/2020
    // yang sudah dicatat di HARDWARE_GUIDE.md
    altitude: raw.altitude !== undefined ? clampNumber(raw.altitude, 0, 120, null) : null,
    // land/RTH (return-to-home) adalah killswitch — selalu boolean, tidak pernah diabaikan
    land: raw.land === true,
    rth: raw.rth === true,
  };
}

/**
 * Sanitasi otomatis berdasarkan tipe RC
 * @param {string} rcType - 'car' | 'boat' | 'drone'
 * @param {Object} raw
 * @returns {Object}
 */
function sanitizeCommand(rcType, raw) {
  if (rcType === 'drone') {
    return sanitizeDroneCommand(raw);
  }
  // car & boat pakai skema yang sama (forward/turn)
  return sanitizeGroundCommand(raw);
}

/**
 * Rate limiter sederhana per-key (per rc_id atau per viewer_token).
 * Mencegah viewer mengirim command lebih cepat dari yang diizinkan,
 * baik karena bug client maupun upaya spam/flood.
 */
class CommandRateLimiter {
  constructor(minIntervalMs = 100) {
    this.minIntervalMs = minIntervalMs;
    this.lastSent = new Map(); // key -> timestamp
  }

  /**
   * Cek apakah command boleh dikirim sekarang
   * @param {string} key - biasanya rc_id
   * @returns {boolean}
   */
  allow(key) {
    const now = Date.now();
    const last = this.lastSent.get(key) || 0;
    if (now - last < this.minIntervalMs) {
      return false;
    }
    this.lastSent.set(key, now);
    return true;
  }

  /**
   * Bersihkan entry lama (panggil periodik agar Map tidak membengkak)
   */
  cleanup(maxAgeMs = 60000) {
    const now = Date.now();
    for (const [key, ts] of this.lastSent) {
      if (now - ts > maxAgeMs) this.lastSent.delete(key);
    }
  }
}

module.exports = {
  sanitizeCommand,
  sanitizeGroundCommand,
  sanitizeDroneCommand,
  clampNumber,
  CommandRateLimiter,
};
