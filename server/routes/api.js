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
  res.json({ success: true })
})

// ─────────────────── TEST ───────────────────

// POST /api/test/donation — simulasi donasi (dev only)
router.post('/test/donation', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Test endpoint hanya tersedia di development mode' })
  }
  const { amount = 10000, donatorName = 'Test Viewer', message = 'test merusuh!', platform = 'test' } = req.body
  eventBus.emit('donation', { platform, donatorName, amount: parseInt(amount), message, rawPayload: req.body })
  res.json({ success: true, message: `Simulasi donasi Rp ${parseInt(amount).toLocaleString('id-ID')} dikirim` })
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

module.exports = router
