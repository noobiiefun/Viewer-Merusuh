// server/routes/api.js
// REST API untuk dashboard: CRUD effects, baca logs, config

const router = require('express').Router()
const { getDB } = require('../db/database')
const eventBus  = require('../core/eventBus')

// ─────────────────── EFFECTS ───────────────────

// GET /api/effects — ambil semua efek
router.get('/effects', (req, res) => {
  const db = getDB()
  const effects = db.prepare('SELECT * FROM effects ORDER BY min_amount ASC').all()
  res.json({ success: true, data: effects })
})

// GET /api/effects/:id — detail satu efek
router.get('/effects/:id', (req, res) => {
  const db = getDB()
  const effect = db.prepare('SELECT * FROM effects WHERE id = ?').get(req.params.id)
  if (!effect) return res.status(404).json({ success: false, error: 'Effect tidak ditemukan' })
  res.json({ success: true, data: effect })
})

// POST /api/effects — buat efek baru
router.post('/effects', (req, res) => {
  const { name, description, min_amount, max_amount, game_target, adapter, action_key, duration_ms, cooldown_ms } = req.body
  if (!name || !min_amount || !action_key) {
    return res.status(400).json({ success: false, error: 'name, min_amount, action_key wajib diisi' })
  }
  const db = getDB()
  const result = db.prepare(`
    INSERT INTO effects (name, description, min_amount, max_amount, game_target, adapter, action_key, duration_ms, cooldown_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description || '', min_amount, max_amount || null, game_target || 'global', adapter || 'ahk', action_key, duration_ms || 3000, cooldown_ms || 0)
  res.status(201).json({ success: true, data: { id: result.lastInsertRowid } })
})

// PUT /api/effects/:id — update efek
router.put('/effects/:id', (req, res) => {
  const db = getDB()
  const existing = db.prepare('SELECT id FROM effects WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ success: false, error: 'Effect tidak ditemukan' })

  const { name, description, min_amount, max_amount, game_target, adapter, action_key, duration_ms, cooldown_ms, is_active } = req.body
  db.prepare(`
    UPDATE effects SET
      name = COALESCE(?, name), description = COALESCE(?, description),
      min_amount = COALESCE(?, min_amount), max_amount = ?,
      game_target = COALESCE(?, game_target), adapter = COALESCE(?, adapter),
      action_key = COALESCE(?, action_key), duration_ms = COALESCE(?, duration_ms),
      cooldown_ms = COALESCE(?, cooldown_ms), is_active = COALESCE(?, is_active),
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(name, description, min_amount, max_amount !== undefined ? max_amount : null,
         game_target, adapter, action_key, duration_ms, cooldown_ms, is_active, req.params.id)

  res.json({ success: true })
})

// DELETE /api/effects/:id
router.delete('/effects/:id', (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM effects WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// POST /api/effects/:id/toggle — toggle aktif/nonaktif
router.post('/effects/:id/toggle', (req, res) => {
  const db = getDB()
  const effect = db.prepare('SELECT id, is_active FROM effects WHERE id = ?').get(req.params.id)
  if (!effect) return res.status(404).json({ success: false, error: 'Effect tidak ditemukan' })
  const newState = effect.is_active ? 0 : 1
  db.prepare('UPDATE effects SET is_active = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(newState, effect.id)
  res.json({ success: true, is_active: newState })
})

// ─────────────────── LOGS ───────────────────

// GET /api/logs — ambil log donasi (50 terbaru, bisa filter)
router.get('/logs', (req, res) => {
  const db = getDB()
  const { platform, limit = 50, offset = 0 } = req.query
  let query = 'SELECT * FROM donation_logs'
  const params = []
  if (platform) { query += ' WHERE platform = ?'; params.push(platform) }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), parseInt(offset))
  const logs = db.prepare(query).all(...params)
  const total = db.prepare('SELECT COUNT(*) as count FROM donation_logs' + (platform ? ' WHERE platform = ?' : '')).get(...(platform ? [platform] : []))
  res.json({ success: true, data: logs, total: total.count })
})

// ─────────────────── CONFIG ───────────────────

// GET /api/config — ambil semua config
router.get('/config', (req, res) => {
  const db = getDB()
  const rows = db.prepare('SELECT key, value FROM config').all()
  const config = Object.fromEntries(rows.map(r => [r.key, r.value]))
  res.json({ success: true, data: config })
})

// PUT /api/config — update config
router.put('/config', (req, res) => {
  const db = getDB()
  const update = db.prepare(`INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))`)
  const updateMany = db.transaction((entries) => {
    for (const [key, value] of entries) update.run(key, String(value))
  })
  updateMany(Object.entries(req.body))
  // Broadcast ke overlay agar reload config
  try {
    const eventBus = require('../core/eventBus')
    eventBus.emit('config_updated', {})
  } catch {}
  res.json({ success: true })
})

// ─────────────────── TEST ───────────────────

// POST /api/test/donation — simulasi donasi (dev only)
router.post('/test/donation', (req, res) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ELECTRON) {
    return res.status(403).json({ success: false, error: 'Test endpoint hanya tersedia di development mode' })
  }
  const { amount = 10000, donatorName = 'Test Viewer', message = 'test merusuh!', platform = 'test' } = req.body
  eventBus.emit('donation', { platform, donatorName, amount: parseInt(amount), message, rawPayload: req.body })
  res.json({ success: true, message: `Simulasi donasi Rp ${parseInt(amount).toLocaleString('id-ID')} dikirim` })
})

