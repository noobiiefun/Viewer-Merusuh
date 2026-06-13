// installer/postinstall.js
// Dijalankan otomatis setelah `npm install`
// Tugasnya: cek apakah ini first-time install, kalau iya jalankan setup

const fs   = require('fs')
const path = require('path')

const ROOT    = path.join(__dirname, '..')
const DB_PATH = path.join(ROOT, 'viewer-merusuh.db')

// Skip jika sudah pernah setup (DB sudah ada)
if (fs.existsSync(DB_PATH)) {
  process.exit(0)
}

// Skip di CI environment
if (process.env.CI || process.env.GITHUB_ACTIONS) {
  process.exit(0)
}

// First-time install — init DB
console.log('\n  🎮 Viewer Merusuh: Inisialisasi database pertama kali...')
try {
  require(path.join(ROOT, 'server/db/setup.js'))
} catch (e) {
  // setup.js mungkin exit — tidak masalah
}
