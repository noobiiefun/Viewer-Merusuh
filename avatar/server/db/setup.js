/**
 * avatar/server/db/setup.js
 * ─────────────────────────────────────────────
 * Inisialisasi SQLite database dan semua tabel.
 * Dipanggil sekali saat server pertama kali jalan.
 *
 * Ekspor:
 *   setupDB()  — buat tabel jika belum ada, return db instance
 *   getDB()    — ambil db instance yang sudah ada
 */

const path    = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'avatar.db');

/** @type {import('better-sqlite3').Database} */
let db;

/**
 * Buat semua tabel jika belum ada, lalu return db instance.
 * Aman dipanggil berkali-kali (idempotent).
 */
function setupDB() {
  db = new Database(DB_PATH);

  // Aktifkan WAL mode supaya lebih cepat dan aman untuk concurrent read
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- ─── Tabel tiers ───────────────────────────────────────────────────────
    -- Tier = level akses avatar. Streamer bebas buat berapa saja.
    CREATE TABLE IF NOT EXISTS tiers (
      id              TEXT PRIMARY KEY,         -- contoh: "rusuh_biasa", "sultan"
      display_name    TEXT NOT NULL,            -- nama tampil: "Rusuh Biasa"
      color_hex       TEXT DEFAULT '#ffffff',   -- warna badge di dashboard
      min_donation    INTEGER DEFAULT 0,        -- min total donasi (Rupiah), 0 = tidak pakai
      min_rc_sessions INTEGER DEFAULT 0,        -- min sesi RC, 0 = tidak pakai
      allow_manual    INTEGER DEFAULT 1,        -- 1 = streamer bisa assign manual
      priority        INTEGER DEFAULT 0,        -- tier priority tertinggi = dievaluasi duluan
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ─── Tabel avatars ─────────────────────────────────────────────────────
    -- Satu baris per file PNG di folder public/avatars/
    CREATE TABLE IF NOT EXISTS avatars (
      id           TEXT PRIMARY KEY,            -- sama dengan filename: "warrior.png"
      display_name TEXT NOT NULL,              -- nama tampil: "Warrior"
      frame_count  INTEGER DEFAULT 4,          -- jumlah frame di sprite sheet
      frame_width  INTEGER DEFAULT 32,         -- lebar satu frame (px)
      frame_height INTEGER DEFAULT 48,         -- tinggi satu frame (px)
      is_enabled   INTEGER DEFAULT 1           -- 0 = disembunyikan dari picker
    );

    -- ─── Tabel tier_avatars ────────────────────────────────────────────────
    -- Relasi many-to-many: tier mana bisa pakai avatar apa
    CREATE TABLE IF NOT EXISTS tier_avatars (
      tier_id   TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
      avatar_id TEXT NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
      PRIMARY KEY (tier_id, avatar_id)
    );

    -- ─── Tabel viewers ─────────────────────────────────────────────────────
    -- Satu baris per viewer yang punya hak avatar
    CREATE TABLE IF NOT EXISTS viewers (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_name      TEXT NOT NULL UNIQUE,
      tier_id           TEXT REFERENCES tiers(id),       -- tier aktif saat ini
      avatar_id         TEXT REFERENCES avatars(id),     -- avatar yang dipilih viewer
      total_donation    INTEGER DEFAULT 0,               -- akumulasi donasi (Rupiah)
      total_rc_sessions INTEGER DEFAULT 0,              -- total sesi RC
      assigned_by       TEXT DEFAULT 'auto',             -- 'auto' | 'manual'
      registered_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen         DATETIME,
      is_active         INTEGER DEFAULT 1                -- 0 = dinonaktifkan streamer
    );

    -- ─── Tabel donor_log ───────────────────────────────────────────────────
    -- Riwayat semua event yang mempengaruhi hak avatar viewer
    CREATE TABLE IF NOT EXISTS donor_log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_name TEXT NOT NULL,
      event_type   TEXT NOT NULL,       -- 'donation' | 'rc_session' | 'manual'
      amount       INTEGER DEFAULT 0,   -- nominal donasi jika event_type = 'donation'
      platform     TEXT,               -- 'saweria' | 'trakteer' | 'rc_module' | 'manual'
      meta         TEXT,               -- JSON bebas (rc_id, catatan streamer, dll)
      tier_before  TEXT,              -- tier sebelum event ini diproses
      tier_after   TEXT,              -- tier sesudah event ini (NULL jika tidak berubah)
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ─── Tabel chat_log ────────────────────────────────────────────────────
    -- Riwayat chat viewer yang sudah tampil di overlay
    CREATE TABLE IF NOT EXISTS chat_log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_name TEXT NOT NULL,
      avatar_id    TEXT,
      tier_id      TEXT,
      message      TEXT NOT NULL,
      sent_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('[Avatar DB] Semua tabel siap di:', DB_PATH);
  return db;
}

/**
 * Ambil db instance yang sudah diinisialisasi.
 * Throw error jika setupDB() belum dipanggil.
 */
function getDB() {
  if (!db) {
    throw new Error('[Avatar DB] getDB() dipanggil sebelum setupDB(). Pastikan server/index.js memanggil setupDB() duluan.');
  }
  return db;
}

module.exports = { setupDB, getDB };