// GET /api/queue — info antrian efek saat ini
router.get('/queue', (req, res) => {
  const { getQueueInfo } = require('../core/effectEngine')
  res.json({ success: true, data: getQueueInfo() })
})

// GET /api/status — health check
router.get('/status', (req, res) => {
  const db = getDB()
  const effectCount  = db.prepare('SELECT COUNT(*) as c FROM effects WHERE is_active = 1').get().c
  const donationCount = db.prepare('SELECT COUNT(*) as c FROM donation_logs').get().c
  res.json({
    success: true,
    status: 'running',
    activeEffects: effectCount,
    totalDonations: donationCount,
    uptime: Math.floor(process.uptime()),
    version: require('../../package.json').version,
  })
})

// ─────────────────── AHK ───────────────────

// ─────────────────── AHK CUSTOM KEYS ───────────────────

// ─────────── AHK GAME GROUPS ───────────

router.get('/ahk/groups', (req, res) => {
  const db = getDB()
  try { res.json({ success:true, data: db.prepare('SELECT * FROM ahk_game_groups ORDER BY name,game_name').all() }) }
  catch { res.json({ success:true, data:[] }) }
})
router.post('/ahk/groups', (req, res) => {
  const { name, game_name, icon } = req.body
  if (!name || !game_name) return res.status(400).json({ success:false, error:'name dan game_name wajib' })
  const db = getDB()
  const r = db.prepare('INSERT INTO ahk_game_groups (name,game_name,icon) VALUES (?,?,?)').run(name, game_name, icon||'🎮')
  res.status(201).json({ success:true, data:{ id: r.lastInsertRowid } })
})
router.put('/ahk/groups/:id', (req, res) => {
  const db = getDB()
  const { name, game_name, icon, is_active } = req.body
  db.prepare('UPDATE ahk_game_groups SET name=COALESCE(?,name), game_name=COALESCE(?,game_name), icon=COALESCE(?,icon), is_active=COALESCE(?,is_active) WHERE id=?')
    .run(name, game_name, icon, is_active, req.params.id)
  res.json({ success:true })
})
router.delete('/ahk/groups/:id', (req, res) => {
  getDB().prepare('DELETE FROM ahk_game_groups WHERE id=?').run(req.params.id)
  res.json({ success:true })
})

// ─────────── AHK PRESETS ───────────

