// electron-builder.config.js
// Config electron-builder (dijalankan dari ROOT project)

module.exports = {
  appId:           'com.viewermerusuh.app',
  productName:     'Viewer Merusuh',
  copyright:       'MIT License',
  electronVersion: '42.7.0',  // harus exact, tanpa ^ atau ~
  executableName:  'viewer-merusuh',

  // ════════════════════════════════════════════════════════════════
  // PENTING: Disable rebuild native modules
  // better-sqlite3 v12 sudah punya prebuilt binary yang compatible
  // dengan Electron 28 (ABI match). Rebuild manual akan GAGAL tanpa
  // Visual Studio karena node-gyp butuh compiler.
  // ════════════════════════════════════════════════════════════════
  npmRebuild: false,
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,

  icon: 'electron/assets/icon.png',

  directories: {
    output:         'dist-electron',
    buildResources: 'electron/assets',
  },

  files: [
    'electron/main.js',
    'electron/preload.js',
    'electron/loading.html',
    'electron/wizard.html',
    'server/**/*',
    'dashboard/dist/**/*',
    'overlay/**/*',
    '.env.example',
    'package.json',
    'node_modules/**/*',
    '!node_modules/.cache/**/*',
    '!node_modules/electron/**/*',
    '!node_modules/electron-builder/**/*',
    '!node_modules/electron-rebuild/**/*',
    '!node_modules/@electron/rebuild/**/*',
    '!node_modules/nodemon/**/*',
    '!node_modules/.bin/**/*',
    '!node_modules/vigemclient/**/*',
    '!node_modules/node-addon-api/**/*',
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
    '!avatar/**/*',
  ],

  asar: true,
  asarUnpack: [
    'node_modules/better-sqlite3/**/*',
    'node_modules/bindings/**/*',
    'node_modules/file-uri-to-path/**/*',
    'node_modules/node-gyp-build/**/*',
    'node_modules/ngrok/**/*',
  ],

  extraResources: [
    { from: 'electron/assets/icon.png',      to: 'icon.png' },
    { from: 'electron/assets/tray-icon.png', to: 'tray-icon.png' },
    { from: 'electron/assets/icon.ico',      to: 'icon.ico' },
    { from: 'adapters', to: 'app/adapters', filter: ['**/*'] },
    { from: 'plugins',  to: 'app/plugins',  filter: ['**/*'] },
    { from: 'electron/assets/redist', to: 'redist', filter: ['**/*'] },
  ],

  extraFiles: [
    { from: 'electron/assets/icon.png',      to: 'resources/icon.png' },
    { from: 'electron/assets/tray-icon.png', to: 'resources/tray-icon.png' },
  ],

  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
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

  publish: {
    provider:    'github',
    owner:       'noobiiefun',
    repo:        'Viewer-Merusuh',
    releaseType: 'release',
  },
}
