/**
 * RC Module — Database Singleton
 * 
 * Menggunakan better-sqlite3, konsisten dengan Viewer Merusuh.
 * Database terpisah dari Viewer Merusuh (file sendiri) supaya
 * RC Module tetap bisa berdiri sendiri (standalone mode).
 * 
 * Tujuan persistence:
 * - fleet RC tidak hilang saat restart server
 * - riwayat sesi (untuk laporan/statistik nanti)
 * - config tersimpan, tidak perlu di-set ulang tiap start
 * 
 * Catatan: Session & queue yang SEDANG AKTIF tetap di in-memory
 * (sessionManager.js / queueManager.js) karena butuh timer real-time.
 * DB hanya menyimpan fleet (permanen) + history (log setelah selesai).
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbInstance = null;

/**
 * Path database — bisa di-override via env (untuk integrasi Electron nanti,
 * sama seperti pola DB_PATH di Viewer Merusuh)
 */
function resolveDbPath() {
  if (process.env.RC_DB_PATH) return process.env.RC_DB_PATH;

  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'rc-module.db');
}

/**
 * Ambil instance DB (singleton)
 * @returns {Database.Database}
 */
function getDB() {
  if (dbInstance) return dbInstance;

  const dbPath = resolveDbPath();
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL'); // sama seperti Viewer Merusuh, lebih aman untuk concurrent read/write

  console.log(`[RC DB] Terhubung: ${dbPath}`);
  return dbInstance;
}

/**
 * Tutup koneksi DB (untuk graceful shutdown)
 */
function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[RC DB] Koneksi ditutup');
  }
}

module.exports = { getDB, closeDB, resolveDbPath };
