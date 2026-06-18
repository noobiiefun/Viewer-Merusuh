// electron/main.js
// Electron main process — Viewer Merusuh
//
// PERUBAHAN UTAMA:
// Server Express dijalankan LANGSUNG di main process (bukan spawn child)
// karena saat packaged, process.execPath = Electron.exe bukan node.exe

const { app, BrowserWindow, Tray, Menu, shell, dialog, ipcMain, nativeImage, clipboard } = require('electron')
const path = require('path')
const fs   = require('fs')
const net  = require('net')

// ── Path resolution ────────────────────────────────────────────────────
const IS_PACKAGED = app.isPackaged

// Saat packaged: __dirname = resources/app/electron/
// ROOT harus = resources/app/ (satu level di atas electron/)
// Saat dev: ROOT = project root (satu level di atas electron/)
const ROOT = path.join(__dirname, '..')

const USER_DATA = app.getPath('userData')
const ENV_PATH  = path.join(USER_DATA, '.env')
const DB_PATH   = path.join(USER_DATA, 'viewer-merusuh.db')
const LOG_PATH  = path.join(USER_DATA, 'app.log')

// ── Logging ────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  try { fs.appendFileSync(LOG_PATH, line + '\n') } catch {}
}

// ── State ──────────────────────────────────────────────────────────────
let mainWindow  = null
let tray        = null
let serverPort  = 3000
let serverReady = false
let isQuitting  = false
let httpServer  = null  // referensi ke server Express

// ─────────────────────────────────────────────────────────────────────
// Baca PORT dari .env
// ─────────────────────────────────────────────────────────────────────
function readPort() {
  const files = [ENV_PATH, path.join(ROOT, '.env.example')]
  for (const f of files) {
    if (!fs.existsSync(f)) continue
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.trim().match(/^PORT=(\d+)/)
      if (m) return parseInt(m[1])
    }
  }
  return 3000
}

// ─────────────────────────────────────────────────────────────────────
// Cek apakah port bebas
// ─────────────────────────────────────────────────────────────────────
function isPortFree(port) {
  return new Promise(resolve => {
    const s = net.createServer()
    s.once('error', () => resolve(false))
    s.once('listening', () => { s.close(); resolve(true) })
    s.listen(port, '127.0.0.1')
  })
}

// ─────────────────────────────────────────────────────────────────────
// Setup .env dan DB di userData
// ─────────────────────────────────────────────────────────────────────
function ensureUserData() {
  if (!fs.existsSync(USER_DATA)) fs.mkdirSync(USER_DATA, { recursive: true })

  if (!fs.existsSync(ENV_PATH)) {
    const src = path.join(ROOT, '.env.example')
    const content = fs.existsSync(src)
      ? fs.readFileSync(src, 'utf8')
      : 'PORT=3000\nNODE_ENV=production\nSAWERIA_STREAM_KEY=\nTRAKTEER_API_KEY=\nAHK_EXE_PATH=C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe\nPLUGIN_SECRET=\n'
    fs.writeFileSync(ENV_PATH, content)
    log('Created .env: ' + ENV_PATH)
  }

  // Load .env ke process.env
  fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach(line => {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  })

  // Override path penting
  process.env.DB_PATH   = DB_PATH
  process.env.ENV_PATH  = ENV_PATH   // dibaca oleh server/routes/env.js
  process.env.ELECTRON  = '1'
  // NODE_ENV: jangan override, biarkan ikut nilai dari .env yang sudah di-load
  // Default 'development' agar testing endpoint aktif
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development'
}

function ensureDatabase() {
  if (fs.existsSync(DB_PATH)) { log('DB exists: ' + DB_PATH); return }
  try {
    const setupPath = path.join(ROOT, 'server', 'db', 'setup.js')
    log('Running DB setup: ' + setupPath)
    require(setupPath)
    log('DB created')
  } catch (e) {
    log('DB setup error: ' + e.message)
  }
}

