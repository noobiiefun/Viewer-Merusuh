// electron/main.js
// Electron main process — Viewer Merusuh

const { app, BrowserWindow, Tray, Menu, shell, dialog, ipcMain, nativeImage, clipboard } = require('electron')
const { spawn }    = require('child_process')
const path         = require('path')
const fs           = require('fs')
const http         = require('http')
const net          = require('net')

// ── Path resolution ───────────────────────────────────────────────────
const IS_PACKAGED = app.isPackaged

// ROOT: folder yang berisi server/, dashboard/, dll
const ROOT = IS_PACKAGED
  ? path.join(process.resourcesPath, 'app')  // di dalam .exe
  : path.join(__dirname, '..')                 // saat dev

const SERVER_ENTRY = path.join(ROOT, 'server', 'index.js')

// userData: folder di %AppData% untuk .env dan .db
const USER_DATA = app.getPath('userData')
const ENV_PATH  = path.join(USER_DATA, '.env')
const DB_PATH   = path.join(USER_DATA, 'viewer-merusuh.db')

// ── State ─────────────────────────────────────────────────────────────
let mainWindow  = null
let tray        = null
let serverProc  = null
let serverPort  = 3000
let serverReady = false
let isQuitting  = false

// ── Logging ───────────────────────────────────────────────────────────
const logPath = path.join(USER_DATA, 'app.log')
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  process.stdout.write(line)
  try { fs.appendFileSync(logPath, line) } catch {}
}

// ─────────────────────────────────────────────────────────────────────
// Baca PORT dari .env
// ─────────────────────────────────────────────────────────────────────
function readPort() {
  const files = [ENV_PATH, path.join(ROOT, '.env.example')]
  for (const f of files) {
    if (!fs.existsSync(f)) continue
    const lines = fs.readFileSync(f, 'utf8').split('\n')
    for (const line of lines) {
      const m = line.trim().match(/^PORT=(\d+)/)
      if (m) return parseInt(m[1])
    }
  }
  return 3000
}

// ─────────────────────────────────────────────────────────────────────
// Cek port bebas
// ─────────────────────────────────────────────────────────────────────
function isPortFree(port) {
  return new Promise(resolve => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => { srv.close(); resolve(true) })
    srv.listen(port, '127.0.0.1')
  })
}

// ─────────────────────────────────────────────────────────────────────
// Pastikan userData dan file config ada
// ─────────────────────────────────────────────────────────────────────
function ensureUserData() {
  if (!fs.existsSync(USER_DATA)) fs.mkdirSync(USER_DATA, { recursive: true })

  if (!fs.existsSync(ENV_PATH)) {
    const src = path.join(ROOT, '.env.example')
    if (fs.existsSync(src)) {
      let content = fs.readFileSync(src, 'utf8')
      content += `\nDB_PATH=${DB_PATH.replace(/\\/g, '\\\\')}\n`
      fs.writeFileSync(ENV_PATH, content)
    } else {
      fs.writeFileSync(ENV_PATH, [
        '# Viewer Merusuh',
        'PORT=3000',
        'NODE_ENV=production',
        'SAWERIA_STREAM_KEY=',
        'TRAKTEER_API_KEY=',
        `AHK_EXE_PATH=C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe`,
        'PLUGIN_SECRET=',
        `DB_PATH=${DB_PATH.replace(/\\/g, '\\\\')}`,
      ].join('\n'))
    }
    log(`Created .env at: ${ENV_PATH}`)
  }
}

// ─────────────────────────────────────────────────────────────────────
// Init database
// ─────────────────────────────────────────────────────────────────────
function ensureDatabase() {
  if (fs.existsSync(DB_PATH)) return
  try {
    process.env.DB_PATH = DB_PATH
    const setupPath = path.join(ROOT, 'server', 'db', 'setup.js')
    if (fs.existsSync(setupPath)) {
      // Jalankan setup dalam proses terpisah agar tidak block
      const { execFileSync } = require('child_process')
      execFileSync(process.execPath, [setupPath], {
        env: { ...process.env, DB_PATH },
        timeout: 15000,
        stdio: 'ignore',
      })
      log('Database initialized')
    }
  } catch (e) {
    log('DB init error: ' + e.message)
  }
}

