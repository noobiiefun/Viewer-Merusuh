// server/index.js
// Entry point — Viewer Merusuh Core Server

require('dotenv').config()
const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')
const path       = require('path')

const eventBus = require('./core/eventBus')
require('./core/effectEngine')
require('./adapters/ahk')
require('./adapters/vjoy')      // Aktifkan vJoy/ViGEm virtual gamepad adapter

const { saweriаWebhookHandler } = require('./adapters/saweria')
const { trakteerWebhookHandler } = require('./adapters/trakteer')
const apiRouter    = require('./routes/api')
const pluginRouter = require('./routes/plugin')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

// ── Port: baca dari .env → PORT, default 3000 ──────
const PORT = parseInt(process.env.PORT) || 3000

// ──────────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────────
// Simpan rawBody untuk validasi HMAC signature Saweria
app.use((req, res, next) => {
  let data = ''
  req.on('data', chunk => { data += chunk })
  req.on('end',  () => { req.rawBody = data })
  next()
})
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

// ──────────────────────────────────────────────────
// Static files
// ──────────────────────────────────────────────────
app.use('/overlay',   express.static(path.join(__dirname, '../overlay')))
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard/dist')))

// ──────────────────────────────────────────────────
// Webhook routes
// ──────────────────────────────────────────────────
app.post('/webhook/saweria',  saweriаWebhookHandler)
app.post('/webhook/trakteer', trakteerWebhookHandler)

// ──────────────────────────────────────────────────
// API routes
// ──────────────────────────────────────────────────
app.use('/api', apiRouter)
app.use('/api/plugin', pluginRouter)

// Root info
app.get('/', (req, res) => {
  res.json({
    name:    'Viewer Merusuh',
    version: require('../package.json').version,
    port:    PORT,
    status:  'running',
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

// ──────────────────────────────────────────────────
// Socket.io — realtime ke dashboard & overlay
// ──────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 [Socket.io] Client terhubung: ${socket.id}`)
  socket.on('disconnect', () => {
    console.log(`🔌 [Socket.io] Client putus: ${socket.id}`)
  })
})

eventBus.on('donation', (donation) => { io.emit('donation', donation) })
eventBus.on('effect',   ({ effect, donation }) => {
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

// ──────────────────────────────────────────────────
// Error handler
// ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

// ──────────────────────────────────────────────────
// Start — dengan deteksi port bentrok yang jelas
// ──────────────────────────────────────────────────
server.listen(PORT, () => {
  const line = '═'.repeat(47)
  console.log(`
╔${line}╗
║         🎮  VIEWER MERUSUH v1.0.0              ║
╠${line}╣
║  Port    : ${String(PORT).padEnd(37)}║
║  Server  : http://localhost:${String(PORT).padEnd(19)}║
║  Overlay : http://localhost:${PORT}/overlay          ║
║  Dashboard: http://localhost:${PORT}/dashboard       ║
║                                               ║
║  Webhook Saweria  : POST /webhook/saweria     ║
║  Webhook Trakteer : POST /webhook/trakteer    ║
║                                               ║
║  ⚙️  Ganti port: edit PORT= di file .env       ║
║  Mode: ${(process.env.NODE_ENV || 'development').padEnd(39)}║
╚${line}╝
  `)
})

// Handle port bentrok — tampilkan pesan yang jelas
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`
╔══════════════════════════════════════════════╗
║  ❌  PORT ${PORT} SUDAH DIPAKAI APLIKASI LAIN  ║
╠══════════════════════════════════════════════╣
║  Solusi: ganti PORT di file .env             ║
║                                              ║
║  Contoh port alternatif:                     ║
║    PORT=3001  (paling umum)                  ║
║    PORT=3030                                 ║
║    PORT=4000                                 ║
║    PORT=8080                                 ║
║                                              ║
║  Lalu jalankan ulang: npm run dev            ║
╚══════════════════════════════════════════════╝
    `)
    process.exit(1)
  } else {
    console.error('❌ Server error:', err)
    process.exit(1)
  }
})

module.exports = { app, server, io }
