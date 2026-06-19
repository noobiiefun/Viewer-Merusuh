// server/db/setup.js
const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../viewer-merusuh.db')

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
    // ── AHK: Racing ──
    [1, 'Rem Mendadak',    'Memaksa kendaraan rem mendadak (keyboard)',        5000,  9999,  'racing', 'ahk',  'brake_force',       3000, 0],
    [2, 'Handbrake',       'Rem tangan mendadak (keyboard)',                   5000,  9999,  'racing', 'ahk',  'handbrake',         2000, 0],
    // ── AHK: Action ──
    [3, 'Klakson Spam',    'Spam klakson berkali-kali',                       10000, 19999, 'action', 'ahk',  'horn_spam',         5000, 0],
    [4, 'Hujan Bom',       'Spawn explosion di sekitar karakter',             20000, 49999, 'action', 'ahk',  'explosion_rain',    8000, 0],
    [5, 'Chaos Ultimate',  'Semua efek sekaligus — total kacau',              50000, null,  'action', 'ahk',  'chaos_mode',       15000, 0],
    // ── vJoy: Racing (controller) ──
    [6, 'Rem Controller',  'Rem penuh via virtual controller (ViGEm)',         5000,  9999,  'racing', 'vjoy', 'vjoy_brake',        3000, 0],
    [7, 'Steer Chaos',     'Steer kiri-kanan acak via controller',            10000, 19999, 'racing', 'vjoy', 'vjoy_random_steer', 5000, 0],
    [8, 'Drift Chaos',     'Gas penuh + steer chaos via controller',          20000, 49999, 'racing', 'vjoy', 'vjoy_drift_chaos',  8000, 0],
    [9, 'Disconnect Ctrl', 'Cabut-colok virtual controller sesaat',           15000, 29999, 'racing', 'vjoy', 'vjoy_disconnect',   2000, 0],
    // ── Plugin: GTA 5 ──
    [10, 'Wanted Naik',    'Tambah 3 bintang wanted (GTA 5 native)',         5000,  9999,  'gta5',   'plugin', 'gta5_wanted_up',    0,    0],
    [11, 'Wanted Max',     'Langsung 6 bintang wanted (GTA 5 native)',       20000, 49999, 'gta5',   'plugin', 'gta5_wanted_max',   0,    0],
    [12, 'Hujan Ledakan',  'Ledakan terus-menerus di sekitar player',        15000, 29999, 'gta5',   'plugin', 'gta5_explosion_rain', 8000, 0],
    [13, 'Chaos GTA5',     'Wanted max + ledakan + NPC menyerang',           50000, null,  'gta5',   'plugin', 'gta5_chaos_mode',   15000, 0],
    // ── Plugin: BeamNG ──
    [14, 'Rem BeamNG',     'Rem mendadak (BeamNG native)',                   5000,  9999,  'beamng', 'plugin', 'beamng_brake',      3000, 0],
    [15, 'Slow Motion',    'Waktu melambat 30% (BeamNG native)',             10000, 19999, 'beamng', 'plugin', 'beamng_slow_motion', 5000, 0],
    [16, 'Chaos BeamNG',   'Gas + steer chaos + damage (BeamNG native)',     50000, null,  'beamng', 'plugin', 'beamng_chaos',      10000, 0],
  ]
  for (const row of defaults) seedEffect.run(...row)

  // Seed config default — termasuk notification_duration_ms
  const seedConfig = db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`)
  seedConfig.run('overlay_theme',              'dark')
  seedConfig.run('overlay_position',           'bottom-right')
  seedConfig.run('min_donation_amount',        '1000')
  seedConfig.run('queue_mode',                 'sequential')
  seedConfig.run('notification_duration_ms',   '5000')

  // ── Overlay: Notifikasi ──────────────────────────────
  seedConfig.run('notif_position',     'bottom-right')
  seedConfig.run('notif_bg',           '#0d0f14')
  seedConfig.run('notif_bg_opacity',   '0.92')
  seedConfig.run('notif_border',       '#7c3aed')
  seedConfig.run('notif_text',         '#ffffff')
  seedConfig.run('notif_amount_color', '#86efac')
  seedConfig.run('notif_effect_color', '#fbbf24')

  // ── Overlay: Price List ──────────────────────────────
  seedConfig.run('pricelist_show',          'true')
  seedConfig.run('pricelist_position',      'top-right')
  seedConfig.run('pricelist_title',         'Viewer Merusuh')
  seedConfig.run('pricelist_subtitle',      'List Harga Merusuh')
  seedConfig.run('pricelist_title_color',   '#ffffff')
  seedConfig.run('pricelist_badge_bg',      '#000000')
  seedConfig.run('pricelist_badge_text',    '#ffffff')
  seedConfig.run('pricelist_label_bg',      '#1e2330')
  seedConfig.run('pricelist_label_text',    '#ffffff')
  seedConfig.run('pricelist_items_per_page','5')
  seedConfig.run('pricelist_rotate_sec',    '10')
  seedConfig.run('pricelist_hide_after_min','5')
  seedConfig.run('pricelist_nav_color',     '#7c3aed')

  db.close()
  console.log(`✅ Database siap: ${DB_PATH}`)
  console.log('👉 Jalankan: npm run dev')
}

setup()