// ─────────────────────────────────────────────────────────────────────
// Spawn server
// ─────────────────────────────────────────────────────────────────────
async function startServer() {
  serverPort = readPort()
  log(`Starting server on port ${serverPort}`)

  const portFree = await isPortFree(serverPort)
  if (!portFree) {
    log(`Port ${serverPort} is in use`)
    const choice = await dialog.showMessageBox({
      type:    'warning',
      title:   'Port Sudah Dipakai',
      message: `Port ${serverPort} sudah digunakan aplikasi lain.`,
      detail:  'Buka Settings → Secrets & Config → ganti PORT, lalu restart.',
      buttons: ['Buka Pengaturan', 'Keluar'],
    })
    if (choice.response === 0) {
      serverReady = true
      loadDashboard()
    } else {
      app.quit()
    }
    return
  }

  const env = {
    ...process.env,
    PORT:      String(serverPort),
    DB_PATH:   DB_PATH,
    ENV_PATH:  ENV_PATH,
    NODE_ENV:  'production',
    ELECTRON:  '1',
  }

  // Muat .env ke environment
  if (fs.existsSync(ENV_PATH)) {
    fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach(line => {
      const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !env[m[1]]) env[m[1]] = m[2]
    })
  }

  serverProc = spawn(process.execPath, [SERVER_ENTRY], {
    env,
    cwd:   ROOT,
    // PENTING: pipe tapi dengan error handling
    // jangan biarkan stdout/stderr crash saat parent mati
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  // ── Handle stdout dengan safe error catching ──
  serverProc.stdout.on('data', data => {
    try {
      const msg = data.toString()
      log('[server] ' + msg.trim())
      if (!serverReady && (
        msg.includes('VIEWER MERUSUH') ||
        msg.includes('running') ||
        msg.includes('localhost')
      )) {
        serverReady = true
        log('Server ready — loading dashboard')
        // Delay kecil agar server benar-benar siap terima koneksi
        setTimeout(loadDashboard, 500)
      }
    } catch {}
  })

  serverProc.stderr.on('data', data => {
    try { log('[server ERR] ' + data.toString().trim()) } catch {}
  })

  // ── Handle EPIPE — ini normal saat proses mati ──
  serverProc.stdout.on('error', err => {
    if (err.code !== 'EPIPE') log('stdout error: ' + err.message)
  })
  serverProc.stderr.on('error', err => {
    if (err.code !== 'EPIPE') log('stderr error: ' + err.message)
  })

  serverProc.on('error', err => {
    log('Server spawn error: ' + err.message)
  })

  serverProc.on('exit', (code, signal) => {
    log(`Server exited: code=${code} signal=${signal}`)
    serverReady = false
    serverProc  = null

    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.executeJavaScript(`
        if (!document.getElementById('vm-crash-overlay')) {
          const el = document.createElement('div')
          el.id = 'vm-crash-overlay'
          el.style = 'position:fixed;inset:0;background:#0d0f14;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:sans-serif;color:#e8eaf0'
          el.innerHTML = '<div style="font-size:48px;margin-bottom:16px">⚠️</div><h2 style="margin:0">Server berhenti</h2><p style="color:#8b92a8;margin-top:8px">Klik tombol di bawah untuk restart</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">🔄 Restart</button>'
          document.body.appendChild(el)
        }
      `).catch(() => {})
    }
  })

  // Fallback: jika server tidak kirim sinyal ready dalam 8 detik, load anyway
  setTimeout(() => {
    if (!serverReady) {
      log('Server start timeout — loading dashboard anyway')
      serverReady = true
      loadDashboard()
    }
  }, 8000)
}