router.get('/ahk/presets', (req, res) => {
  const db = getDB()
  try {
    const presets = db.prepare(`
      SELECT p.*, g.name as group_name, g.game_name, g.icon
      FROM ahk_presets p
      LEFT JOIN ahk_game_groups g ON p.group_id = g.id
      ORDER BY p.is_active DESC, p.name
    `).all()
    res.json({ success:true, data: presets })
  } catch { res.json({ success:true, data:[] }) }
})
router.post('/ahk/presets', (req, res) => {
  const { name, group_id, description } = req.body
  if (!name) return res.status(400).json({ success:false, error:'name wajib' })
  const db = getDB()
  const r = db.prepare('INSERT INTO ahk_presets (name,group_id,description) VALUES (?,?,?)').run(name, group_id||null, description||'')
  res.status(201).json({ success:true, data:{ id: r.lastInsertRowid } })
})
router.put('/ahk/presets/:id', (req, res) => {
  const db = getDB()
  const { name, group_id, description } = req.body
  db.prepare('UPDATE ahk_presets SET name=COALESCE(?,name), group_id=COALESCE(?,group_id), description=COALESCE(?,description) WHERE id=?')
    .run(name, group_id, description, req.params.id)
  res.json({ success:true })
})
router.delete('/ahk/presets/:id', (req, res) => {
  getDB().prepare('DELETE FROM ahk_presets WHERE id=?').run(req.params.id)
  res.json({ success:true })
})
// POST /api/ahk/presets/:id/activate — aktifkan preset (nonaktifkan lainnya)
router.post('/ahk/presets/:id/activate', (req, res) => {
  const db = getDB()
  db.prepare('UPDATE ahk_presets SET is_active=0').run()
  db.prepare('UPDATE ahk_presets SET is_active=1 WHERE id=?').run(req.params.id)
  // Broadcast ke dashboard
  try { require('../core/eventBus').emit('preset_changed', { id: parseInt(req.params.id) }) } catch {}
  res.json({ success:true })
})

// GET /api/ahk/custom-keys — daftar custom key actions
router.get('/ahk/custom-keys', (req, res) => {
  const db = getDB()
  try {
    const rows = db.prepare('SELECT * FROM ahk_custom_keys ORDER BY category, name').all()
    res.json({ success: true, data: rows })
  } catch (e) {
    res.json({ success: true, data: [] })
  }
})

