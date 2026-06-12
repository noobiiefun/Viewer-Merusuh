// server/index.js
// Entry point — Viewer Merusuh Core Server

require('dotenv').config()
const express  = require('express')
const http     = require('http')
const { Server } = require('socket.io')
const cors     = require('cors')
const path     = require('path')

const eventBus = require('./core/eventBus')
require('./core/effectEngine') // Aktifkan engine (side effect: attach listener)
require('./adapters/ahk')      // Aktifkan AHK game adapter

const { saweriаWebhookHandler } = require('./adapters/saweria')
const { trakteerWebhookHandler } = require('./adapters/trakteer')
const apiRouter = require('./routes/api')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

const PORT = process.env.PORT || 3000

// ──────────────────────────────────────────────
// Middleware: simpan rawBody untuk validasi signature
// ──────────────────────────────────────────────
app.use((req, res, next) => {
  let data = ''
  req.on('data', chunk => { data += chunk })
  req.on('end', () => { req.rawBody = data })
  next()
})
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

// ──────────────────────────────────────────────
// Static files: overlay & dashboard (production)
// ──────────────────────────────────────────────
app.use('/overlay', express.static(path.join(__dirname, '../overlay')))
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard/dist')))

// ──────────────────────────────────────────────
// Webhook routes (public, no auth — gunakan signature)
// ──────────────────────────────────────────────
app.post('/webhook/saweria',  saweriаWebhookHandler)
app.post('/webhook/trakteer', trakteerWebhookHandler)

// ──────────────────────────────────────────────
// API routes
// ──────────────────────────────────────────────
app.use('/api', apiRouter)

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'Viewer Merusuh',
    version: require('../package.json').version,
    status: 'running',
    endpoints: {
      webhook_saweria:  `POST /webhook/saweria`,
      webhook_trakteer: `POST /webhook/trakteer`,
      api:              `/api/*`,
      overlay:          `/overlay`,
      dashboard:        `/dashboard`,
      test_donation:    `POST /api/test/donation (dev only)`,
    }
  })
})

// ──────────────────────────────────────────────
// Socket.io — realtime ke dashboard & overlay
// ──────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 [Socket.io] Client terhubung: ${socket.id}`)
  socket.on('disconnect', () => {
    console.log(`🔌 [Socket.io] Client putus: ${socket.id}`)
  })
})

// Broadcast donasi ke semua client yang connect (dashboard & overlay)
eventBus.on('donation', (donation) => {
  io.emit('donation', donation)
})

// Broadcast efek yang aktif
eventBus.on('effect', ({ effect, donation }) => {
  io.emit('effect', {
    id:         effect.id,
    name:       effect.name,
    actionKey:  effect.action_key,
    durationMs: effect.duration_ms,
    donation: {
      platform:    donation.platform,
      donatorName: donation.donatorName,
      amount:      donation.amount,
      message:     donation.message,
    }
  })
})

// ──────────────────────────────────────────────
// Error handler
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║         🎮  VIEWER MERUSUH v1.0.0         ║
╠═══════════════════════════════════════════╣
║  Server  : http://localhost:${PORT}           ║
║  Overlay : http://localhost:${PORT}/overlay   ║
║  API     : http://localhost:${PORT}/api       ║
║                                           ║
║  Webhook Saweria  : POST /webhook/saweria ║
║  Webhook Trakteer : POST /webhook/trakteer║
║                                           ║
║  Mode: ${(process.env.NODE_ENV || 'development').padEnd(34)}║
╚═══════════════════════════════════════════╝
  `)
})

module.exports = { app, server, io }