// ─────────────────────────────────────────────────────────────────────
// START SERVER — langsung di main process (bukan spawn)
// ─────────────────────────────────────────────────────────────────────
async function startServer() {
  serverPort = readPort()
  log(`Starting server on port ${serverPort}`)

  const free = await isPortFree(serverPort)
  if (!free) {
    log('Port not free: ' + serverPort)
    const r = await dialog.showMessageBox({
      type: 'warning', title: 'Port Dipakai',
      message: `Port ${serverPort} sudah dipakai aplikasi lain.`,
      detail:  'Ubah PORT di Settings, lalu restart.',
      buttons: ['Buka Settings', 'Keluar'],
    })
    if (r.response === 1) { app.quit(); return }
  }

  // Set PORT sebelum load server
  process.env.PORT = String(serverPort)

  try {
    // Require server/index.js — ini akan langsung start Express + Socket.io
    const serverIndexPath = path.join(ROOT, 'server', 'index.js')
    log('Loading server: ' + serverIndexPath)

    // Require dan simpan referensi
    const { server } = require(serverIndexPath)
    httpServer = server

    log('Server module loaded')
    serverReady = true

    // Load dashboard setelah server siap
    setTimeout(loadDashboard, 1500)

  } catch (e) {
    log('Server start error: ' + e.message + '\n' + e.stack)
    dialog.showErrorBox(
      'Server Gagal Start',
      `Error: ${e.message}\n\nLog: ${LOG_PATH}\n\nCoba restart aplikasi.`
    )
  }
}

// ─────────────────────────────────────────────────────────────────────
// Load dashboard di window Electron
// ─────────────────────────────────────────────────────────────────────
function loadDashboard() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const url = `http://localhost:${serverPort}/dashboard`
  log('Loading: ' + url)
  mainWindow.loadURL(url).catch(err => {
    log('loadURL failed: ' + err.message + ' — retry in 2s')
    setTimeout(loadDashboard, 2000)
  })
}

// ─────────────────────────────────────────────────────────────────────
// Resolve path icon (cek beberapa lokasi)
// ─────────────────────────────────────────────────────────────────────
function resolveIcon(filename) {
  const candidates = [
    path.join(process.resourcesPath, filename),
    path.join(__dirname, 'assets', filename),
    path.join(ROOT, 'electron', 'assets', filename),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) { log('Icon found: ' + p); return p }
  }
  log('Icon not found: ' + filename)
  return null
}

