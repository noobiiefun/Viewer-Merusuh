// build-electron.js
// Jalankan dari ROOT: node build-electron.js
//
// Urutan build:
//   1. Build dashboard React
//   2. Siapkan assets (icon placeholder)
//   3. Install electron + electron-builder di folder electron/ (devDeps only)
//   4. Jalankan electron-builder dari ROOT → pakai node_modules ROOT
//      (better-sqlite3 tidak perlu compile ulang!)
//
// Output: dist-electron/
//   viewer-merusuh-setup-1.0.0.exe    ← installer
//   viewer-merusuh-1.0.0-portable.exe ← portable

const { execSync } = require('child_process')
const fs           = require('fs')
const path         = require('path')

const ROOT    = __dirname
const pkg     = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json')))
const VERSION = pkg.version

function log(step, msg) { console.log(`\n  [${step}] ${msg}`) }
function ok(msg)        { console.log(`  ✅ ${msg}`) }
function warn(msg)      { console.log(`  ⚠️  ${msg}`) }

function run(cmd, cwd = ROOT, opts = {}) {
  console.log(`  $ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd, ...opts })
}

function ensureIcon() {
  const iconDir = path.join(ROOT, 'electron', 'assets')
  fs.mkdirSync(iconDir, { recursive: true })

  const iconPng  = path.join(iconDir, 'icon.png')
  const iconIco  = path.join(iconDir, 'icon.ico')
  const trayIcon = path.join(iconDir, 'tray-icon.png')

  // Placeholder PNG 1x1 transparan
  const PNG_PLACEHOLDER = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a' +
    '49444154789c6260000000000200014d79d3660000000049454e44ae426082', 'hex'
  )

  if (!fs.existsSync(iconPng)) {
    fs.writeFileSync(iconPng, PNG_PLACEHOLDER)
    warn('icon.png tidak ada — pakai placeholder. Ganti dengan icon 256x256 untuk release!')
  }
  if (!fs.existsSync(iconIco)) {
    fs.copyFileSync(iconPng, iconIco)
    warn('icon.ico tidak ada — copy dari icon.png')
  }
  if (!fs.existsSync(trayIcon)) {
    fs.copyFileSync(iconPng, trayIcon)
  }
}

async function main() {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   🎮  Viewer Merusuh — Build Electron v${VERSION}      ║
  ╚══════════════════════════════════════════════════════╝
  `)

  // ── Step 1: Build dashboard ───────────────────────────────────────
  log('1/4', 'Build dashboard React...')
  const dashSrc  = path.join(ROOT, 'dashboard')
  const dashDist = path.join(dashSrc, 'dist', 'index.html')

  if (!fs.existsSync(path.join(dashSrc, 'node_modules'))) {
    run('npm install', dashSrc)
  }
  run('npm run build', dashSrc)

  if (!fs.existsSync(dashDist)) {
    throw new Error('Dashboard build gagal — dist/index.html tidak ditemukan')
  }
  ok('Dashboard berhasil di-build')

  // ── Step 2: Siapkan assets ────────────────────────────────────────
  log('2/4', 'Mempersiapkan assets...')
  ensureIcon()
  ok('Assets siap')

  // ── Step 3: Install HANYA electron + electron-builder di subfolder ─
  log('3/4', 'Install Electron devDependencies...')
  const electronDir = path.join(ROOT, 'electron')

  // Hapus node_modules electron dulu jika ada (cegah konflik)
  const electronNM = path.join(electronDir, 'node_modules')
  if (fs.existsSync(electronNM)) {
    console.log('  node_modules electron sudah ada, skip install')
  } else {
    // Install HANYA devDependencies (electron + electron-builder)
    // --ignore-scripts penting: cegah better-sqlite3 compile di sini
    run('npm install --ignore-scripts', electronDir)
  }
  ok('Electron devDependencies siap')

  // ── Step 4: Build .exe dari ROOT ──────────────────────────────────
  log('4/4', 'Build installer dan portable .exe...')
  console.log('  (Butuh beberapa menit — download Electron runtime ~80MB)\n')

  // electron-builder dijalankan dari ROOT agar pakai node_modules root
  // --config menunjuk ke electron-builder.config.js di root
  // npx dijalankan dari folder electron/ agar pakai electron-builder yang ada di sana
  const builderBin = path.join(electronDir, 'node_modules', '.bin', 'electron-builder')
  const builderCmd = process.platform === 'win32'
    ? `"${builderBin}.cmd" build --win --config electron-builder.config.js`
    : `"${builderBin}" build --win --config electron-builder.config.js`

  run(builderCmd, ROOT)

  // ── Hasil ──────────────────────────────────────────────────────────
  const distDir = path.join(ROOT, 'dist-electron')
  let files = []
  if (fs.existsSync(distDir)) {
    files = fs.readdirSync(distDir)
      .filter(f => f.endsWith('.exe') || f.endsWith('.dmg') || f.endsWith('.AppImage'))
      .map(f => {
        const size = (fs.statSync(path.join(distDir, f)).size / 1024 / 1024).toFixed(1)
        return `   📦 ${f} (${size}MB)`
      })
  }

  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   ✅  Build selesai!                                 ║
  ╠══════════════════════════════════════════════════════╣
${files.map(f => `  ║ ${f.padEnd(52)} ║`).join('\n')}
  ╠══════════════════════════════════════════════════════╣
  ║   Upload ke GitHub Releases:                         ║
  ║   viewer-merusuh-setup-${VERSION}.exe   ← installer  ║
  ║   viewer-merusuh-${VERSION}-portable.exe             ║
  ╚══════════════════════════════════════════════════════╝
  `)
}

main().catch(err => {
  console.error('\n  ❌ Build error:', err.message)
  console.error('\n  Lihat docs/BUILD_ELECTRON.md untuk troubleshooting')
  process.exit(1)
})
