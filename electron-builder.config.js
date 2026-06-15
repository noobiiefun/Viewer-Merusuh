// electron-builder.config.js
// Config electron-builder yang dijalankan dari ROOT project
// Sehingga node_modules (termasuk better-sqlite3) diambil dari root
// dan TIDAK perlu compile ulang

const { version } = require('./package.json')

module.exports = {
  appId:       'com.viewermerusuh.app',
  productName: 'Viewer Merusuh',
  copyright:   'MIT License',

  // Entry point Electron — dari root
  main: 'electron/main.js',

  // Icon — dari root (bukan subfolder electron/)
  icon: 'electron/assets/icon.png',

  directories: {
    output:         'dist-electron',
    buildResources: 'electron/assets',
  },

  // File yang di-bundle ke dalam .exe
  // Semuanya relatif dari ROOT
  files: [
    // Electron process files
    'electron/main.js',
    'electron/preload.js',
    'electron/loading.html',

    // Server backend
    'server/**/*',

    // Dashboard build (bukan source)
    'dashboard/dist/**/*',

    // Overlay OBS
    'overlay/**/*',

    // Config
    '.env.example',
    'package.json',

    // node_modules dari ROOT — termasuk better-sqlite3 yang sudah ter-compile
    'node_modules/**/*',

    // Exclude yang tidak perlu
    '!node_modules/.cache/**/*',
    '!node_modules/electron/**/*',
    '!node_modules/electron-builder/**/*',
    '!node_modules/nodemon/**/*',
    '!dashboard/src/**/*',
    '!dashboard/node_modules/**/*',
    '!electron/node_modules/**/*',
  ],

  // File yang di-extract keluar dari asar (akses langsung di filesystem)
  // better-sqlite3 WAJIB di luar asar karena butuh akses native .node file
  asar: true,
  asarUnpack: [
    'node_modules/better-sqlite3/**/*',
    'node_modules/bindings/**/*',
    'node_modules/file-uri-to-path/**/*',
  ],

  // Extra resources: file yang perlu diakses user / plugin
  extraResources: [
    {
      from:   'adapters',
      to:     'adapters',
      filter: ['**/*'],
    },
    {
      from:   'plugins',
      to:     'plugins',
      filter: ['**/*'],
    },
    {
      from:   'docs',
      to:     'docs',
      filter: ['**/*'],
    },
  ],

  // Windows build targets
  win: {
    target: [
      {
        target: 'nsis',
        arch:   ['x64'],
      },
      {
        target: 'portable',
        arch:   ['x64'],
      },
    ],
    icon: 'electron/assets/icon.ico',
    requestedExecutionLevel: 'asInvoker',
  },

  // Installer NSIS (wizard install)
  nsis: {
    oneClick:                        false,
    allowToChangeInstallationDirectory: true,
    allowElevation:                  true,
    createDesktopShortcut:           true,
    createStartMenuShortcut:         true,
    shortcutName:                    'Viewer Merusuh',
    uninstallDisplayName:            'Viewer Merusuh',
    installerIcon:                   'electron/assets/icon.ico',
    uninstallerIcon:                 'electron/assets/icon.ico',
    installerHeaderIcon:             'electron/assets/icon.ico',
    license:                         'LICENSE',
    artifactName:                    'viewer-merusuh-setup-${version}.exe',
  },

  // Portable (langsung jalankan tanpa install)
  portable: {
    artifactName: 'viewer-merusuh-${version}-portable.exe',
  },

  // GitHub Releases (untuk auto-update)
  publish: {
    provider:    'github',
    owner:       'username',
    repo:        'viewer-merusuh',
    releaseType: 'release',
  },
}
