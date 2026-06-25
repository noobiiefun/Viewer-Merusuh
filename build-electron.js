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

  const iconPng  = path.join(iconDir, 'icon.png')
  const iconIco  = path.join(iconDir, 'icon.ico')
  const trayIcon = path.join(iconDir, 'tray-icon.png')

  // Cek apakah icon.ico sudah valid (header ICO = 00 00 01 00)
  const icoValid = (() => {
    if (!fs.existsSync(iconIco)) return false
    const buf = fs.readFileSync(iconIco)
    return buf.length > 4 && buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0
  })()

  if (icoValid && fs.existsSync(iconPng)) {
    ok('Icon sudah ada dan valid')
    return
  }

  warn('Membuat icon placeholder — ganti electron/assets/icon.png & icon.ico untuk release!')
  generateIcons(iconPng, iconIco, trayIcon)
}

function generateIcons(iconPng, iconIco, trayIcon) {
  // Buat PNG sederhana solid purple (#7c3aed = rgb 124,58,237) via raw bytes
  function makePng(size) {
    const zlib = require('zlib')
    function chunk(type, data) {
      const buf = Buffer.concat([Buffer.from(type), data])
      const crc  = Buffer.alloc(4)
      crc.writeUInt32BE(require('crc-32') ? 0 : crcTable(buf), 0)
      const len  = Buffer.alloc(4)
      len.writeUInt32BE(data.length, 0)
      // Hitung CRC manual
      let c = 0xFFFFFFFF
      for (const b of buf) {
        c = (c >>> 8) ^ crcLut[(c ^ b) & 0xFF]
      }
      c = (c ^ 0xFFFFFFFF) >>> 0
      crc.writeUInt32BE(c, 0)
      return Buffer.concat([len, buf, crc])
    }

    // Init CRC lookup table
    const crcLut = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      crcLut[i] = c
    }

    // IHDR
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(size, 0)
    ihdr.writeUInt32BE(size, 4)
    ihdr[8] = 8; ihdr[9] = 2  // bit depth=8, color type=RGB

    // Raw image data: tiap baris = filter(0) + RGB pixels
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0  // filter none
    for (let i = 0; i < size; i++) { row[1+i*3]=124; row[2+i*3]=58; row[3+i*3]=237 }
    const rawData = Buffer.concat(Array(size).fill(row))
    const compressed = zlib.deflateSync(rawData)

    const sig = Buffer.from([137,80,78,71,13,10,26,10])
    return Buffer.concat([
      sig,
      chunk('IHDR', ihdr),
      chunk('IDAT', compressed),
      chunk('IEND', Buffer.alloc(0)),
    ])
  }

  const sizes = [16, 32, 48, 256]
  const pngs  = sizes.map(s => makePng(s))

  // ICO file format
  const count  = sizes.length
  let offset   = 6 + count * 16
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)  // reserved
  header.writeUInt16LE(1, 2)  // type: ICO
  header.writeUInt16LE(count, 4)

  const entries = Buffer.alloc(count * 16)
  pngs.forEach((png, i) => {
    const w = sizes[i] >= 256 ? 0 : sizes[i]
    const e = entries.slice(i * 16)
    e[0] = w; e[1] = w; e[2] = 0; e[3] = 0
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png.length
  })

  const icoData = Buffer.concat([header, entries, ...pngs])
  fs.writeFileSync(iconIco, icoData)
  fs.writeFileSync(iconPng, pngs[3])   // 256x256
  fs.writeFileSync(trayIcon, pngs[0])  // 16x16
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

  // better-sqlite3 v12+ punya prebuilt binary untuk semua Node.js versi (termasuk v24)
  // electron-builder akan otomatis download prebuilt yang sesuai saat build
  // TIDAK perlu Visual Studio / node-gyp compile manual
  ok('better-sqlite3 v12 — prebuilt binary akan didownload otomatis saat build')

  // ── Step 5: Build .exe ────────────────────────────────────────────
  log('5/5', 'Build installer dan portable .exe...')
  console.log('  (Butuh beberapa menit — download Electron runtime ~80MB pertama kali)\n')

  const builderBin = path.join(electronNM, '.bin',
    process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder')

  if (!fs.existsSync(builderBin)) {
    fail(`electron-builder tidak ditemukan di:\n  ${builderBin}`)
  }

  // Set env agar electron-builder tidak stop saat rebuild gagal
  process.env.ELECTRON_BUILDER_CACHE = path.join(ROOT, '.electron-builder-cache')
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
