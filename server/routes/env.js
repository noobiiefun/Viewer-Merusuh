// server/routes/env.js
// Baca dan tulis .env dari dashboard UI
// Ini hanya berjalan di localhost — JANGAN expose ke internet publik

const router = require('express').Router()
const fs     = require('fs')
const path   = require('path')
const crypto = require('crypto')

// Saat dijalankan dari Electron: ENV_PATH di-set oleh main.js ke userData
// Saat dev normal: fallback ke root project
const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, '../../.env')
const ENV_EXAMPLE_PATH = path.join(__dirname, '../../.env.example')

// ── Definisi semua field yang dikelola ──────────────────────────────
// Ini yang tampil di UI — terurut dan berkategori
const ENV_SCHEMA = [
  {
    category: 'Server',
    icon: '🖥️',
    fields: [
      {
        key:         'PORT',
        label:       'Port Server',
        type:        'number',
        default:     '3000',
        placeholder: '3000',
        hint:        'Ganti jika port 3000 bentrok. Dashboard dev otomatis pakai PORT+1.',
        required:    true,
      },
      {
        key:         'NODE_ENV',
        label:       'Mode',
        type:        'select',
        options:     ['development', 'production'],
        default:     'development',
        hint:        'Development: test endpoint aktif, log verbose. Production: lebih ketat.',
        required:    true,
      },
    ],
  },
  {
    category: 'Saweria',
    icon: '🧋',
    fields: [
      {
        key:         'SAWERIA_STREAM_KEY',
        label:       'Stream Key',
        type:        'secret',
        placeholder: 'Ambil dari Saweria Dashboard → Stream Key',
        hint:        'Digunakan untuk validasi signature webhook. Biarkan kosong untuk skip validasi (dev only).',
        required:    false,
        testable:    true,
        testType:    'saweria',
      },
    ],
  },
  {
    category: 'Trakteer',
    icon: '☕',
    fields: [
      {
        key:         'TRAKTEER_API_KEY',
        label:       'API Key',
        type:        'secret',
        placeholder: 'Ambil dari Trakteer → Manage → Integration',
        hint:        'Digunakan untuk validasi header X-Api-Key dari webhook Trakteer.',
        required:    false,
        testable:    true,
        testType:    'trakteer',
      },
    ],
  },
  {
    category: 'AutoHotkey',
    icon: '🖱️',
    fields: [
      {
        key:         'AHK_EXE_PATH',
        label:       'Path AutoHotkey.exe',
        type:        'filepath',
        default:     'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
        placeholder: 'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
        hint:        'Path lengkap ke AutoHotkey v2. Sesuaikan jika instalasi di folder lain.',
        required:    false,
      },
    ],
  },
  {
    category: 'Plugin Native',
    icon: '🎮',
    fields: [
      {
        key:         'PLUGIN_SECRET',
        label:       'Plugin Secret',
        type:        'secret',
        placeholder: 'Opsional — biarkan kosong jika server hanya diakses lokal',
        hint:        'Jika diisi, plugin GTA5/BeamNG harus mengirim header X-Plugin-Secret yang sama.',
        required:    false,
      },
    ],
  },
  {
    category: 'Keamanan',
    icon: '🔒',
    fields: [
      {
        key:         'WEBHOOK_SECRET',
        label:       'Webhook Secret',
        type:        'secret',
        placeholder: 'Random string panjang untuk keamanan ekstra',
        hint:        'Digunakan sebagai lapisan keamanan tambahan untuk webhook.',
        required:    false,
      },
    ],
  },
  {
    category: 'Ngrok',
    icon: '🌐',
    fields: [
      {
        key:         'NGROK_AUTHTOKEN',
        label:       'Ngrok Authtoken',
        type:        'secret',
        placeholder: 'Ambil dari https://dashboard.ngrok.com/get-started/your-authtoken',
        hint:        'Token untuk ngrok tunnel built-in. Dikelola via halaman Konfigurasi.',
        required:    false,
      },
      {
        key:         'NGROK_AUTOSTART',
        label:       'Auto-connect Ngrok saat start',
        type:        'select',
        options:     ['false', 'true'],
        default:     'false',
        hint:        'Jika true, ngrok otomatis konek tiap kali server start (perlu NGROK_AUTHTOKEN terisi).',
        required:    false,
      },
    ],
  },
]

