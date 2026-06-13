// electron/main.js
// Electron main process
// Tugasnya:
//   1. Spawn Node.js server (server/index.js) sebagai child process
//   2. Buka window browser yang menampilkan dashboard
//   3. Handle tray icon, update, dan lifecycle app

const { app, BrowserWindow, Tray, Menu, shell, dialog, ipcMain, nativeImage } = require('electron')
const { spawn }    = require('child_process')
const path         = require('path')
const fs           = require('fs')
const http         = require('http')
const net          = require('net')

// ── Path resolution (works di dev dan setelah di-package) ─────────────
const IS_PACKAGED  = app.isPackaged
const ROOT         = IS_PACKAGED
  ? path.join(process.resourcesPath, 'app')
  : path.join(__dirname, '..')

const SERVER_ENTRY = path.join(ROOT, 'server', 'index.js')
const ENV_PATH     = IS_PACKAGED
  ? path.join(app.getPath('userData'), '.env')
  : path.join(ROOT, '.env')
const DB_PATH      = IS_PACKAGED
  ? path.join(app.getPath('userData'), 'viewer-merusuh.db')
  : path.join(ROOT, 'viewer-merusuh.db')

// ── State ────────────────────────────────────────────────────────────
let mainWindow  = null
let tray        = null
let serverProc  = null
let serverPort  = 3000
let serverReady = false

// ─────────────────────────────────────────────────────────────────────
// Baca PORT dari .env
// ─────────────────────────────────────────────────────────────────────
function readPort() {
  const envFile = fs.existsSync(ENV_PATH) ? ENV_PATH : path.join(ROOT, '.env.example')
  if (!fs.existsSync(envFile)) return 3000
  const lines = fs.readFileSync(envFile, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('PORT=')) {
      const val = parseInt(trimmed.slice(5))
      if (!isNaN(val)) return val
    }
  }
  return 3000
}

