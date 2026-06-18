// server/routes/testing.js
// Endpoint khusus untuk Testing Area di dashboard
// Lebih lengkap dari /api/test/donation yang sederhana

const router   = require('express').Router()
const eventBus = require('../core/eventBus')
const { getDB } = require('../db/database')
const { findMatchingEffect } = require('../core/effectEngine')

// ── In-memory test log (50 entry terakhir) ───────────────────────────
const testLogs = []
const MAX_LOGS = 50

function addLog(entry) {
  testLogs.unshift({ ...entry, timestamp: new Date().toISOString(), id: Date.now() })
  if (testLogs.length > MAX_LOGS) testLogs.pop()
  // Broadcast ke dashboard via eventBus
  eventBus.emit('test_log', testLogs[0])
}

// ────────────────────────────────────────────────────────────────────
// POST /api/testing/donate — simulasi donasi lengkap
// Body: { platform, donatorName, amount, message }
// ────────────────────────────────────────────────────────────────────
router.post('/donate', (req, res) => {
  // Izinkan testing di semua mode saat dijalankan dari Electron
  if (process.env.NODE_ENV === 'production' && !process.env.ELECTRON) {
    return res.status(403).json({ success: false, error: 'Testing hanya tersedia di development mode' })
  }

  const {
    platform    = 'test',
    donatorName = 'Test Viewer',
    amount      = 10000,
    message     = '',
  } = req.body

  if (!amount || isNaN(parseInt(amount))) {
    return res.status(400).json({ success: false, error: 'Amount tidak valid' })
  }

  const parsedAmount = parseInt(amount)

  // Preview: cari efek yang cocok dulu (tanpa trigger)
  const matchedEffect = findMatchingEffect(parsedAmount)

  const donation = { platform, donatorName, amount: parsedAmount, message, rawPayload: req.body }

  // Trigger ke effect engine
  eventBus.emit('donation', donation)

  // Log ke test logs
  addLog({
    type:          'donation',
    platform,
    donatorName,
    amount:        parsedAmount,
    message,
    matchedEffect: matchedEffect ? {
      id:         matchedEffect.id,
      name:       matchedEffect.name,
      actionKey:  matchedEffect.action_key,
      adapter:    matchedEffect.adapter,
      durationMs: matchedEffect.duration_ms,
    } : null,
  })

  res.json({
    success: true,
    message: `Donasi Rp ${parsedAmount.toLocaleString('id-ID')} dari "${donatorName}" dikirim`,
    matchedEffect: matchedEffect ? {
      name:       matchedEffect.name,
      actionKey:  matchedEffect.action_key,
      adapter:    matchedEffect.adapter,
      durationMs: matchedEffect.duration_ms,
    } : null,
  })
})

// ────────────────────────────────────────────────────────────────────
// POST /api/testing/trigger — trigger efek langsung tanpa donasi
// Body: { effectId }
// ────────────────────────────────────────────────────────────────────
router.post('/trigger', (req, res) => {
  // Izinkan testing di semua mode saat dijalankan dari Electron
  if (process.env.NODE_ENV === 'production' && !process.env.ELECTRON) {
    return res.status(403).json({ success: false, error: 'Testing hanya tersedia di development mode' })
  }

  const { effectId } = req.body
  if (!effectId) return res.status(400).json({ success: false, error: 'effectId wajib diisi' })

  const db     = getDB()
  const effect = db.prepare('SELECT * FROM effects WHERE id = ?').get(effectId)
  if (!effect) return res.status(404).json({ success: false, error: 'Efek tidak ditemukan' })

  const fakeDonation = {
    platform:    'test',
    donatorName: 'Direct Trigger',
    amount:      effect.min_amount,
    message:     `Manual trigger: ${effect.name}`,
    rawPayload:  {},
  }

  // Bypass engine langsung ke adapter
  eventBus.emit('effect', { effect, donation: fakeDonation })

  addLog({
    type:          'direct_trigger',
    effectName:    effect.name,
    actionKey:     effect.action_key,
    adapter:       effect.adapter,
    durationMs:    effect.duration_ms,
  })

  res.json({
    success: true,
    message: `Efek "${effect.name}" di-trigger langsung`,
    effect: {
      name:       effect.name,
      actionKey:  effect.action_key,
      adapter:    effect.adapter,
      durationMs: effect.duration_ms,
    },
  })
})

// ────────────────────────────────────────────────────────────────────
// GET /api/testing/preview?amount=10000 — preview efek tanpa trigger
// ────────────────────────────────────────────────────────────────────
router.get('/preview', (req, res) => {
  const amount = parseInt(req.query.amount)
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ success: false, error: 'Parameter amount wajib diisi' })
  }

  const effect = findMatchingEffect(amount)
  if (!effect) {
    return res.json({ success: true, matched: false, message: 'Tidak ada efek yang cocok untuk nominal ini' })
  }

  res.json({
    success: true,
    matched: true,
    effect: {
      id:          effect.id,
      name:        effect.name,
      description: effect.description,
      actionKey:   effect.action_key,
      adapter:     effect.adapter,
      gameTarget:  effect.game_target,
      durationMs:  effect.duration_ms,
      minAmount:   effect.min_amount,
      maxAmount:   effect.max_amount,
    },
  })
})

// ────────────────────────────────────────────────────────────────────
// GET /api/testing/logs — ambil test logs
// ────────────────────────────────────────────────────────────────────
router.get('/logs', (req, res) => {
  res.json({ success: true, data: testLogs })
})

// ────────────────────────────────────────────────────────────────────
// DELETE /api/testing/logs — clear test logs
// ────────────────────────────────────────────────────────────────────
router.delete('/logs', (req, res) => {
  testLogs.length = 0
  res.json({ success: true })
})

// ────────────────────────────────────────────────────────────────────
// GET /api/testing/platforms — daftar platform donasi yang tersedia
// ────────────────────────────────────────────────────────────────────
router.get('/platforms', (req, res) => {
  const db = getDB()
  const data = readEnv()

  res.json({
    success: true,
    data: [
      {
        id:        'saweria',
        name:      'Saweria',
        icon:      '🧋',
        color:     '#FF6B35',
        configured: !!(process.env.SAWERIA_STREAM_KEY),
        webhookUrl: `/webhook/saweria`,
      },
      {
        id:        'trakteer',
        name:      'Trakteer',
        icon:      '☕',
        color:     '#E63946',
        configured: !!(process.env.TRAKTEER_API_KEY),
        webhookUrl: `/webhook/trakteer`,
      },
      {
        id:        'test',
        name:      'Test (Simulasi)',
        icon:      '🧪',
        color:     '#7c3aed',
        configured: true,
        webhookUrl: null,
      },
    ],
  })
})

// Helper baca .env
function readEnv() {
  const fs   = require('fs')
  const path = require('path')
  const file = path.join(__dirname, '../../.env')
  if (!fs.existsSync(file)) return {}
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const obj   = {}
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue
    const [k, ...rest] = line.split('=')
    if (k) obj[k.trim()] = rest.join('=').trim()
  }
  return obj
}

module.exports = router