// ── Parse .env file ke object ────────────────────────────────────────
function parseEnvFile(content) {
  const result = {}
  const lines  = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key   = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    result[key] = value
  }
  return result
}

// ── Baca .env atau .env.example sebagai fallback ─────────────────────
function readEnv() {
  if (fs.existsSync(ENV_PATH)) {
    return parseEnvFile(fs.readFileSync(ENV_PATH, 'utf8'))
  }
  // .env belum ada — kembalikan defaults dari schema
  const defaults = {}
  for (const cat of ENV_SCHEMA) {
    for (const field of cat.fields) {
      if (field.default) defaults[field.key] = field.default
    }
  }
  return defaults
}

// ── Tulis object ke .env ─────────────────────────────────────────────
function writeEnv(data) {
  // Baca .env lama untuk preserve komentar & key yang tidak dikelola UI
  let existing = {}
  let rawLines = []

  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf8')
    existing = parseEnvFile(content)
    rawLines = content.split('\n')
  }

  // Merge: data baru override existing
  const merged = { ...existing, ...data }

  // Build file baru — preserve struktur dari schema
  const lines = [
    '# ================================================',
    '# Viewer Merusuh — Environment Configuration',
    '# Generated by Dashboard. Jangan share file ini!',
    `# Last updated: ${new Date().toLocaleString('id-ID')}`,
    '# ================================================',
    '',
  ]

  for (const cat of ENV_SCHEMA) {
    lines.push(`# ── ${cat.category} ${'─'.repeat(Math.max(0, 40 - cat.category.length))}`)
    for (const field of cat.fields) {
      if (field.hint) lines.push(`# ${field.hint}`)
      const val = merged[field.key] !== undefined ? merged[field.key] : (field.default || '')
      lines.push(`${field.key}=${val}`)
    }
    lines.push('')
  }

  // Tambahkan key lain yang tidak ada di schema (preserve)
  const schemaKeys = new Set(ENV_SCHEMA.flatMap(c => c.fields.map(f => f.key)))
  const extraKeys  = Object.keys(merged).filter(k => !schemaKeys.has(k))
  if (extraKeys.length) {
    lines.push('# ── Extra (preserved) ──────────────────────────────')
    for (const k of extraKeys) lines.push(`${k}=${merged[k]}`)
    lines.push('')
  }

  fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf8')
}

// ── Cari definisi field di schema berdasarkan key ────────────────────
function findField(key) {
  for (const cat of ENV_SCHEMA) {
    const f = cat.fields.find(f => f.key === key)
    if (f) return f
  }
  return null
}

// ────────────────────────────────────────────────────────────────────
// GET /api/env — baca semua nilai .env (secrets di-mask)
// ────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const data   = readEnv()
  const masked = {}

  for (const cat of ENV_SCHEMA) {
    for (const field of cat.fields) {
      const val = data[field.key] || ''
      if (field.type === 'secret' && val) {
        // Mask: tampilkan 4 karakter pertama + asterisk
        masked[field.key] = val.slice(0, 4) + '•'.repeat(Math.max(4, val.length - 4))
      } else {
        masked[field.key] = val
      }
    }
  }

  res.json({
    success: true,
    data:    masked,
    schema:  ENV_SCHEMA,
    envExists: fs.existsSync(ENV_PATH),
  })
})

// ────────────────────────────────────────────────────────────────────
// GET /api/env/reveal/:key — kirim nilai ASLI (tidak di-mask) satu field
// Dipakai tombol 👁️ di dashboard. Hanya boleh untuk key yang memang
// terdaftar di ENV_SCHEMA sebagai type 'secret' — mencegah endpoint ini
// disalahgunakan untuk baca sembarang env var.
// ────────────────────────────────────────────────────────────────────
router.get('/reveal/:key', (req, res) => {
  const field = findField(req.params.key)
  if (!field || field.type !== 'secret') {
    return res.status(400).json({ success: false, error: 'Field tidak ditemukan atau bukan secret field' })
  }
  const data = readEnv()
  res.json({ success: true, key: field.key, value: data[field.key] || '' })
})

