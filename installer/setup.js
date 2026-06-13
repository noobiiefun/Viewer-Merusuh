// installer/setup.js
// Auto-setup script — dijalankan saat pertama kali install
// Dipanggil oleh SETUP.bat

const fs   = require('fs')
const path = require('path')

const ROOT     = path.join(__dirname, '..')
const DB_PATH  = path.join(ROOT, 'viewer-merusuh.db')
const ENV_PATH = path.join(ROOT, '.env')
const ENV_EX   = path.join(ROOT, '.env.example')

function log(emoji, msg) {
  console.log(`  ${emoji}  ${msg}`)
}

function header(msg) {
  console.log(`\n  ── ${msg} ──`)
}

async function run() {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║       🎮  VIEWER MERUSUH — Auto Setup         ║
  ╚═══════════════════════════════════════════════╝
  `)

  // ── 1. Cek .env ────────────────────────────────────────────────────
  header('Konfigurasi')
  if (!fs.existsSync(ENV_PATH)) {
    if (fs.existsSync(ENV_EX)) {
      fs.copyFileSync(ENV_EX, ENV_PATH)
      log('✅', 'File .env dibuat dari template')
    } else {
      // Buat minimal .env
      fs.writeFileSync(ENV_PATH, [
        '# Viewer Merusuh — Konfigurasi',
        'PORT=3000',
        'NODE_ENV=development',
        'SAWERIA_STREAM_KEY=',
        'TRAKTEER_API_KEY=',
        'AHK_EXE_PATH=C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
        'PLUGIN_SECRET=',
      ].join('\n'))
      log('✅', '.env minimal dibuat')
    }
  } else {
    log('✅', '.env sudah ada — skip')
  }

  // ── 2. Init database ───────────────────────────────────────────────
  header('Database')
  if (!fs.existsSync(DB_PATH)) {
    try {
      require(path.join(ROOT, 'server/db/setup.js'))
    } catch (e) {
      // setup.js memanggil process.exit — ini normal
    }
  } else {
    log('✅', 'Database sudah ada — skip')
  }

  // ── 3. Cek dashboard build ─────────────────────────────────────────
  header('Dashboard')
  const distIndex = path.join(ROOT, 'dashboard/dist/index.html')
  if (!fs.existsSync(distIndex)) {
    log('⚠️', 'Dashboard belum di-build. Jalankan: npm run build')
  } else {
    log('✅', 'Dashboard build sudah ada')
  }

  // ── 4. Tampilkan ringkasan ─────────────────────────────────────────
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   ✅  Setup selesai!                          ║
  ╠═══════════════════════════════════════════════╣
  ║   Jalankan: npm start                         ║
  ║   Atau klik: START.bat                        ║
  ╚═══════════════════════════════════════════════╝
  `)
}

run().catch(err => {
  console.error('\n  ❌ Setup error:', err.message)
  process.exit(1)
})
