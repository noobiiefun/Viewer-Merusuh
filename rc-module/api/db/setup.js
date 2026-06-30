/**
 * RC Module — Database Setup
 * 
 * Membuat schema tabel. Dipanggil sekali saat server start.
 * 
 * Tabel:
 * - fleet          → RC/drone yang terdaftar (permanen)
 * - session_history → log sesi yang sudah selesai (untuk laporan)
 * - config         → key-value config (sama pola dengan Viewer Merusuh)
 * 
 * PENTING: urutan harus benar — db.exec() buat semua tabel dulu,
 * baru migration/seed jalan. Ini bug yang sudah pernah terjadi di
 * Viewer Merusuh (lihat DEVELOPER_GUIDE.md #15 "no such table"),
 * jadi sengaja dihindari di sini.
 */

const { getDB } = require('./database');

function setup() {
  const db = getDB();

  // ── Buat semua tabel dulu ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS fleet (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL CHECK(type IN ('car', 'drone', 'boat')),
      adapter       TEXT NOT NULL CHECK(adapter IN ('esp32', 'raspi', 'mavlink', 'simulator')),
      ip_address    TEXT,
      ws_port       INTEGER DEFAULT 81,
      cam_url       TEXT,
      status        TEXT NOT NULL DEFAULT 'offline',
      battery_pct   INTEGER DEFAULT 100,
      last_seen     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_history (
      id                TEXT PRIMARY KEY,
      rc_id             TEXT NOT NULL,
      rc_name           TEXT,
      viewer_name       TEXT NOT NULL,
      duration_sec      INTEGER NOT NULL,
      duration_used_sec INTEGER,
      source            TEXT NOT NULL DEFAULT 'manual',
      donation_amount   INTEGER DEFAULT 0,
      reason_ended      TEXT,
      started_at        TEXT NOT NULL,
      ended_at          TEXT,
      FOREIGN KEY (rc_id) REFERENCES fleet(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_session_history_rc ON session_history(rc_id);
    CREATE INDEX IF NOT EXISTS idx_session_history_started ON session_history(started_at);
  `);

  // ── Migration check sederhana ───────────────────────────────────────────────
  // Pola yang sama seperti disarankan di DEVELOPER_GUIDE.md Viewer Merusuh:
  // cek dulu kolom ada atau belum sebelum ALTER, supaya aman dijalankan berkali-kali.
  migrateIfNeeded(db);

  // ── Seed default config (hanya jika belum ada) ──────────────────────────────
  seedDefaultConfig(db);

  console.log('[RC DB] Schema siap');
}

/**
 * Migration sederhana — tambahkan kolom baru di sini jika versi mendatang
 * butuh kolom tambahan, dengan pengecekan agar tidak error jika sudah ada.
 */
function migrateIfNeeded(db) {
  const fleetColumns = db.prepare(`PRAGMA table_info(fleet)`).all().map(c => c.name);

  // Contoh pola migration aman (belum dibutuhkan sekarang, disiapkan untuk masa depan):
  // if (!fleetColumns.includes('firmware_version')) {
  //   db.exec(`ALTER TABLE fleet ADD COLUMN firmware_version TEXT`);
  //   console.log('[RC DB] Migration: tambah kolom firmware_version');
  // }
}

/**
 * Isi config default jika tabel config masih kosong
 */
function seedDefaultConfig(db) {
  const existing = db.prepare(`SELECT COUNT(*) as count FROM config`).get();
  if (existing.count > 0) return;

  const defaults = {
    default_session_duration_sec: '300',
    min_donation_amount: '10000',
    amount_per_minute: '5000',
    max_queue_per_rc: '5',
    command_rate_limit_ms: '100',
    allow_manual_start: 'true',
  };

  const insert = db.prepare(`INSERT INTO config (key, value) VALUES (?, ?)`);
  const insertMany = db.transaction((entries) => {
    for (const [key, value] of entries) {
      insert.run(key, value);
    }
  });

  insertMany(Object.entries(defaults));
  console.log('[RC DB] Config default sudah di-seed');
}

module.exports = { setup };
