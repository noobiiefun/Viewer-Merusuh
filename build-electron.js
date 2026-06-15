// build-electron.js
// Jalankan dari ROOT: node build-electron.js
//
// Output: dist-electron/
//   viewer-merusuh-setup-1.0.0.exe    <- installer
//   viewer-merusuh-1.0.0-portable.exe <- portable

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

function rmrf(dir) {
  if (!fs.existsSync(dir)) return
  if (process.platform === 'win32') {
    try { execSync(`rd /s /q "${dir}"`, { stdio: 'ignore' }) } catch {}
  } else {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// ── Baca versi Electron yang benar-benar terinstall ─────────────────
// Prioritas: electron/node_modules > root node_modules
function getInstalledElectronVersion() {
  const candidates = [
    path.join(ROOT, 'electron', 'node_modules', 'electron', 'package.json'),
    path.join(ROOT, 'node_modules', 'electron', 'package.json'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const ver = JSON.parse(fs.readFileSync(p)).version
      if (ver && !ver.startsWith('^') && !ver.startsWith('~')) {
        return ver
      }
    }
  }
  return null
}

// ── Patch electron-builder.config.js dengan versi exact ─────────────
function patchConfigVersion(electronVer) {
  const cfgPath = path.join(ROOT, 'electron-builder.config.js')
  let cfg = fs.readFileSync(cfgPath, 'utf8')

  // Ganti baris electronVersion dengan versi yang terinstall
  cfg = cfg.replace(
    /electronVersion:\s*['"][^'"]+['"]/,
    `electronVersion: '${electronVer}'`
  )
  fs.writeFileSync(cfgPath, cfg)
  ok(`electronVersion di-patch ke: ${electronVer}`)
}

// ── Patch kedua package.json dengan versi exact ──────────────────────
function pinElectronVersion(electronVer) {
  for (const pkgPath of [
    path.join(ROOT, 'package.json'),
    path.join(ROOT, 'electron', 'package.json'),
  ]) {
    if (!fs.existsSync(pkgPath)) continue
    const p = JSON.parse(fs.readFileSync(pkgPath))
    if (p.devDependencies?.electron) {
      p.devDependencies.electron = electronVer
      fs.writeFileSync(pkgPath, JSON.stringify(p, null, 2))
    }
  }
}

function ensureIcons() {
  const iconDir = path.join(ROOT, 'electron', 'assets')
  fs.mkdirSync(iconDir, { recursive: true })

  const PNG = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c6260000000000200014d79d3660000000049454e44ae426082',
    'hex'
  )
  const iconPng  = path.join(iconDir, 'icon.png')
  const iconIco  = path.join(iconDir, 'icon.ico')
  const trayIcon = path.join(iconDir, 'tray-icon.png')

  if (!fs.existsSync(iconPng))  { fs.writeFileSync(iconPng, PNG); warn('icon.png placeholder — ganti icon 256x256 untuk release!') }
  if (!fs.existsSync(iconIco))  { fs.copyFileSync(iconPng, iconIco) }
  if (!fs.existsSync(trayIcon)) { fs.copyFileSync(iconPng, trayIcon) }
}

async function main() {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   🎮  Viewer Merusuh — Build Electron v${VERSION}      ║
  ╚══════════════════════════════════════════════════════╝
  `)

  // ── Step 0: Validasi ──────────────────────────────────────────────
  log('0/5', 'Validasi konfigurasi...')
  if (pkg.main !== 'electron/main.js') {
    fail(`package.json "main" harus "electron/main.js", saat ini: "${pkg.main}"`)
  }
  if (!fs.existsSync(path.join(ROOT, 'electron', 'main.js'))) {
    fail('electron/main.js tidak ditemukan!')
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

  // ── Step 2: Assets ────────────────────────────────────────────────
  log('2/5', 'Mempersiapkan assets...')
  ensureIcons()
  ok('Assets siap')

  // ── Step 3: Install electron devDeps ─────────────────────────────
  log('3/5', 'Install Electron devDependencies...')
  const electronDir = path.join(ROOT, 'electron')
  const electronNM  = path.join(electronDir, 'node_modules')

  // Cek apakah electron-builder sudah versi 26+
  const ebPkg = path.join(electronNM, 'electron-builder', 'package.json')
  if (fs.existsSync(ebPkg)) {
    const ebVer = JSON.parse(fs.readFileSync(ebPkg)).version
    const major = parseInt(ebVer.split('.')[0])
    if (major < 26) {
      console.log(`  electron-builder v${ebVer} terlalu lama, install ulang...`)
      rmrf(electronNM)
    } else {
      console.log(`  electron-builder v${ebVer} OK`)
    }
  }

  if (!fs.existsSync(electronNM)) {
    run('npm install --ignore-scripts', electronDir)
  }
  ok('Electron devDependencies siap')

  // ── Step 4: Detect + patch versi Electron exact ───────────────────
  log('4/5', 'Deteksi versi Electron dan rebuild native modules...')

  let electronVer = getInstalledElectronVersion()
  if (!electronVer) {
    warn('Versi Electron tidak terdeteksi dari node_modules, pakai default 28.3.3')
    electronVer = '28.3.3'
  }
  console.log(`  Electron terinstall: v${electronVer}`)

  // Patch config dan package.json agar pakai versi exact
  patchConfigVersion(electronVer)
  pinElectronVersion(electronVer)

  // Rebuild better-sqlite3 untuk ABI Electron
  const rebuildBin = path.join(electronNM, '.bin',
    process.platform === 'win32' ? 'electron-rebuild.cmd' : 'electron-rebuild')

  if (fs.existsSync(rebuildBin)) {
    try {
      run(`"${rebuildBin}" -f -w better-sqlite3 -v ${electronVer}`, ROOT)
      ok('better-sqlite3 di-rebuild untuk Electron')
    } catch (e) {
      warn(`Rebuild gagal (${e.message}) — app mungkin perlu dijalankan sekali untuk auto-rebuild`)
    }
  } else {
    warn('electron-rebuild tidak ditemukan — skip')
  }

  // ── Step 5: Build .exe ────────────────────────────────────────────
  log('5/5', 'Build installer dan portable .exe...')
  console.log('  (Butuh beberapa menit — download Electron runtime ~80MB pertama kali)\n')

  const builderBin = path.join(electronNM, '.bin',
    process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder')

  if (!fs.existsSync(builderBin)) {
    fail(`electron-builder tidak ditemukan di:\n  ${builderBin}`)
  }

  run(`"${builderBin}" build --win --config electron-builder.config.js`, ROOT)

  // ── Hasil ──────────────────────────────────────────────────────────
  const distDir = path.join(ROOT, 'dist-electron')
  let outputFiles = []
  if (fs.existsSync(distDir)) {
    outputFiles = fs.readdirSync(distDir)
      .filter(f => f.endsWith('.exe'))
      .map(f => {
        const mb = (fs.statSync(path.join(distDir, f)).size / 1024 / 1024).toFixed(1)
        return `  ║   📦 ${f} (${mb}MB)`
      })
  }

  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   ✅  Build selesai!                                 ║
  ╠══════════════════════════════════════════════════════╣
${outputFiles.join('\n') || '  ║   Output: dist-electron/'}
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