// ─────────────────────────────────────────────────────────────────────
// Load dashboard di window
// ─────────────────────────────────────────────────────────────────────
function loadDashboard() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const url = `http://localhost:${serverPort}/dashboard`
  log('Loading dashboard: ' + url)
  mainWindow.loadURL(url).catch(err => {
    log('loadURL error: ' + err.message)
    // Retry setelah 2 detik
    setTimeout(() => {
      if (!mainWindow?.isDestroyed()) mainWindow.loadURL(url).catch(() => {})
    }, 2000)
  })
}

// ─────────────────────────────────────────────────────────────────────
// Resolve icon path (benar baik di dev maupun packaged)
// ─────────────────────────────────────────────────────────────────────
function resolveIcon(filename) {
  const candidates = [
    // Saat packaged: di extraResources atau di sebelah exe
    path.join(process.resourcesPath, filename),
    path.join(path.dirname(app.getPath('exe')), 'resources', filename),
    // Saat dev
    path.join(__dirname, 'assets', filename),
    path.join(ROOT, 'electron', 'assets', filename),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────
// Buat main window
// ─────────────────────────────────────────────────────────────────────
function createWindow() {
  const iconPath = resolveIcon('icon.png')
  log('Window icon: ' + (iconPath || 'none'))

  mainWindow = new BrowserWindow({
    width:           1200,
    height:          750,
    minWidth:        900,
    minHeight:       600,
    title:           'Viewer Merusuh',
    backgroundColor: '#0d0f14',
    icon:            iconPath || undefined,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          path.join(__dirname, 'preload.js'),
    },
    show: false,
  })

  // Loading screen sementara server booting
  mainWindow.loadFile(path.join(__dirname, 'loading.html'))
    .catch(() => mainWindow.loadURL('about:blank'))

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    log('Window shown')
  })

  // Buka link eksternal di browser default (bukan Electron)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://localhost:${serverPort}`)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Tombol X: sembunyikan ke tray, jangan quit
  mainWindow.on('close', e => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
      // Tampilkan balloon info pertama kali
      if (tray && process.platform === 'win32') {
        try {
          tray.displayBalloon({
            iconType: 'info',
            title:    'Viewer Merusuh tetap berjalan',
            content:  'Server masih aktif di background. Klik kanan ikon tray untuk membuka kembali.',
          })
        } catch {}
      }
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.setMenuBarVisibility(false)
}