// ─────────────────────────────────────────────────────────────────────
// Cek apakah port sudah terpakai
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
// Setup: copy .env dan DB ke userData jika belum ada (saat install)
// ─────────────────────────────────────────────────────────────────────
function ensureUserData() {
  const userData = app.getPath('userData')
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true })

  // Copy .env.example sebagai .env default jika belum ada
  if (!fs.existsSync(ENV_PATH)) {
    const exampleSrc = path.join(ROOT, '.env.example')
    if (fs.existsSync(exampleSrc)) {
      fs.copyFileSync(exampleSrc, ENV_PATH)
    } else {
      fs.writeFileSync(ENV_PATH, [
        '# Viewer Merusuh — Konfigurasi',
        'PORT=3000',
        'NODE_ENV=production',
        'SAWERIA_STREAM_KEY=',
        'TRAKTEER_API_KEY=',
        `AHK_EXE_PATH=C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe`,
        'PLUGIN_SECRET=',
      ].join('\n'))
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Init database jika belum ada
// ─────────────────────────────────────────────────────────────────────
function ensureDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    try {
      // Set env agar setup.js tahu path DB
      process.env.DB_PATH = DB_PATH
      require(path.join(ROOT, 'server', 'db', 'setup.js'))
    } catch (e) {
      console.error('DB setup error:', e.message)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Spawn Node.js server sebagai child process
// ─────────────────────────────────────────────────────────────────────
async function startServer() {
  serverPort = readPort()

  // Cek port bebas
  const free = await isPortFree(serverPort)
  if (!free) {
    const choice = await dialog.showMessageBox(mainWindow, {
      type:    'warning',
      title:   'Port Sudah Dipakai',
      message: `Port ${serverPort} sudah digunakan aplikasi lain.`,
      detail:  `Ganti port di Settings → Secrets & Config, lalu restart aplikasi.`,
      buttons: ['Buka Settings', 'Keluar'],
    })
    if (choice.response === 0) {
      mainWindow.loadURL(`http://localhost:${serverPort}/dashboard#secrets`)
    } else {
      app.quit()
    }
    return
  }

  const nodeExe = process.execPath  // Node.js yang di-bundle Electron
  const env     = {
    ...process.env,
    PORT:    String(serverPort),
    DB_PATH: DB_PATH,
    ENV_PATH: ENV_PATH,
    NODE_ENV: 'production',
    ELECTRON: '1',
  }

  serverProc = spawn(nodeExe, [SERVER_ENTRY], {
    env,
    cwd:   ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  serverProc.stdout.on('data', data => {
    const msg = data.toString()
    process.stdout.write('[Server] ' + msg)
    if (msg.includes('VIEWER MERUSUH') || msg.includes('running')) {
      serverReady = true
      loadDashboard()
    }
  })

  serverProc.stderr.on('data', data => {
    process.stderr.write('[Server ERR] ' + data.toString())
  })

  serverProc.on('exit', (code) => {
    console.log(`Server exited with code ${code}`)
    serverReady = false
    if (code !== 0 && mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="font-family:sans-serif;padding:40px;text-align:center;background:#0d0f14;color:#e8eaf0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:48px;margin-bottom:16px">⚠️</div><h2>Server berhenti tidak terduga</h2><p style="color:#8b92a8;margin-top:8px">Restart aplikasi untuk mencoba lagi</p></div>'
      `)
    }
  })
}

// ─────────────────────────────────────────────────────────────────────
// Poll server hingga ready, lalu load dashboard
// ─────────────────────────────────────────────────────────────────────
function loadDashboard() {
  if (!mainWindow) return
  const url = `http://localhost:${serverPort}/dashboard`
  mainWindow.loadURL(url)
}

function waitForServer(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      http.get(`http://localhost:${serverPort}/api/status`, res => {
        if (res.statusCode === 200) resolve()
        else retry()
      }).on('error', retry)
    }
    const retry = () => {
      attempts++
      if (attempts >= maxAttempts) reject(new Error('Server timeout'))
      else setTimeout(check, 500)
    }
    check()
  })
}

// ─────────────────────────────────────────────────────────────────────
// Buat main window
// ─────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1200,
    height:          750,
    minWidth:        800,
    minHeight:       550,
    title:           'Viewer Merusuh',
    backgroundColor: '#0d0f14',
    icon:            path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration:     false,
      contextIsolation:    true,
      preload:             path.join(__dirname, 'preload.js'),
    },
    show: false,  // tampil setelah server ready
  })

  // Loading screen sementara server booting
  mainWindow.loadFile(path.join(__dirname, 'loading.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())

  // Buka link eksternal di browser default
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost')) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })

  // Sembunyikan menu bar (pakai dashboard sebagai UI)
  mainWindow.setMenuBarVisibility(false)
}

// ─────────────────────────────────────────────────────────────────────
// System Tray
// ─────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png')
  const icon     = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip('Viewer Merusuh')

  const updateMenu = () => {
    const menu = Menu.buildFromTemplate([
      {
        label:   'Viewer Merusuh',
        enabled: false,
      },
      { type: 'separator' },
      {
        label:   serverReady ? '🟢 Server Running' : '🔴 Server Starting...',
        enabled: false,
      },
      {
        label: `Port: ${serverPort}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '📊 Buka Dashboard',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
          }
        },
      },
      {
        label: '🌐 Buka di Browser',
        click: () => shell.openExternal(`http://localhost:${serverPort}/dashboard`),
      },
      {
        label: '📺 Copy URL Overlay OBS',
        click: () => {
          require('electron').clipboard.writeText(`http://localhost:${serverPort}/overlay`)
          tray.displayBalloon({
            title:   'URL Overlay Disalin!',
            content: `http://localhost:${serverPort}/overlay — paste ke OBS Browser Source`,
          })
        },
      },
      { type: 'separator' },
      {
        label: '❌ Keluar',
        click: () => app.quit(),
      },
    ])
    tray.setContextMenu(menu)
  }

  updateMenu()
  // Update menu tiap 5 detik untuk reflect status server
  setInterval(updateMenu, 5000)

  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  })
}

// ─────────────────────────────────────────────────────────────────────
// IPC handlers — komunikasi antara renderer (dashboard) dan main process
// ─────────────────────────────────────────────────────────────────────
function setupIPC() {
  // Buka folder userData di File Explorer
  ipcMain.handle('open-user-data', () => {
    shell.openPath(app.getPath('userData'))
  })

  // Restart server
  ipcMain.handle('restart-server', async () => {
    if (serverProc) {
      serverProc.kill()
      await new Promise(r => setTimeout(r, 1000))
    }
    await startServer()
    return { ok: true }
  })

  // Info app
  ipcMain.handle('get-app-info', () => ({
    version:  app.getVersion(),
    userData: app.getPath('userData'),
    port:     serverPort,
    packaged: IS_PACKAGED,
  }))
}

// ─────────────────────────────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  ensureUserData()
  ensureDatabase()
  setupIPC()
  createWindow()
  createTray()

  // Start server, tunggu ready, lalu load dashboard
  await startServer()
  try {
    await waitForServer(40)
    loadDashboard()
  } catch {
    // Server lambat start — tetap coba load
    setTimeout(loadDashboard, 3000)
  }
})

app.on('window-all-closed', () => {
  // Di Windows/Linux: app tetap jalan di tray walau window ditutup
  if (process.platform === 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
  else { mainWindow.show(); mainWindow.focus() }
})

app.on('before-quit', () => {
  // Matikan server saat app ditutup
  if (serverProc) {
    serverProc.kill('SIGTERM')
    serverProc = null
  }
})

// Single instance lock — cegah buka 2x
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  })
}
