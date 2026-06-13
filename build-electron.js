// build-electron.js
// Jalankan: node build-electron.js
// Build urutan:
//   1. Build dashboard React (npm run build di /dashboard)
//   2. Copy semua file server ke folder electron untuk di-bundle
//   3. Jalankan electron-builder → hasilkan .exe installer + portable
//
// Output di: dist-electron/
//   viewer-merusuh-setup-1.0.0.exe   ← installer (next-next-finish)
//   viewer-merusuh-1.0.0-portable.exe ← portable (langsung jalankan)

const { execSync } = require('child_process')
const fs           = require('fs')
const path         = require('path')

const ROOT    = __dirname
const pkg     = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json')))
const VERSION = pkg.version

function log(step, msg) {
  console.log(`\n  [${step}] ${msg}`)
}

function run(cmd, cwd = ROOT) {
  console.log(`  $ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd })
}

async function main() {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   🎮  Viewer Merusuh — Build Electron v${VERSION}      ║
  ╚══════════════════════════════════════════════════════╝
  `)

  // ── Step 1: Build dashboard React ──────────────────────────────────
  log('1/4', 'Build dashboard React...')
  const dashSrc  = path.join(ROOT, 'dashboard')
  const dashDist = path.join(dashSrc, 'dist')

  if (!fs.existsSync(path.join(dashSrc, 'node_modules'))) {
    run('npm install', dashSrc)
  }
  run('npm run build', dashSrc)

  if (!fs.existsSync(path.join(dashDist, 'index.html'))) {
    throw new Error('Dashboard build gagal — dist/index.html tidak ditemukan')
  }
  console.log('  ✅ Dashboard berhasil di-build')

  // ── Step 2: Pastikan icon tersedia ─────────────────────────────────
  log('2/4', 'Mempersiapkan assets...')
  const iconDir = path.join(ROOT, 'electron', 'assets')
  fs.mkdirSync(iconDir, { recursive: true })

  // Buat placeholder PNG jika tidak ada (developer harus replace dengan icon asli)
  const iconPng = path.join(iconDir, 'icon.png')
  const iconIco = path.join(iconDir, 'icon.ico')

  if (!fs.existsSync(iconPng)) {
    console.log('  ⚠️  icon.png tidak ditemukan — menggunakan placeholder')
    console.log('     Untuk release: replace electron/assets/icon.png dengan icon 256x256px')
    // Buat 1x1 PNG transparan sebagai placeholder
    const PNG_1X1 = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
      '0000000a49444154789c6260000000000200014d79d3660000000049454e44ae426082',
      'hex'
    )
    fs.writeFileSync(iconPng, PNG_1X1)
  }

  if (!fs.existsSync(iconIco)) {
    console.log('  ⚠️  icon.ico tidak ditemukan — copy dari icon.png')
    fs.copyFileSync(iconPng, iconIco)
  }

  const trayIcon = path.join(iconDir, 'tray-icon.png')
  if (!fs.existsSync(trayIcon)) {
    fs.copyFileSync(iconPng, trayIcon)
  }

  console.log('  ✅ Assets siap')

  // ── Step 3: Install Electron dependencies ──────────────────────────
  log('3/4', 'Install Electron dependencies...')
  const electronDir = path.join(ROOT, 'electron')

  if (!fs.existsSync(path.join(electronDir, 'node_modules'))) {
    run('npm install', electronDir)
  } else {
    console.log('  ✅ Electron dependencies sudah terinstall')
  }

  // ── Step 4: Build dengan electron-builder ──────────────────────────
  log('4/4', 'Build installer dan portable .exe...')
  console.log('  (Ini mungkin butuh beberapa menit — perlu download Electron runtime)')

  // electron-builder dijalankan dari folder electron/
  // karena package.json dan build config ada di sana
  run('npx electron-builder build --win --config', electronDir)

  // ── Hasil ─────────────────────────────────────────────────────────
  const distDir   = path.join(electronDir, 'dist-electron')
  let outputFiles = []
  if (fs.existsSync(distDir)) {
    outputFiles = fs.readdirSync(distDir)
      .filter(f => f.endsWith('.exe'))
      .map(f => ({
        name: f,
        size: (fs.statSync(path.join(distDir, f)).size / 1024 / 1024).toFixed(1) + 'MB',
      }))
  }

  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   ✅  Build selesai!                                 ║
  ╠══════════════════════════════════════════════════════╣`)

  if (outputFiles.length) {
    outputFiles.forEach(f => {
      console.log(`  ║   📦 ${f.name.padEnd(38)} (${f.size}) ║`)
    })
  } else {
    console.log(`  ║   Output: electron/dist-electron/                   ║`)
  }

  console.log(`  ╠══════════════════════════════════════════════════════╣
  ║   Upload ke GitHub Releases:                         ║
  ║   → viewer-merusuh-setup-${VERSION}.exe  (installer)    ║
  ║   → viewer-merusuh-${VERSION}-portable.exe             ║
  ╚══════════════════════════════════════════════════════╝
  `)
}

main().catch(err => {
  console.error('\n  ❌ Build error:', err.message)
  process.exit(1)
})
