// electron-builder.config.js
// Config electron-builder v24+ (dijalankan dari ROOT project)

module.exports = {
  appId:       'com.viewermerusuh.app',
  productName:     'Viewer Merusuh',
  copyright:       'MIT License',
  electronVersion: '28.3.3',  // harus exact, tanpa ^ atau ~

  // Download Electron dengan ffmpeg support (fix ffmpeg.dll not found)
  electronDownload: {
    version: '28.3.3',
  },

  // Nama executable
  executableName: 'viewer-merusuh',

  // CATATAN: 'main' TIDAK valid di electron-builder config!
  // Entry point diambil dari package.json -> "main"
  // Pastikan root package.json punya: "main": "electron/main.js"

  icon: 'electron/assets/icon.png',

  directories: {
    output:         'dist-electron',
    buildResources: 'electron/assets',
  },

  files: [
    // Electron process
    'electron/main.js',
    'electron/preload.js',
    'electron/loading.html',

    // Backend server (di-require langsung dari main process)
    'server/**/*',

    // Dashboard build
    'dashboard/dist/**/*',

    // OBS overlay
    'overlay/**/*',

    // Config template
    '.env.example',
    'package.json',

    // node_modules — WAJIB semua ada agar server bisa require
    'node_modules/**/*',

    // Exclude yang tidak perlu (hemat ukuran)
    '!node_modules/.cache/**/*',
    '!node_modules/electron/**/*',
    '!node_modules/electron-builder/**/*',
    '!node_modules/electron-rebuild/**/*',
    '!node_modules/@electron/**/*',
    '!node_modules/nodemon/**/*',
    '!node_modules/.bin/**/*',
    '!dashboard/src/**/*',
    '!dashboard/node_modules/**/*',
    '!electron/node_modules/**/*',
    '!*.md',
    '!docs/**/*',
    '!adapters/**/*',
    '!plugins/**/*',
    '!installer/**/*',
    '!build-electron.js',
    '!electron-builder.config.js',
  ],

  asar: true,
  asarUnpack: [
    // Native modules harus di luar asar
    'node_modules/better-sqlite3/**/*',
    'node_modules/bindings/**/*',
    'node_modules/file-uri-to-path/**/*',
  ],

  // ffmpeg.dll: copy ke folder resources agar Electron bisa akses
  extraFiles: [
    {
      from: 'electron/assets/icon.png',
      to:   'resources/icon.png',
    },
    {
      from: 'electron/assets/tray-icon.png',
      to:   'resources/tray-icon.png',
    },
  ],

  extraResources: [
    // Icon — agar resolveIcon() bisa temukan di process.resourcesPath
    { from: 'electron/assets/icon.png',     to: 'icon.png' },
    { from: 'electron/assets/tray-icon.png', to: 'tray-icon.png' },

    // AHK scripts (diakses saat runtime oleh adapter)
    { from: 'adapters', to: 'app/adapters', filter: ['**/*'] },

    // Game plugins (user install manual ke game)
    { from: 'plugins',  to: 'app/plugins',  filter: ['**/*'] },
  ],

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
    owner:       'username',
    repo:        'viewer-merusuh',
    releaseType: 'release',
  },
}