// POST /api/ahk/custom-keys — buat custom key baru
router.post('/ahk/custom-keys', (req, res) => {
  const { name, description, key, modifier, mode, repeat, interval_ms, hold_ms, category } = req.body
  if (!name || !key) return res.status(400).json({ success: false, error: 'name dan key wajib diisi' })
  const db = getDB()
  const r = db.prepare(`
    INSERT INTO ahk_custom_keys (name, description, key, modifier, mode, repeat, interval_ms, hold_ms, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description||'', key, modifier||'', mode||'tap', repeat||1, interval_ms||200, hold_ms||0, category||'custom')
  res.status(201).json({ success: true, data: { id: r.lastInsertRowid } })
})

// PUT /api/ahk/custom-keys/:id — update
router.put('/ahk/custom-keys/:id', (req, res) => {
  const db = getDB()
  const { name, description, key, modifier, mode, repeat, interval_ms, hold_ms, category, is_active } = req.body
  db.prepare(`
    UPDATE ahk_custom_keys SET
      name=COALESCE(?,name), description=COALESCE(?,description),
      key=COALESCE(?,key), modifier=COALESCE(?,modifier),
      mode=COALESCE(?,mode), repeat=COALESCE(?,repeat),
      interval_ms=COALESCE(?,interval_ms), hold_ms=COALESCE(?,hold_ms),
      category=COALESCE(?,category), is_active=COALESCE(?,is_active)
    WHERE id=?
  `).run(name,description,key,modifier,mode,repeat,interval_ms,hold_ms,category,is_active,req.params.id)
  res.json({ success: true })
})

// DELETE /api/ahk/custom-keys/:id
router.delete('/ahk/custom-keys/:id', (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM ahk_custom_keys WHERE id=?').run(req.params.id)
  res.json({ success: true })
})

// POST /api/ahk/test-key — test custom key langsung (tanpa donasi)
router.post('/ahk/test-key', (req, res) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ELECTRON) {
    return res.status(403).json({ success: false, error: 'Test hanya di development mode' })
  }
  const { key, modifier, mode, repeat, interval_ms, hold_ms } = req.body
  const { runGenericKey, runGenericCombo } = require('../adapters/ahk')
  const ck = { key, modifier, mode, repeat: repeat||1, interval_ms: interval_ms||200, hold_ms: hold_ms||0 }
  if (mode === 'combo') runGenericCombo(ck)
  else                  runGenericKey(ck)
  res.json({ success: true, message: `Key "${modifier ? modifier+'+' : ''}${key}" dikirim` })
})

// GET /api/ahk/actions — daftar action_key AHK
router.get('/ahk/actions', (req, res) => {
  const { ACTION_REGISTRY } = require('../adapters/ahk')
  const actions = Object.entries(ACTION_REGISTRY).map(([key, script]) => ({
    action_key: key,
    script,
    adapter: 'ahk',
    group: script.split('/')[1] || 'lib',
  }))
  res.json({ success: true, data: actions })
})

// GET /api/vjoy/actions — daftar action_key vJoy
router.get('/vjoy/actions', (req, res) => {
  const { ACTION_REGISTRY } = require('../adapters/vjoy')
  const actions = Object.keys(ACTION_REGISTRY).map(key => ({
    action_key: key,
    adapter: 'vjoy',
    group: 'racing',
    description: getVjoyDesc(key),
  }))
  res.json({ success: true, data: actions })
})

// GET /api/actions — semua action_key dari semua adapter
router.get('/actions', (req, res) => {
  const { ACTION_REGISTRY: ahkReg } = require('../adapters/ahk')
  const { ACTION_REGISTRY: vjoyReg } = require('../adapters/vjoy')
  const ahk = Object.entries(ahkReg).map(([key, script]) => ({
    action_key: key, adapter: 'ahk',
    group: script.split('/')[1] || 'lib', script,
  }))
  const vjoy = Object.keys(vjoyReg).map(key => ({
    action_key: key, adapter: 'vjoy',
    group: 'racing', description: getVjoyDesc(key),
  }))
  // Plugin actions — langsung hardcode karena plugin tidak ada registry JS
  const pluginActions = [
    // GTA 5
    { action_key: 'gta5_wanted_up',      adapter: 'plugin', group: 'gta5',   description: 'Tambah 3 bintang wanted' },
    { action_key: 'gta5_wanted_max',     adapter: 'plugin', group: 'gta5',   description: 'Langsung 6 bintang' },
    { action_key: 'gta5_wanted_clear',   adapter: 'plugin', group: 'gta5',   description: 'Hapus semua wanted' },
    { action_key: 'gta5_explosion',      adapter: 'plugin', group: 'gta5',   description: 'Ledakan di sekitar player' },
    { action_key: 'gta5_explosion_rain', adapter: 'plugin', group: 'gta5',   description: 'Hujan ledakan' },
    { action_key: 'gta5_vehicle_brake',  adapter: 'plugin', group: 'gta5',   description: 'Rem mendadak kendaraan' },
    { action_key: 'gta5_vehicle_boost',  adapter: 'plugin', group: 'gta5',   description: 'Boost kecepatan 3x' },
    { action_key: 'gta5_vehicle_flip',   adapter: 'plugin', group: 'gta5',   description: 'Balik kendaraan' },
    { action_key: 'gta5_vehicle_horn',   adapter: 'plugin', group: 'gta5',   description: 'Spam klakson' },
    { action_key: 'gta5_vehicle_engine_off', adapter: 'plugin', group: 'gta5', description: 'Matikan mesin sementara' },
    { action_key: 'gta5_ragdoll',        adapter: 'plugin', group: 'gta5',   description: 'Karakter jatuh ragdoll' },
    { action_key: 'gta5_super_jump',     adapter: 'plugin', group: 'gta5',   description: 'Super jump' },
    { action_key: 'gta5_drunk',          adapter: 'plugin', group: 'gta5',   description: 'Efek mabuk' },
    { action_key: 'gta5_give_weapon',    adapter: 'plugin', group: 'gta5',   description: 'Beri senjata random' },
    { action_key: 'gta5_remove_weapon',  adapter: 'plugin', group: 'gta5',   description: 'Ambil semua senjata' },
    { action_key: 'gta5_weather_rain',   adapter: 'plugin', group: 'gta5',   description: 'Cuaca hujan lebat' },
    { action_key: 'gta5_weather_snow',   adapter: 'plugin', group: 'gta5',   description: 'Cuaca salju' },
    { action_key: 'gta5_weather_thunder',adapter: 'plugin', group: 'gta5',   description: 'Cuaca badai petir' },
    { action_key: 'gta5_time_night',     adapter: 'plugin', group: 'gta5',   description: 'Paksa malam hari' },
    { action_key: 'gta5_npc_attack',     adapter: 'plugin', group: 'gta5',   description: '3 NPC menyerang' },
    { action_key: 'gta5_spawn_cop',      adapter: 'plugin', group: 'gta5',   description: 'Spawn polisi' },
    { action_key: 'gta5_spawn_enemy',    adapter: 'plugin', group: 'gta5',   description: 'Spawn musuh bersenjata' },
    { action_key: 'gta5_chaos_mode',     adapter: 'plugin', group: 'gta5',   description: 'Semua efek chaos' },
    // BeamNG
    { action_key: 'beamng_brake',        adapter: 'plugin', group: 'beamng', description: 'Rem mendadak' },
    { action_key: 'beamng_throttle',     adapter: 'plugin', group: 'beamng', description: 'Gas penuh paksa' },
    { action_key: 'beamng_random_steer', adapter: 'plugin', group: 'beamng', description: 'Steer acak chaos' },
    { action_key: 'beamng_handbrake',    adapter: 'plugin', group: 'beamng', description: 'Tahan handbrake' },
    { action_key: 'beamng_engine_off',   adapter: 'plugin', group: 'beamng', description: 'Matikan mesin' },
    { action_key: 'beamng_explosion',    adapter: 'plugin', group: 'beamng', description: 'Ledakan di sekitar' },
    { action_key: 'beamng_slow_motion',  adapter: 'plugin', group: 'beamng', description: 'Slow motion 30%' },
    { action_key: 'beamng_vehicle_reset',adapter: 'plugin', group: 'beamng', description: 'Reset/recovery kendaraan' },
    { action_key: 'beamng_random_damage',adapter: 'plugin', group: 'beamng', description: 'Kerusakan acak' },
    { action_key: 'beamng_chaos',        adapter: 'plugin', group: 'beamng', description: 'Semua efek chaos' },
  ]
  // Custom keys dari database
  let customKeys = []
  try {
    const db = getDB()
    customKeys = db.prepare('SELECT * FROM ahk_custom_keys WHERE is_active=1 ORDER BY category,name').all()
      .map(k => ({
        action_key:  `custom_key_${k.id}`,
        adapter:     'ahk',
        group:       k.category,
        description: `${k.name} — ${k.modifier ? k.modifier+'+' : ''}${k.key} (${k.mode})`,
        isCustomKey: true,
        keyData:     k,
      }))
  } catch {}

  res.json({ success: true, data: [...ahk, ...vjoy, ...pluginActions, ...customKeys] })
})

function getVjoyDesc(key) {
  const desc = {
    vjoy_brake:        'Rem penuh (trigger kiri)',
    vjoy_throttle:     'Gas penuh (trigger kanan)',
    vjoy_steer_left:   'Steer kiri penuh',
    vjoy_steer_right:  'Steer kanan penuh',
    vjoy_random_steer: 'Steer acak kiri-kanan',
    vjoy_handbrake:    'Rem tangan (tombol X)',
    vjoy_drift_chaos:  'Gas penuh + steer chaos',
    vjoy_reverse:      'Mundur paksa',
    vjoy_rumble:       'Getarkan controller',
    vjoy_disconnect:   'Cabut-colok controller sesaat',
  }
  return desc[key] || key
}

module.exports = router
