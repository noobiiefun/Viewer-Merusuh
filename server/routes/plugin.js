// server/routes/plugin.js
// Endpoint khusus untuk plugin native game (GTA 5, BeamNG, dll)
//
// Alur:
//   1. Plugin dalam game polling GET /api/plugin/pending?game=gta5
//   2. Server balas dengan daftar efek yang perlu dieksekusi
//   3. Plugin eksekusi efek di dalam game
//   4. Plugin lapor selesai POST /api/plugin/done
//
// Autentikasi: PLUGIN_SECRET di .env (opsional, untuk keamanan)

const router   = require('express').Router()
const eventBus = require('../core/eventBus')
const { getDB } = require('../db/database')

// ── In-memory queue per game ─────────────────────────────────────────
// { [gameId]: [ { effectId, actionKey, durationMs, donation, queuedAt } ] }
const pluginQueues = {}

// ── Tambah efek ke plugin queue saat efek di-trigger ─────────────────
eventBus.on('effect', ({ effect, donation }) => {
  if (effect.adapter !== 'plugin') return

  const gameId = effect.game_target  // misal: 'gta5', 'beamng'
  if (!pluginQueues[gameId]) pluginQueues[gameId] = []

  pluginQueues[gameId].push({
    id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actionKey:   effect.action_key,
    durationMs:  effect.duration_ms,
    effectName:  effect.name,
    donation: {
      donatorName: donation.donatorName,
      amount:      donation.amount,
      message:     donation.message,
      platform:    donation.platform,
    },
    queuedAt: Date.now(),
  })

  console.log(`📦 [Plugin:${gameId}] Efek "${effect.name}" masuk antrian plugin`)
})

// ── Middleware validasi plugin secret ────────────────────────────────
function validatePluginAuth(req, res, next) {
  const secret = process.env.PLUGIN_SECRET
  if (!secret) return next()  // jika tidak di-set, skip validasi

  const provided = req.headers['x-plugin-secret'] || req.query.secret
  if (provided !== secret) {
    return res.status(401).json({ error: 'Invalid plugin secret' })
  }
  next()
}

// ────────────────────────────────────────────────────────────────────
// GET /api/plugin/pending?game=gta5
// Plugin polling endpoint — ambil efek yang menunggu dieksekusi
// ────────────────────────────────────────────────────────────────────
router.get('/pending', validatePluginAuth, (req, res) => {
  const gameId = req.query.game
  if (!gameId) return res.status(400).json({ error: 'Parameter "game" wajib diisi' })

  const queue = pluginQueues[gameId] || []

  // Ambil semua yang pending, tandai sebagai 'sent'
  const pending = queue.splice(0, queue.length)

  // Bersihkan item yang sudah terlalu lama (>60 detik) — game mungkin crash
  const now = Date.now()
  const fresh = pending.filter(item => now - item.queuedAt < 60000)

  res.json({
    game:    gameId,
    count:   fresh.length,
    effects: fresh,
  })
})

// ────────────────────────────────────────────────────────────────────
// POST /api/plugin/done
// Plugin lapor efek selesai dieksekusi
// Body: { game, effectId, actionKey, success }
// ────────────────────────────────────────────────────────────────────
router.post('/done', validatePluginAuth, (req, res) => {
  const { game, actionKey, success, error } = req.body
  if (success) {
    console.log(`✅ [Plugin:${game}] Efek "${actionKey}" selesai dieksekusi`)
  } else {
    console.warn(`⚠️  [Plugin:${game}] Efek "${actionKey}" gagal: ${error}`)
  }
  res.json({ ok: true })
})

// ────────────────────────────────────────────────────────────────────
// GET /api/plugin/status?game=gta5
// Plugin cek koneksi & info server
// ────────────────────────────────────────────────────────────────────
router.get('/status', validatePluginAuth, (req, res) => {
  const gameId = req.query.game || 'unknown'
  const queueLen = (pluginQueues[gameId] || []).length
  res.json({
    ok:            true,
    server:        'Viewer Merusuh',
    version:       require('../../package.json').version,
    game:          gameId,
    pendingEffects: queueLen,
    timestamp:     Date.now(),
  })
})

// ────────────────────────────────────────────────────────────────────
// GET /api/plugin/queues — info semua queue (untuk dashboard)
// ────────────────────────────────────────────────────────────────────
router.get('/queues', (req, res) => {
  const info = Object.entries(pluginQueues).map(([gameId, q]) => ({
    game:    gameId,
    pending: q.length,
    items:   q.map(i => ({ actionKey: i.actionKey, effectName: i.effectName })),
  }))
  res.json({ success: true, data: info })
})

module.exports = router
