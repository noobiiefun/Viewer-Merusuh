// build-electron.js
// Jalankan dari ROOT: node build-electron.js
//
// Output: dist-electron/
//   viewer-merusuh-setup-1.0.0.exe    <- installer (next-next-finish)
//   viewer-merusuh-1.0.0-portable.exe <- portable (langsung jalankan)

const { execSync } = require('child_process')
const fs           = require('fs')
const path         = require('path')

const ROOT    = __dirname
const pkg     = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json')))
const VERSION = pkg.version

function log(step, msg) { console.log(`\n  [${step}] ${msg}`) }
function ok(msg)        { console.log(`  ✅ ${msg}`) }
function warn(msg)      { console.log(`  ⚠️  ${msg}`) }
function fail(msg)      { console.error(`  ❌ ${msg}`); process.exit(1) }

function run(cmd, cwd = ROOT) {
  console.log(`  $ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd })
}

// Hapus folder secara rekursif (Windows-safe)
function rmrf(dir) {
  if (!fs.existsSync(dir)) return
  if (process.platform === 'win32') {
    execSync(`rd /s /q "${dir}"`, { stdio: 'ignore' })
  } else {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function ensureIcons() {
  const iconDir = path.join(ROOT, 'electron', 'assets')
  fs.mkdirSync(iconDir, { recursive: true })

  // 1x1 transparan PNG sebagai placeholder
  const PNG = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c6260000000000200014d79d3660000000049454e44ae426082',
    'hex'
  )

  const iconPng  = path.join(iconDir, 'icon.png')
  const iconIco  = path.join(iconDir, 'icon.ico')
  const trayIcon = path.join(iconDir, 'tray-icon.png')

  if (!fs.existsSync(iconPng))  { fs.writeFileSync(iconPng, PNG); warn('icon.png placeholder — ganti dengan icon 256x256 asli!') }
  if (!fs.existsSync(iconIco))  { fs.copyFileSync(iconPng, iconIco); warn('icon.ico copy dari placeholder') }
  if (!fs.existsSync(trayIcon)) { fs.copyFileSync(iconPng, trayIcon) }
}

function checkMainField() {
  // electron-builder membaca "main" dari root package.json
  if (pkg.main !== 'electron/main.js') {
    fail(`package.json "main" harus "electron/main.js", saat ini: "${pkg.main}"`)
  }
  ok(`package.json "main" = "${pkg.main}"`)
}

async function main() {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   🎮  Viewer Merusuh — Build Electron v${VERSION}      ║
  ╚══════════════════════════════════════════════════════╝
  `)

  // ── Step 0: Validasi ─────────────────────────────────────────────
  log('0/5', 'Validasi konfigurasi...')
  checkMainField()

  if (!fs.existsSync(path.join(ROOT, 'electron', 'main.js'))) {
    fail('electron/main.js tidak ditemukan!')
  }
  if (!fs.existsSync(path.join(ROOT, 'electron-builder.config.js'))) {
    fail('electron-builder.config.js tidak ditemukan!')
  }
  ok('Konfigurasi valid')

  // ── Step 1: Build dashboard ───────────────────────────────────────
  log('1/5', 'Build dashboard React...')
  const dashDir  = path.join(ROOT, 'dashboard')
  const dashDist = path.join(dashDir, 'dist', 'index.html')

  if (!fs.existsSync(path.join(dashDir, 'node_modules'))) {
    run('npm install', dashDir)
  }
  run('npm run build', dashDir)

  if (!fs.existsSync(dashDist)) {
    fail('Dashboard build gagal — dist/index.html tidak ditemukan')
  }
  ok('Dashboard berhasil di-build')

  // ── Step 2: Icon ─────────────────────────────────────────────────
  log('2/5', 'Mempersiapkan assets...')
  ensureIcons()
  ok('Assets siap')

  // ── Step 3: Install electron + electron-builder ───────────────────
  log('3/5', 'Install Electron devDependencies...')
  const electronDir = path.join(ROOT, 'electron')
  const electronNM  = path.join(electronDir, 'node_modules')

  // Jika ada sisa dari install sebelumnya, hapus dulu
  // agar dapat versi electron-builder yang benar (v26)
  const ebPath = path.join(electronNM, 'electron-builder', 'package.json')
  if (fs.existsSync(ebPath)) {
    const ebVer = JSON.parse(fs.readFileSync(ebPath)).version
    if (!ebVer.startsWith('26') && !ebVer.startsWith('25')) {
      console.log(`  Versi lama electron-builder (${ebVer}) ditemukan, hapus dan install ulang...`)
      rmrf(electronNM)
    } else {
      console.log(`  electron-builder v${ebVer} sudah terinstall`)
    }
  }

  if (!fs.existsSync(electronNM)) {
    // --ignore-scripts: cegah native module compile di sini
    run('npm install --ignore-scripts', electronDir)
  }
  ok('Electron devDependencies siap')

  // ── Step 4: Rebuild better-sqlite3 untuk Electron ─────────────────
  // better-sqlite3 harus di-rebuild khusus untuk versi Node yang ada di Electron
  // bukan untuk Node.js yang ada di sistem
  log('4/5', 'Rebuild native module untuk Electron...')

  const electronVersion = (() => {
    try {
      const ePkg = path.join(electronNM, 'electron', 'package.json')
      return JSON.parse(fs.readFileSync(ePkg)).version
    } catch { return null }
  })()

  if (electronVersion) {
    console.log(`  Electron version: v${electronVersion}`)
    try {
      // electron-rebuild compile ulang better-sqlite3 untuk ABI Electron
      const rebuildBin = path.join(electronNM, '.bin',
        process.platform === 'win32' ? 'electron-rebuild.cmd' : 'electron-rebuild')

      if (fs.existsSync(rebuildBin)) {
        run(`"${rebuildBin}" -f -w better-sqlite3 -v ${electronVersion}`, ROOT)
        ok('better-sqlite3 berhasil di-rebuild untuk Electron')
      } else {
        // Fallback: pakai @electron/rebuild
        run(`npx --prefix "${electronDir}" @electron/rebuild -f -w better-sqlite3 -v ${electronVersion}`, ROOT)
        ok('better-sqlite3 berhasil di-rebuild (via npx)')
      }
    } catch (e) {
      warn(`Rebuild better-sqlite3 gagal: ${e.message}`)
      warn('App mungkin crash saat pertama dijalankan. Lihat docs/BUILD_ELECTRON.md.')
    }
  } else {
    warn('Tidak bisa deteksi versi Electron — skip rebuild better-sqlite3')
  }

  // ── Step 5: Build .exe ────────────────────────────────────────────
  log('5/5', 'Build installer dan portable .exe...')
  console.log('  (Butuh beberapa menit — download Electron runtime ~80MB pertama kali)\n')

  const builderBin = path.join(electronNM, '.bin',
    process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder')

  if (!fs.existsSync(builderBin.replace('.cmd', '').replace(/\.cmd$/, '') + (process.platform === 'win32' ? '.cmd' : ''))) {
    if (!fs.existsSync(builderBin)) {
      fail(`electron-builder tidak ditemukan di ${builderBin}`)
    }
  }

  run(`"${builderBin}" build --win --config electron-builder.config.js`, ROOT)

  // ── Hasil ──────────────────────────────────────────────────────────
  const distDir = path.join(ROOT, 'dist-electron')
  let files = []
  if (fs.existsSync(distDir)) {
    files = fs.readdirSync(distDir)
      .filter(f => f.endsWith('.exe'))
      .map(f => {
        const sizeMB = (fs.statSync(path.join(distDir, f)).size / 1024 / 1024).toFixed(1)
        return `  ║   📦 ${f} (${sizeMB}MB)`
      })
  }

  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   ✅  Build selesai!                                 ║
  ╠══════════════════════════════════════════════════════╣
${files.join('\n') || '  ║   Output: dist-electron/'}
  ╠══════════════════════════════════════════════════════╣
  ║   Upload ke GitHub Releases:                         ║
  ║   → viewer-merusuh-setup-${VERSION}.exe              ║
  ║   → viewer-merusuh-${VERSION}-portable.exe           ║
  ╚══════════════════════════════════════════════════════╝
  `)
}

main().catch(err => {
  console.error('\n  ❌ Build error:', err.message)
  console.error('\n  Lihat docs/BUILD_ELECTRON.md untuk troubleshooting')
  process.exit(1)
})
