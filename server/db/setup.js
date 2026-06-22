// server/db/setup.js
const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../viewer-merusuh.db')

function setup() {
  console.log('🛠️  Setting up database...')
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // ── BUAT SEMUA TABEL DULU sebelum insert apapun ─────────────────
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
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      platform     TEXT    NOT NULL,
      donator_name TEXT    NOT NULL DEFAULT 'Anonymous',
      amount       INTEGER NOT NULL,
      message      TEXT,
      effect_id    INTEGER REFERENCES effects(id),
      effect_name  TEXT,
      status       TEXT    NOT NULL DEFAULT 'processed',
      raw_payload  TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ahk_game_groups (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      game_name  TEXT    NOT NULL,
      icon       TEXT    NOT NULL DEFAULT '🎮',
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ahk_presets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      group_id    INTEGER REFERENCES ahk_game_groups(id),
      description TEXT,
      is_active   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ahk_custom_keys (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT,
      key         TEXT    NOT NULL,
      modifier    TEXT    DEFAULT '',
      mode        TEXT    NOT NULL DEFAULT 'tap',
      repeat      INTEGER NOT NULL DEFAULT 1,
      interval_ms INTEGER NOT NULL DEFAULT 200,
      hold_ms     INTEGER NOT NULL DEFAULT 0,
      category    TEXT    NOT NULL DEFAULT 'custom',
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_effects_active ON effects(is_active, min_amount);
    CREATE INDEX IF NOT EXISTS idx_logs_created   ON donation_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_platform  ON donation_logs(platform);
  `)

  // ── SEED: Efek default ───────────────────────────────────────────
  const seedEffect = db.prepare(`
    INSERT OR IGNORE INTO effects
      (id, name, description, min_amount, max_amount, game_target, adapter, action_key, duration_ms, cooldown_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  ;[
    [1,  'Rem Mendadak',    'Memaksa kendaraan rem mendadak (keyboard)',        5000,  9999,  'racing', 'ahk',    'brake_force',         3000, 0],
    [2,  'Handbrake',       'Rem tangan mendadak (keyboard)',                   5000,  9999,  'racing', 'ahk',    'handbrake',           2000, 0],
    [3,  'Klakson Spam',    'Spam klakson berkali-kali',                       10000, 19999, 'action', 'ahk',    'horn_spam',           5000, 0],
    [4,  'Hujan Bom',       'Spawn explosion di sekitar karakter',             20000, 49999, 'action', 'ahk',    'explosion_rain',      8000, 0],
    [5,  'Chaos Ultimate',  'Semua efek sekaligus — total kacau',              50000, null,  'action', 'ahk',    'chaos_mode',         15000, 0],
    [6,  'Rem Controller',  'Rem penuh via virtual controller (ViGEm)',         5000,  9999,  'racing', 'vjoy',   'vjoy_brake',          3000, 0],
    [7,  'Steer Chaos',     'Steer kiri-kanan acak via controller',            10000, 19999, 'racing', 'vjoy',   'vjoy_random_steer',   5000, 0],
    [8,  'Drift Chaos',     'Gas penuh + steer chaos via controller',          20000, 49999, 'racing', 'vjoy',   'vjoy_drift_chaos',    8000, 0],
    [9,  'Disconnect Ctrl', 'Cabut-colok virtual controller sesaat',           15000, 29999, 'racing', 'vjoy',   'vjoy_disconnect',     2000, 0],
    [10, 'Wanted Naik',     'Tambah 3 bintang wanted (GTA 5 native)',           5000,  9999,  'gta5',   'plugin', 'gta5_wanted_up',         0, 0],
    [11, 'Wanted Max',      'Langsung 6 bintang wanted (GTA 5 native)',        20000, 49999, 'gta5',   'plugin', 'gta5_wanted_max',        0, 0],
    [12, 'Hujan Ledakan',   'Ledakan terus-menerus di sekitar player',         15000, 29999, 'gta5',   'plugin', 'gta5_explosion_rain', 8000, 0],
    [13, 'Chaos GTA5',      'Wanted max + ledakan + NPC menyerang',            50000, null,  'gta5',   'plugin', 'gta5_chaos_mode',    15000, 0],
    [14, 'Rem BeamNG',      'Rem mendadak (BeamNG native)',                     5000,  9999,  'beamng', 'plugin', 'beamng_brake',        3000, 0],
    [15, 'Slow Motion',     'Waktu melambat 30% (BeamNG native)',              10000, 19999, 'beamng', 'plugin', 'beamng_slow_motion',  5000, 0],
    [16, 'Chaos BeamNG',    'Gas + steer chaos + damage (BeamNG native)',      50000, null,  'beamng', 'plugin', 'beamng_chaos',       10000, 0],
  ].forEach(row => seedEffect.run(...row))

  // ── SEED: Game groups ─────────────────────────────────────────────
  const seedGroup = db.prepare(`INSERT OR IGNORE INTO ahk_game_groups (id,name,game_name,icon) VALUES (?,?,?,?)`)
  ;[
    [1, 'FPS',      'Valorant',       '🔫'],
    [2, 'FPS',      'CS2',            '🔫'],
    [3, 'FPS',      'PUBG',           '🎯'],
    [4, 'Racing',   'BeamNG.drive',   '🏎️'],
    [5, 'Racing',   'Forza Horizon',  '🏎️'],
    [6, 'Action',   'GTA 5',          '💥'],
    [7, 'Survival', 'Minecraft',      '⛏️'],
    [8, 'Survival', 'Rust',           '🌲'],
  ].forEach(row => seedGroup.run(...row))

  // ── SEED: Presets ─────────────────────────────────────────────────
  const seedPreset = db.prepare(`INSERT OR IGNORE INTO ahk_presets (id,name,group_id,description,is_active) VALUES (?,?,?,?,?)`)
  ;[
    [1, 'Default FPS (Valorant)', 1, 'Setting untuk game FPS Valorant', 1],
    [2, 'Default Racing (BeamNG)',4, 'Setting untuk BeamNG.drive',       0],
  ].forEach(row => seedPreset.run(...row))

  // ── SEED: Custom keys ─────────────────────────────────────────────
  const seedKey = db.prepare(`
    INSERT OR IGNORE INTO ahk_custom_keys
      (id, name, description, key, modifier, mode, repeat, interval_ms, hold_ms, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  ;[
    [1,  'Buang Senjata (G)',   'Tekan G — buang item/senjata',  'g',     '',      'tap',   3, 300, 0,    'fps'],
    [2,  'Reload (R)',           'Tekan R — reload senjata',      'r',     '',      'tap',   5, 200, 0,    'fps'],
    [3,  'Jump (Space)',         'Loncat',                         'Space', '',      'tap',   1,   0, 0,    'action'],
    [4,  'Crouch Hold (Ctrl)',   'Jongkok paksa 3 detik',         'LCtrl', '',      'hold',  1,   0, 3000, 'fps'],
    [5,  'Use/Interact (E)',     'Gunakan / interaksi',           'e',     '',      'tap',   3, 500, 0,    'action'],
    [6,  'Inventory (Tab)',      'Buka inventory',                'Tab',   '',      'tap',   1,   0, 0,    'survival'],
    [7,  'Map (M)',              'Buka peta',                     'm',     '',      'tap',   1,   0, 0,    'action'],
    [8,  'Prone (Z)',            'Tengkurap',                     'z',     '',      'tap',   1,   0, 0,    'fps'],
    [9,  'Melee (V)',            'Serang melee',                  'v',     '',      'tap',   3, 300, 0,    'fps'],
    [10, 'Undo Spam (Ctrl+Z)',   'Spam Ctrl+Z',                   'z',     'LCtrl', 'combo', 5, 100, 0,    'custom'],
  ].forEach(row => seedKey.run(...row))

  // ── SEED: Config ──────────────────────────────────────────────────
  const seedConfig = db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`)
  ;[
    ['overlay_theme',              'dark'],
    ['overlay_position',           'bottom-right'],
    ['min_donation_amount',        '1000'],
    ['queue_mode',                 'sequential'],
    ['notification_duration_ms',   '5000'],
    ['notif_position',             'bottom-right'],
    ['notif_bg',                   '#0d0f14'],
    ['notif_bg_opacity',           '0.92'],
    ['notif_border',               '#7c3aed'],
    ['notif_text',                 '#ffffff'],
    ['notif_amount_color',         '#86efac'],
    ['notif_effect_color',         '#fbbf24'],
    ['pricelist_show',             'true'],
    ['pricelist_position',         'top-right'],
    ['pricelist_title',            'Viewer Merusuh'],
    ['pricelist_subtitle',         'List Harga Merusuh'],
    ['pricelist_title_color',      '#ffffff'],
    ['pricelist_badge_bg',         '#000000'],
    ['pricelist_badge_text',       '#ffffff'],
    ['pricelist_label_bg',         '#1e2330'],
    ['pricelist_label_text',       '#ffffff'],
    ['pricelist_items_per_page',   '5'],
    ['pricelist_rotate_sec',       '10'],
    ['pricelist_hide_after_min',   '5'],
    ['pricelist_nav_color',        '#7c3aed'],
  ].forEach(([k, v]) => seedConfig.run(k, v))

  db.close()
  console.log(`✅ Database siap: ${DB_PATH}`)
  console.log('👉 Jalankan: npm run dev')
}

setup()