// ─────────────────────────────────────────────────────────────────────
// System Tray
// ─────────────────────────────────────────────────────────────────────
function createTray() {
  // Cari icon tray
  const trayIconPath = resolveIcon('tray-icon.png') || resolveIcon('icon.png')
  log('Tray icon: ' + (trayIconPath || 'none (using empty)'))

  let trayIcon
  if (trayIconPath) {
    trayIcon = nativeImage.createFromPath(trayIconPath)
    // Resize ke 16x16 untuk tray (Windows requirement)
    if (!trayIcon.isEmpty()) {
      trayIcon = trayIcon.resize({ width: 16, height: 16 })
    }
  }

  if (!trayIcon || trayIcon.isEmpty()) {
    // Fallback: buat icon 16x16 ungu dari base64
    const PURPLE_ICO = Buffer.from(
      '00000100010010100000010020006804000016000000280000001000000020000000' +
      '0100200000000000000000000000000000000000000000000000000000000000000000' +
      '00000000000000000000000000000000000000000000000000000000ed3a7cff'.replace(/\s/g,''),
      'hex'
    )
    trayIcon = nativeImage.createEmpty()
  }

  try {
    tray = new Tray(trayIcon)
  } catch (e) {
    log('Tray creation error: ' + e.message)
    // Coba lagi dengan empty image
    try { tray = new Tray(nativeImage.createEmpty()) } catch {}
  }

  if (!tray) return

  tray.setToolTip('Viewer Merusuh')

  const buildMenu = () => Menu.buildFromTemplate([
    { label: '🎮 Viewer Merusuh v1.0.0', enabled: false },
    { type: 'separator' },
    {
      label:   serverReady ? '🟢 Server Running' : '🔴 Server Starting...',
      enabled: false,
    },
    { label: `Port: ${serverPort}`, enabled: false },
    { type: 'separator' },
    {
      label: '📊 Buka Dashboard',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) createWindow()
        mainWindow.show()
        mainWindow.focus()
        if (serverReady) loadDashboard()
      },
    },
    {
      label: '🌐 Buka di Browser',
      click: () => shell.openExternal(`http://localhost:${serverPort}/dashboard`),
    },
    {
      label: '📺 Copy URL Overlay OBS',
      click: () => {
        clipboard.writeText(`http://localhost:${serverPort}/overlay`)
        try {
          tray.displayBalloon({
            iconType: 'info',
            title:    'URL Overlay Disalin!',
            content:  `http://localhost:${serverPort}/overlay`,
          })
        } catch {}
      },
    },
    {
      label: '📁 Buka Folder Data',
      click: () => shell.openPath(USER_DATA),
    },
    { type: 'separator' },
    {
      label: '🔄 Restart Server',
      click: async () => {
        if (serverProc) {
          serverProc.kill()
          await new Promise(r => setTimeout(r, 1500))
        }
        serverReady = false
        startServer()
      },
    },
    { type: 'separator' },
    {
      label: '❌ Keluar',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  const refreshMenu = () => {
    try { tray.setContextMenu(buildMenu()) } catch {}
  }

  refreshMenu()
  setInterval(refreshMenu, 3000)

  tray.on('double-click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow()
    mainWindow.show()
    mainWindow.focus()
  })

  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow()
    mainWindow.show()
    mainWindow.focus()
  })
}

// ─────────────────────────────────────────────────────────────────────
// IPC handlers
// ─────────────────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('open-user-data', () => shell.openPath(USER_DATA))

  ipcMain.handle('restart-server', async () => {
    if (serverProc) {
      serverProc.kill()
      await new Promise(r => setTimeout(r, 1500))
    }
    serverReady = false
    await startServer()
    return { ok: true }
  })

  ipcMain.handle('get-app-info', () => ({
    version:  app.getVersion(),
    userData: USER_DATA,
    port:     serverPort,
    packaged: IS_PACKAGED,
    logPath,
  }))
}

// ─────────────────────────────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────────────────────────────

// Single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  })
}

app.whenReady().then(async () => {
  log('App ready — packaged: ' + IS_PACKAGED)
  log('ROOT: ' + ROOT)
  log('userData: ' + USER_DATA)

  ensureUserData()
  ensureDatabase()
  setupIPC()
  createWindow()

  // Buat tray setelah window (hindari race condition)
  setTimeout(createTray, 500)

  await startServer()
})

// Tutup window tapi jangan quit (tetap di tray)
app.on('window-all-closed', () => {
  // Intentionally tidak quit — server tetap jalan di tray
  if (process.platform === 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow()
  else { mainWindow.show(); mainWindow.focus() }
})

// Cleanup saat benar-benar quit
app.on('before-quit', () => {
  log('App quitting...')
  isQuitting = true
  if (serverProc) {
    try { serverProc.kill('SIGTERM') } catch {}
    serverProc = null
  }
})

// Tangkap uncaught exception agar tidak muncul dialog error menakutkan
process.on('uncaughtException', err => {
  log('Uncaught: ' + err.message)
  // EPIPE adalah error normal, tidak perlu ditampilkan ke user
  if (err.code === 'EPIPE') return
  if (!isQuitting) {
    dialog.showErrorBox('Error', err.message + '\n\nLog: ' + logPath)
  }
})
