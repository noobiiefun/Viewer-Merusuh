// server/core/ngrokManager.js
// Manajemen tunnel ngrok built-in — tidak perlu install ngrok manual
// Pakai @ngrok/ngrok yang auto-download binary saat pertama dipakai

const fs   = require('fs')
const path = require('path')

let ngrokLib  = null   // lazy-load @ngrok/ngrok
let listener  = null   // instance tunnel aktif
let publicUrl = null
let isStarting = false
let lastError  = null

// ── Path .env (sama dengan yang dipakai env.js) ─────────────────────
const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, '../../.env')

function lazyLoadNgrok() {
  if (ngrokLib) return ngrokLib
  try {
    ngrokLib = require('@ngrok/ngrok')
    return ngrokLib
  } catch (err) {
    throw new Error('@ngrok/ngrok belum terinstall. Jalankan: npm install @ngrok/ngrok')
  }
}

// ── Baca authtoken dari .env ─────────────────────────────────────────
function readAuthtoken() {
  if (!fs.existsSync(ENV_PATH)) return ''
  const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.trim().match(/^NGROK_AUTHTOKEN=(.*)$/)
    if (m) return m[1].trim()
  }
  return ''
}

function readAutostart() {
  if (!fs.existsSync(ENV_PATH)) return false
  const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.trim().match(/^NGROK_AUTOSTART=(.*)$/)
    if (m) return m[1].trim() === 'true'
  }
  return false
}

// ── Tulis/update key di .env ──────────────────────────────────────────
function writeEnvKey(key, value) {
  let lines = []
  if (fs.existsSync(ENV_PATH)) {
    lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n')
  }
  const idx = lines.findIndex(l => l.trim().startsWith(`${key}=`))
  const newLine = `${key}=${value}`
  if (idx >= 0) lines[idx] = newLine
  else lines.push(newLine)
  fs.writeFileSync(ENV_PATH, lines.join('\n'))
}

// ── Start tunnel ───────────────────────────────────────────────────────
async function start({ authtoken, port } = {}) {
  if (listener) {
    return { url: publicUrl, alreadyRunning: true }
  }
  if (isStarting) {
    throw new Error('Tunnel sedang proses connect, tunggu sebentar')
  }

  isStarting = true
  lastError  = null

  try {
    const ngrok = lazyLoadNgrok()
    const token = authtoken || readAuthtoken()
    const targetPort = port || process.env.PORT || 3000

    if (!token) {
      throw new Error('Authtoken belum diisi. Ambil di https://dashboard.ngrok.com/get-started/your-authtoken')
    }

    listener = await ngrok.connect({
      addr: Number(targetPort),
      authtoken: token,
    })

    publicUrl = listener.url()

    // Simpan authtoken ke .env kalau dikirim manual (bukan dari .env yang sudah ada)
    if (authtoken) writeEnvKey('NGROK_AUTHTOKEN', authtoken)

    console.log(`🌐 [Ngrok] Tunnel aktif: ${publicUrl} → localhost:${targetPort}`)
    return { url: publicUrl, alreadyRunning: false }

  } catch (err) {
    lastError = err.message
    listener  = null
    publicUrl = null
    console.error('❌ [Ngrok] Gagal start tunnel:', err.message)
    throw err
  } finally {
    isStarting = false
  }
}

// ── Stop tunnel ────────────────────────────────────────────────────────
async function stop() {
  if (!listener) return { stopped: false }
  try {
    await listener.close()
  } catch (err) {
    console.warn('[Ngrok] Warning saat close:', err.message)
  }
  listener  = null
  publicUrl = null
  console.log('🌐 [Ngrok] Tunnel dimatikan')
  return { stopped: true }
}

// ── Status ─────────────────────────────────────────────────────────────
function getStatus() {
  return {
    connected:   !!listener,
    starting:    isStarting,
    url:         publicUrl,
    lastError,
    hasToken:    !!readAuthtoken(),
    autostart:   readAutostart(),
  }
}

// ── Set autostart flag ───────────────────────────────────────────────
function setAutostart(enabled) {
  writeEnvKey('NGROK_AUTOSTART', enabled ? 'true' : 'false')
}

// ── Test koneksi via URL publik (round-trip beneran) ──────────────────
async function testPublicReachability() {
  if (!publicUrl) throw new Error('Tunnel belum aktif')

  const testUrl = `${publicUrl}/api/status`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(testUrl, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`Server respond dengan status ${res.status}`)
    const data = await res.json()
    return { reachable: true, url: testUrl, data }
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('Timeout — URL publik tidak bisa diakses dalam 10 detik')
    }
    throw err
  }
}

// ── Cleanup saat process exit ────────────────────────────────────────
process.on('exit', () => {
  if (listener) {
    try { listener.close() } catch {}
  }
})

module.exports = {
  start,
  stop,
  getStatus,
  setAutostart,
  testPublicReachability,
  readAuthtoken,
  readAutostart,
}
