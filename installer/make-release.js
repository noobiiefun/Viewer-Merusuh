// installer/make-release.js
// Membuat paket release ZIP yang siap didistribusikan ke user
// Jalankan: node installer/make-release.js
//
// Output: dist/viewer-merusuh-v{version}.zip
// Isi: semua file yang dibutuhkan user + BAT files di root

const fs       = require('fs')
const path     = require('path')
const { execSync } = require('child_process')

const ROOT    = path.join(__dirname, '..')
const pkg     = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json')))
const VERSION = pkg.version
const DIST    = path.join(ROOT, 'dist')
const RELEASE = path.join(DIST, `viewer-merusuh-v${VERSION}`)

// ── File dan folder yang diinclude dalam release ─────────────────────
const INCLUDE = [
  // Server
  { src: 'server',         dst: 'server' },
  // Dashboard build (bukan source)
  { src: 'dashboard/dist', dst: 'dashboard/dist' },
  // Overlay OBS
  { src: 'overlay',        dst: 'overlay' },
  // AHK scripts
  { src: 'adapters/ahk',   dst: 'adapters/ahk' },
  // Game plugins
  { src: 'plugins',        dst: 'plugins' },
  // Docs
  { src: 'docs',           dst: 'docs' },
  // Config files
  { src: '.env.example',   dst: '.env.example' },
  { src: 'package.json',   dst: 'package.json' },
  { src: 'README.md',      dst: 'README.md' },
  { src: 'LICENSE',        dst: 'LICENSE' },
  // Installer files
  { src: 'installer/SETUP.bat',          dst: 'SETUP.bat' },
  { src: 'installer/START.bat',          dst: 'START.bat' },
  { src: 'installer/STOP.bat',           dst: 'STOP.bat' },
  { src: 'installer/UPDATE.bat',         dst: 'UPDATE.bat' },
  { src: 'installer/README_INSTALL.txt', dst: 'README_INSTALL.txt' },
  { src: 'installer/setup.js',           dst: 'installer/setup.js' },
  { src: 'installer/postinstall.js',     dst: 'installer/postinstall.js' },
]

// ── Helpers ───────────────────────────────────────────────────────────
function copyRecursive(src, dst) {
  const srcAbs = path.join(ROOT, src)
  const dstAbs = path.join(RELEASE, dst)

  if (!fs.existsSync(srcAbs)) {
    console.warn(`  ⚠️  Skip (tidak ada): ${src}`)
    return
  }

  const stat = fs.statSync(srcAbs)
  if (stat.isDirectory()) {
    fs.mkdirSync(dstAbs, { recursive: true })
    for (const entry of fs.readdirSync(srcAbs)) {
      // Skip node_modules, .git, .env, *.db
      if (['node_modules', '.git', 'dist'].includes(entry)) continue
      if (entry.endsWith('.db') || entry === '.env') continue
      copyRecursive(path.join(src, entry), path.join(dst, entry))
    }
  } else {
    fs.mkdirSync(path.dirname(dstAbs), { recursive: true })
    fs.copyFileSync(srcAbs, dstAbs)
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n  🎮 Viewer Merusuh — Build Release v${VERSION}`)
  console.log(`  ${'─'.repeat(48)}\n`)

  // Bersihkan output lama
  if (fs.existsSync(RELEASE)) {
    fs.rmSync(RELEASE, { recursive: true })
    console.log('  🗑️  Folder lama dibersihkan')
  }
  fs.mkdirSync(RELEASE, { recursive: true })
  fs.mkdirSync(DIST, { recursive: true })

  // Copy semua file
  console.log('  📦 Mengcopy files...')
  for (const item of INCLUDE) {
    process.stdout.write(`     ${item.src.padEnd(35)}`)
    copyRecursive(item.src, item.dst)
    console.log('✓')
  }

  // Buat package.json khusus release (tanpa devDependencies)
  console.log('\n  📝 Membuat package.json release...')
  const releasePkg = {
    name:        pkg.name,
    version:     pkg.version,
    description: pkg.description,
    main:        pkg.main,
    scripts: {
      start:   'node server/index.js',
      setup:   'node installer/setup.js',
      build:   pkg.scripts.build,
    },
    dependencies:         pkg.dependencies,
    optionalDependencies: pkg.optionalDependencies,
  }
  fs.writeFileSync(
    path.join(RELEASE, 'package.json'),
    JSON.stringify(releasePkg, null, 2)
  )

  // Buat .gitignore untuk release
  fs.writeFileSync(path.join(RELEASE, '.gitignore'), [
    'node_modules/', '.env', '*.db', '*.db-journal',
    'dist/', 'dist-exe/', 'logs/', '*.log', '.env.backup', '*.backup',
  ].join('\n'))

  // ZIP (jika zip tersedia di sistem)
  const zipName = `viewer-merusuh-v${VERSION}.zip`
  const zipPath = path.join(DIST, zipName)
  try {
    if (process.platform === 'win32') {
      execSync(
        `powershell -Command "Compress-Archive -Path '${RELEASE}\\*' -DestinationPath '${zipPath}' -Force"`,
        { stdio: 'inherit' }
      )
    } else {
      execSync(`cd "${DIST}" && zip -r "${zipName}" "viewer-merusuh-v${VERSION}/" -x "*/node_modules/*"`, {
        stdio: 'inherit'
      })
    }

    const size = fs.statSync(zipPath).size
    console.log(`\n  ✅ ZIP berhasil: dist/${zipName} (${formatSize(size)})`)
  } catch (e) {
    console.log(`\n  ⚠️  ZIP gagal (${e.message}) — folder release ada di: dist/viewer-merusuh-v${VERSION}/`)
  }

  // Summary
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   ✅  Release v${VERSION} siap!                    ║
  ╠══════════════════════════════════════════════════╣
  ║   Output: dist/viewer-merusuh-v${VERSION}.zip      ║
  ║                                                  ║
  ║   Instruksi distribusi:                          ║
  ║   1. Upload ZIP ke GitHub Releases               ║
  ║   2. User extract ZIP                            ║
  ║   3. User double-click SETUP.bat                 ║
  ║   4. User double-click START.bat                 ║
  ╚══════════════════════════════════════════════════╝
  `)
}

main().catch(err => {
  console.error('\n  ❌ Build error:', err.message)
  process.exit(1)
})
