/**
 * Test Helper — Setup in-memory database untuk testing
 * 
 * Supaya test tidak menyentuh file rc-module.db asli (yang dipakai
 * development/production), setiap test pakai SQLite in-memory yang
 * fresh dan dibuang setelah selesai.
 */

const Database = require('better-sqlite3');

/**
 * Buat instance DB in-memory dengan schema yang sudah di-setup,
 * lalu override module cache 'api/db/database' supaya getDB()
 * mengembalikan instance ini selama test berjalan.
 */
function setupTestDB() {
  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE fleet (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL,
      adapter       TEXT NOT NULL,
      ip_address    TEXT,
      ws_port       INTEGER DEFAULT 81,
      cam_url       TEXT,
      status        TEXT NOT NULL DEFAULT 'offline',
      battery_pct   INTEGER DEFAULT 100,
      last_seen     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE session_history (
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
      ended_at          TEXT
    );

    CREATE TABLE config (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Override getDB() supaya semua modul yang require('../api/db/database')
  // dapat instance in-memory ini, bukan file asli.
  const dbModule = require('../../api/db/database');
  dbModule.getDB = () => db;

  return db;
}

module.exports = { setupTestDB };
