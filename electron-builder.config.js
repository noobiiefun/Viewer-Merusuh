// electron-builder.config.js

module.exports = {
  appId:           'com.viewermerusuh.app',
  productName:     'Viewer Merusuh',
  copyright:       'MIT License',
  electronVersion: '28.3.3',
  executableName:  'viewer-merusuh',

  icon: 'electron/assets/icon.png',

  directories: {
    output:         'dist-electron',
    buildResources: 'electron/assets',
  },

  // ── FILES masuk ke dalam app.asar ─────────────────────────────────
  // electron-builder membaca dari ROOT project dan menaruhnya di
  // resources/app/ (atau di dalam app.asar)
  //
  // Format: path relatif dari ROOT → masuk ke resources/app/<path>
  // Jadi 'server/**/*' → resources/app/server/**/*
  //      'electron/main.js' → resources/app/electron/main.js
  //
  // main.js di-require sebagai: resources/app/electron/main.js
  // server di-require sebagai:  resources/app/server/index.js  ✓
  files: [
    // Electron
    'electron/main.js',
    'electron/preload.js',
    'electron/loading.html',

    // Server — WAJIB ada di dalam asar
    'server/**/*',

    // Dashboard build
    'dashboard/dist/**/*',

    // OBS Overlay
    'overlay/**/*',

    // Config template
    '.env.example',

    // package.json wajib ada (dibaca oleh Electron untuk versi dll)
    'package.json',

    // node_modules WAJIB lengkap — server pakai express, socket.io, dll
    'node_modules/**/*',

    // ── Exclude untuk hemat ukuran ──
    '!node_modules/.cache/**/*',
    '!node_modules/electron/**/*',
    '!node_modules/electron-builder/**/*',
    '!node_modules/electron-rebuild/**/*',
    '!node_modules/@electron/rebuild/**/*',
    '!node_modules/nodemon/**/*',
    '!node_modules/.bin/**/*',
    '!node_modules/vite/**/*',
    '!node_modules/@vitejs/**/*',
    '!node_modules/esbuild/**/*',
    '!node_modules/rollup/**/*',
    '!dashboard/src/**/*',
    '!dashboard/node_modules/**/*',
    '!electron/node_modules/**/*',
    '!docs/**/*',
    '!installer/**/*',
    '!build-electron.js',
    '!electron-builder.config.js',
    '!pkg.config.json',
    '!*.md',
    '!*.bat',
    '!*.txt',
  ],

  // ── ASAR ──────────────────────────────────────────────────────────
  // better-sqlite3 WAJIB di luar asar (native .node file)
  asar: true,
  asarUnpack: [
    'node_modules/better-sqlite3/**/*',
    'node_modules/bindings/**/*',
    'node_modules/file-uri-to-path/**/*',
    'node_modules/node-gyp-build/**/*',
  ],

  // ── EXTRA RESOURCES (di luar asar, di folder resources/) ──────────
  extraResources: [
    // Icon untuk tray dan window
    { from: 'electron/assets/icon.png',      to: 'icon.png' },
    { from: 'electron/assets/tray-icon.png', to: 'tray-icon.png' },
    { from: 'electron/assets/icon.ico',      to: 'icon.ico' },

    // AHK scripts (diakses saat runtime, path dari adapter)
    { from: 'adapters', to: 'app/adapters', filter: ['**/*'] },

    // Game plugins
    { from: 'plugins',  to: 'app/plugins',  filter: ['**/*'] },
  ],

  // ── EXTRA FILES (langsung di install dir, sejajar dengan .exe) ────
  extraFiles: [
    // Icon di root resources agar resolveIcon bisa akses via resourcesPath
    { from: 'electron/assets/icon.png',      to: 'resources/icon.png' },
    { from: 'electron/assets/tray-icon.png', to: 'resources/tray-icon.png' },
  ],

  // ── WINDOWS ───────────────────────────────────────────────────────
  win: {
    target: [
      { target: 'nsis',     arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'electron/assets/icon.ico',
    requestedExecutionLevel: 'asInvoker',
  },

  nsis: {
    oneClick:                           false,
    allowToChangeInstallationDirectory: true,
    allowElevation:                     true,
    createDesktopShortcut:              true,
    createStartMenuShortcut:            true,
    shortcutName:                       'Viewer Merusuh',
    uninstallDisplayName:               'Viewer Merusuh',
    installerIcon:                      'electron/assets/icon.ico',
    uninstallerIcon:                    'electron/assets/icon.ico',
    installerHeaderIcon:                'electron/assets/icon.ico',
    license:                            'LICENSE',
    artifactName:                       'viewer-merusuh-setup-${version}.exe',
  },

  portable: {
    artifactName: 'viewer-merusuh-${version}-portable.exe',
  },

  publish: {
    provider:    'github',
    owner:       'noobiiefun',
    repo:        'Viewer-Merusuh',
    releaseType: 'release',
  },
}