// ─────────────────────────────────────────────────────────────────────
// Buat main window
// ─────────────────────────────────────────────────────────────────────
function createWindow() {
  const iconPath = resolveIcon('icon.png')

  mainWindow = new BrowserWindow({
    width: 1200, height: 750, minWidth: 900, minHeight: 600,
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

  // Loading screen dulu
  const loadingPath = path.join(__dirname, 'loading.html')
  if (fs.existsSync(loadingPath)) {
    mainWindow.loadFile(loadingPath).catch(() => mainWindow.loadURL('about:blank'))
  } else {
    mainWindow.loadURL('about:blank')
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    log('Window shown')
  })

  // Link eksternal → buka di browser default
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://localhost`)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Tombol X → sembunyikan ke tray (tidak quit)
  mainWindow.on('close', e => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
      try {
        tray?.displayBalloon({
          iconType: 'info',
          title: 'Viewer Merusuh berjalan di background',
          content: 'Klik kanan ikon tray untuk membuka kembali atau keluar.',
        })
      } catch {}
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.setMenuBarVisibility(false)
}

// ─────────────────────────────────────────────────────────────────────
// System Tray
// ─────────────────────────────────────────────────────────────────────
function createTray() {
  const trayPath = resolveIcon('tray-icon.png') || resolveIcon('icon.png')
  let icon = nativeImage.createEmpty()

  if (trayPath) {
    try {
      icon = nativeImage.createFromPath(trayPath).resize({ width: 16, height: 16 })
    } catch (e) { log('Tray icon error: ' + e.message) }
  }

  try {
    tray = new Tray(icon)
  } catch (e) {
    log('Tray creation failed: ' + e.message)
    return
  }

  tray.setToolTip('Viewer Merusuh')

  function buildMenu() {
    return Menu.buildFromTemplate([
      { label: '🎮 Viewer Merusuh v1.0.0', enabled: false },
      { type: 'separator' },
      { label: serverReady ? '🟢 Server Running' : '🔴 Server Starting...', enabled: false },
      { label: `Port: ${serverPort}`, enabled: false },
      { type: 'separator' },
      {
        label: '📊 Buka Dashboard',
        click: () => {
          if (!mainWindow || mainWindow.isDestroyed()) createWindow()
          mainWindow.show(); mainWindow.focus()
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
          try { tray.displayBalloon({ iconType:'info', title:'Disalin!', content:`http://localhost:${serverPort}/overlay` }) } catch {}
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
          serverReady = false
          if (httpServer) {
            httpServer.close(() => {
              log('Server closed, restarting...')
              // Clear require cache agar bisa load ulang
              Object.keys(require.cache).forEach(k => {
                if (k.includes('server')) delete require.cache[k]
              })
              startServer()
            })
          } else {
            startServer()
          }
        },
      },
      { type: 'separator' },
      {
        label: '❌ Keluar',
        click: () => { isQuitting = true; app.quit() },
      },
    ])
  }

  const refresh = () => { try { tray?.setContextMenu(buildMenu()) } catch {} }
  refresh()
  setInterval(refresh, 3000)

  // Klik tray → buka window
  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow()
    mainWindow.show(); mainWindow.focus()
  })
  tray.on('double-click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow()
    mainWindow.show(); mainWindow.focus()
  })
}

// ─────────────────────────────────────────────────────────────────────
// IPC handlers
// ─────────────────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('open-user-data',  () => shell.openPath(USER_DATA))
  ipcMain.handle('get-app-info',    () => ({ version: app.getVersion(), userData: USER_DATA, port: serverPort, packaged: IS_PACKAGED, logPath: LOG_PATH }))
  ipcMain.handle('restart-server',  async () => {
    serverReady = false
    if (httpServer) httpServer.close()
    Object.keys(require.cache).forEach(k => { if (k.includes('server')) delete require.cache[k] })
    await startServer()
    return { ok: true }
  })
}

// ─────────────────────────────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  })
}

app.whenReady().then(async () => {
  log('=== Viewer Merusuh starting ===')
  log('Packaged: '     + IS_PACKAGED)
  log('__dirname: '    + __dirname)
  log('ROOT: '         + ROOT)
  log('resourcesPath: '+ process.resourcesPath)
  log('userData: '     + USER_DATA)

  // Verifikasi server/index.js bisa ditemukan
  const serverPath = path.join(ROOT, 'server', 'index.js')
  const serverExists = require('fs').existsSync(serverPath)
  log('server/index.js exists: ' + serverExists + ' at: ' + serverPath)
  if (!serverExists) {
    // Coba list isi ROOT untuk debug
    try {
      const contents = require('fs').readdirSync(ROOT)
      log('ROOT contents: ' + contents.join(', '))
    } catch (e) { log('Cannot read ROOT: ' + e.message) }
  }

  ensureUserData()
  ensureDatabase()
  setupIPC()
  createWindow()
  setTimeout(createTray, 500)
  await startServer()
})

app.on('window-all-closed', () => {
  // Jangan quit — tetap jalan di tray
  if (process.platform === 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow()
  else { mainWindow.show(); mainWindow.focus() }
})

app.on('before-quit', () => {
  log('Quitting...')
  isQuitting = true
  if (httpServer) { try { httpServer.close() } catch {} }
})

process.on('uncaughtException', err => {
  log('UNCAUGHT: ' + err.message)
  if (err.code === 'EPIPE' || isQuitting) return
  try { dialog.showErrorBox('Error', `${err.message}\n\nLog: ${LOG_PATH}`) } catch {}
})
