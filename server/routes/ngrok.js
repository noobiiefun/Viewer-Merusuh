// server/routes/ngrok.js
// REST API untuk kontrol tunnel ngrok dari dashboard

const express = require('express')
const router  = express.Router()
const ngrokManager = require('../core/ngrokManager')

// ── GET /api/ngrok/status — status tunnel saat ini ───────────────────
router.get('/status', (req, res) => {
  try {
    res.json({ success: true, ...ngrokManager.getStatus() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/ngrok/start — mulai tunnel ──────────────────────────────
// body: { authtoken?: string }
router.post('/start', async (req, res) => {
  try {
    const { authtoken } = req.body || {}
    const result = await ngrokManager.start({ authtoken })
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
})

// ── POST /api/ngrok/stop — matikan tunnel ─────────────────────────────
router.post('/stop', async (req, res) => {
  try {
    const result = await ngrokManager.stop()
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/ngrok/token — simpan authtoken saja (tanpa connect) ────
router.post('/token', (req, res) => {
  try {
    const { authtoken } = req.body || {}
    if (!authtoken) {
      return res.status(400).json({ success: false, error: 'authtoken wajib diisi' })
    }
    const fs   = require('fs')
    const path = require('path')
    const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, '../../.env')
    let lines = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8').split('\n') : []
    const idx = lines.findIndex(l => l.trim().startsWith('NGROK_AUTHTOKEN='))
    const newLine = `NGROK_AUTHTOKEN=${authtoken}`
    if (idx >= 0) lines[idx] = newLine
    else lines.push(newLine)
    fs.writeFileSync(ENV_PATH, lines.join('\n'))
    res.json({ success: true, saved: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/ngrok/autostart — toggle auto-connect saat start ───────
// body: { enabled: boolean }
router.post('/autostart', (req, res) => {
  try {
    const { enabled } = req.body || {}
    ngrokManager.setAutostart(!!enabled)
    res.json({ success: true, autostart: !!enabled })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/ngrok/ping-target — test round-trip via URL publik ──────
router.get('/ping-target', async (req, res) => {
  try {
    const result = await ngrokManager.testPublicReachability()
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
})

module.exports = router