// ────────────────────────────────────────────────────────────────────
// PUT /api/env — update .env
// Body: { KEY: 'value', ... }
// Khusus secret: jika value adalah masked (mengandung •) → skip (tidak overwrite)
// ────────────────────────────────────────────────────────────────────
router.put('/', (req, res) => {
  const incoming = req.body
  const existing = readEnv()
  const toWrite  = {}

  for (const cat of ENV_SCHEMA) {
    for (const field of cat.fields) {
      const newVal = incoming[field.key]
      if (newVal === undefined) continue

      if (field.type === 'secret' && newVal.includes('•')) {
        // User tidak mengubah secret — pakai yang lama
        toWrite[field.key] = existing[field.key] || ''
      } else {
        toWrite[field.key] = newVal
      }
    }
  }

  try {
    writeEnv(toWrite)
    res.json({ success: true, message: '.env berhasil disimpan. Restart server untuk menerapkan perubahan.' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ────────────────────────────────────────────────────────────────────
// POST /api/env/generate-secret — generate random secret string
// ────────────────────────────────────────────────────────────────────
router.post('/generate-secret', (req, res) => {
  const secret = crypto.randomBytes(32).toString('hex')
  res.json({ success: true, secret })
})

// ────────────────────────────────────────────────────────────────────
// POST /api/env/test — cek format value + kapan terakhir menerima
// webhook ASLI dari platform tsb (bukan simulasi Testing Area).
//
// CATATAN JUJUR: Saweria & Trakteer tidak menyediakan endpoint publik
// untuk "validasi key" secara langsung. Jadi ini BUKAN pengecekan live
// ke server mereka — ini adalah:
//   1) Cek format (menangkap kesalahan umum, misalnya paste URL utuh
//      alih-alih stream key-nya saja)
//   2) Cek riwayat: kapan terakhir kali donation_logs mencatat donasi
//      asli dari platform ini (bukti nyata bahwa key-nya benar-benar
//      berfungsi, karena webhook Saweria/Trakteer hanya akan diterima
//      kalau signature/header key-nya valid)
// Body: { key }
// ────────────────────────────────────────────────────────────────────
router.post('/test', (req, res) => {
  const { key } = req.body
  const field = findField(key)
  if (!field || !field.testable) {
    return res.status(400).json({ success: false, error: 'Field ini tidak punya test connection' })
  }

  const data  = readEnv()
  const value = data[field.key] || ''

  const format = checkFormat(field.testType, value)

  let lastReceived = null
  try {
    const { getDB } = require('../db/database')
    const db  = getDB()
    const row = db.prepare(
      `SELECT created_at, donator_name, amount FROM donation_logs
       WHERE platform = ? AND status != 'test'
       ORDER BY created_at DESC LIMIT 1`
    ).get(field.testType)
    if (row) lastReceived = row
  } catch (err) {
    // Kalau tabel/DB belum siap, jangan gagalkan seluruh request
    lastReceived = null
  }

  res.json({
    success: true,
    format,          // { valid: bool, message: string }
    lastReceived,    // { created_at, donator_name, amount } | null
  })
})

// ── Validasi format sesuai platform ───────────────────────────────────
function checkFormat(testType, value) {
  if (!value) {
    return { valid: false, message: 'Belum diisi.' }
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return {
      valid:   false,
      message: testType === 'saweria'
        ? 'Ini kelihatan seperti URL widget, bukan Stream Key. Ambil hanya bagian setelah "streamKey=" di URL tersebut.'
        : 'Ini kelihatan seperti URL, bukan API key.',
    }
  }
  if (testType === 'saweria') {
    // Stream key Saweria umumnya hex 32 karakter
    if (!/^[a-f0-9]{16,64}$/i.test(value)) {
      return { valid: false, message: 'Format tidak seperti Stream Key Saweria yang biasa (hex, 16–64 karakter).' }
    }
  }
  if (testType === 'trakteer') {
    if (value.length < 10) {
      return { valid: false, message: 'API Key Trakteer biasanya lebih panjang dari ini — cek lagi apakah ke-paste lengkap.' }
    }
  }
  return { valid: true, message: 'Format terlihat benar.' }
}

// ────────────────────────────────────────────────────────────────────
// GET /api/env/status — cek apakah .env sudah ada dan field wajib terisi
// ────────────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const data    = readEnv()
  const missing = []

  for (const cat of ENV_SCHEMA) {
    for (const field of cat.fields) {
      if (field.required && !data[field.key]) {
        missing.push({ key: field.key, label: field.label, category: cat.category })
      }
    }
  }

  res.json({
    success:   true,
    envExists: fs.existsSync(ENV_PATH),
    isReady:   missing.length === 0,
    missing,
    port:      data.PORT || '3000',
    nodeEnv:   data.NODE_ENV || 'development',
  })
})

module.exports = router
