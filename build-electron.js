// build-electron.js
// Jalankan dari ROOT: node build-electron.js

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

function run(cmd, cwd = ROOT, extraEnv = {}) {
  console.log(`  $ ${cmd}`)
  execSync(cmd, {
    stdio: 'inherit',
    cwd,
    env: { ...process.env, ...extraEnv },
  })
}

function rmrf(dir) {
  if (!fs.existsSync(dir)) return
  if (process.platform === 'win32') {
    try { execSync(`rd /s /q "${dir}"`, { stdio: 'ignore' }) } catch {}
  } else {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function ensureIcons() {
  const iconDir = path.join(ROOT, 'electron', 'assets')
  fs.mkdirSync(iconDir, { recursive: true })

  const iconPng  = path.join(iconDir, 'icon.png')
  const iconIco  = path.join(iconDir, 'icon.ico')
  const trayIcon = path.join(iconDir, 'tray-icon.png')

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
  function makePng(size) {
    const zlib = require('zlib')
    const crcLut = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      crcLut[i] = c
    }
    function chunk(type, data) {
      const buf = Buffer.concat([Buffer.from(type), data])
      let c = 0xFFFFFFFF
      for (const b of buf) c = (c >>> 8) ^ crcLut[(c ^ b) & 0xFF]
      c = (c ^ 0xFFFFFFFF) >>> 0
      const crc = Buffer.alloc(4); crc.writeUInt32BE(c, 0)
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
      return Buffer.concat([len, buf, crc])
    }
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
    ihdr[8] = 8; ihdr[9] = 2
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0
    for (let i = 0; i < size; i++) { row[1+i*3]=124; row[2+i*3]=58; row[3+i*3]=237 }
    const rawData = Buffer.concat(Array(size).fill(row))
    const compressed = zlib.deflateSync(rawData)
    const sig = Buffer.from([137,80,78,71,13,10,26,10])
    return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
  }

  const sizes = [16, 32, 48, 256]
  const pngs  = sizes.map(s => makePng(s))
  const count  = sizes.length
  let offset   = 6 + count * 16
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4)
  const entries = Buffer.alloc(count * 16)
  pngs.forEach((png, i) => {
    const w = sizes[i] >= 256 ? 0 : sizes[i]
    const e = entries.slice(i * 16)
    e[0] = w; e[1] = w; e[2] = 0; e[3] = 0
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6)
    e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12)
    offset += png.length
  })
  const icoData = Buffer.concat([header, entries, ...pngs])
  fs.writeFileSync(iconIco, icoData)
  fs.writeFileSync(iconPng, pngs[3])
  fs.writeFileSync(trayIcon, pngs[0])
}

function checkMainField() {
  if (pkg.main !== 'electron/main.js') {
    fail(`package.json "main" harus "electron/main.js", saat ini: "${pkg.main}"`)
  }
  ok(`package.json "main" = "${pkg.main}"`)
}

// ── Validasi config punya npmRebuild: false ─────────────────────────
function checkConfigHasNoRebuild() {
  const cfgPath = path.join(ROOT, 'electron-builder.config.js')
  const content = fs.readFileSync(cfgPath, 'utf8')

  if (!content.includes('npmRebuild') || !content.includes('false')) {
    fail([
      'electron-builder.config.js TIDAK punya "npmRebuild: false"!',
      'Ini akan menyebabkan electron-builder mencoba compile better-sqlite3',
      'dan GAGAL tanpa Visual Studio. Tambahkan baris ini ke config:',
      '',
      '  npmRebuild: false,',
      '  buildDependenciesFromSource: false,',
      '  nodeGypRebuild: false,',
    ].join('\n  '))
  }
  ok('Config sudah punya npmRebuild: false (skip native rebuild)')
}

async function main() {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   🎮  Viewer Merusuh — Build Electron v${VERSION}      ║
  ╚══════════════════════════════════════════════════════╝
  `)

  log('0/5', 'Validasi konfigurasi...')
  checkMainField()
  if (!fs.existsSync(path.join(ROOT, 'electron', 'main.js'))) {
    fail('electron/main.js tidak ditemukan!')
  }
  if (!fs.existsSync(path.join(ROOT, 'electron-builder.config.js'))) {
    fail('electron-builder.config.js tidak ditemukan!')
  }
  checkConfigHasNoRebuild()
  ok('Konfigurasi valid')

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

  log('2/5', 'Mempersiapkan assets...')
  ensureIcons()
  ok('Assets siap')

  log('3/5', 'Install Electron devDependencies...')
  const electronDir = path.join(ROOT, 'electron')
  const electronNM  = path.join(electronDir, 'node_modules')
  const ebPath = path.join(electronNM, 'electron-builder', 'package.json')
  if (fs.existsSync(ebPath)) {
    const ebVer = JSON.parse(fs.readFileSync(ebPath)).version
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

  log('4/5', 'Verifikasi better-sqlite3 prebuilt binary...')
  const sqliteBin = path.join(ROOT, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node')
  if (fs.existsSync(sqliteBin)) {
    ok(`better-sqlite3 binary ditemukan: ${sqliteBin}`)
  } else {
    warn('better-sqlite3 binary tidak ditemukan di root node_modules!')
    warn('Jalankan: npm install better-sqlite3@12.11.1 dulu sebelum build')
  }

  log('5/5', 'Build installer dan portable .exe...')
  console.log('  (Butuh beberapa menit — download Electron runtime ~80MB pertama kali)\n')

  const builderBin = path.join(electronNM, '.bin',
    process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder')
  if (!fs.existsSync(builderBin)) {
    fail(`electron-builder tidak ditemukan di:\n  ${builderBin}`)
  }

  // Env var sebagai lapisan proteksi tambahan — paksa electron-builder
  // skip semua native rebuild meskipun config entah kenapa tidak terbaca
  const noRebuildEnv = {
    ELECTRON_BUILDER_BUILD_DEPENDENCIES_FROM_SOURCE: 'false',
    npm_config_build_from_source: 'false',
    SKIP_ELECTRON_REBUILD: 'true',
    npm_config_target_arch: 'x64',
  }

  run(`"${builderBin}" build --win --config electron-builder.config.js`, ROOT, noRebuildEnv)

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
