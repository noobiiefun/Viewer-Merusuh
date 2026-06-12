// server/db/setup.js
const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '../../viewer-merusuh.db')

function setup() {
  console.log('🛠️  Setting up database...')
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS effects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT,
      min_amount  INTEGER NOT NULL DEFAULT 0,
      max_amount  INTEGER,
      game_target TEXT    NOT NULL DEFAULT 'global',
      adapter     TEXT    NOT NULL DEFAULT 'ahk',
      action_key  TEXT    NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 3000,
      is_active   INTEGER NOT NULL DEFAULT 1,
      cooldown_ms INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS donation_logs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      platform       TEXT    NOT NULL,
      donator_name   TEXT    NOT NULL DEFAULT 'Anonymous',
      amount         INTEGER NOT NULL,
      message        TEXT,
      effect_id      INTEGER REFERENCES effects(id),
      effect_name    TEXT,
      status         TEXT    NOT NULL DEFAULT 'processed',
      raw_payload    TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_effects_active ON effects(is_active, min_amount);
    CREATE INDEX IF NOT EXISTS idx_logs_created   ON donation_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_platform  ON donation_logs(platform);
  `)

  // Seed efek default
  const seedEffect = db.prepare(`
    INSERT OR IGNORE INTO effects
      (id, name, description, min_amount, max_amount, game_target, adapter, action_key, duration_ms, cooldown_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const defaults = [
    [1, 'Rem Mendadak',   'Memaksa kendaraan rem mendadak',        5000,  9999,  'racing', 'ahk', 'brake_force',    3000, 0],
    [2, 'Klakson Spam',   'Spam klakson berkali-kali',             10000, 19999, 'action', 'ahk', 'horn_spam',      5000, 0],
    [3, 'Hujan Bom',      'Spawn explosion di sekitar karakter',   20000, 49999, 'action', 'ahk', 'explosion_rain', 8000, 0],
    [4, 'Chaos Ultimate', 'Semua efek sekaligus — total kacau',    50000, null,  'action', 'ahk', 'chaos_mode',    15000, 0],
  ]
  for (const row of defaults) seedEffect.run(...row)

  // Seed config default — termasuk notification_duration_ms
  const seedConfig = db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`)
  seedConfig.run('overlay_theme',              'dark')
  seedConfig.run('overlay_position',           'bottom-right')
  seedConfig.run('min_donation_amount',        '1000')
  seedConfig.run('queue_mode',                 'sequential')
  seedConfig.run('notification_duration_ms',   '5000')   // ← BARU: durasi notif OBS

  db.close()
  console.log(`✅ Database siap: ${DB_PATH}`)
  console.log('👉 Jalankan: npm run dev')
}

setup()
