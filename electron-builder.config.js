// electron-builder.config.js
// Config electron-builder v24+ (dijalankan dari ROOT project)

module.exports = {
  appId:       'com.viewermerusuh.app',
  productName:     'Viewer Merusuh',
  copyright:       'MIT License',
  electronVersion: '28.3.3',  // harus exact, tanpa ^ atau ~

  // CATATAN: 'main' TIDAK valid di electron-builder config!
  // Entry point diambil dari package.json -> "main"
  // Pastikan root package.json punya: "main": "electron/main.js"

  icon: 'electron/assets/icon.png',

  directories: {
    output:         'dist-electron',
    buildResources: 'electron/assets',
  },

  files: [
    'electron/main.js',
    'electron/preload.js',
    'electron/loading.html',
    'server/**/*',
    'dashboard/dist/**/*',
    'overlay/**/*',
    '.env.example',
    'package.json',
    'node_modules/**/*',
    '!node_modules/.cache/**/*',
    '!node_modules/electron/**/*',
    '!node_modules/electron-builder/**/*',
    '!node_modules/nodemon/**/*',
    '!node_modules/.bin/**/*',
    '!dashboard/src/**/*',
    '!dashboard/node_modules/**/*',
    '!electron/node_modules/**/*',
  ],

  asar: true,
  asarUnpack: [
    'node_modules/better-sqlite3/**/*',
    'node_modules/bindings/**/*',
    'node_modules/file-uri-to-path/**/*',
  ],

  extraResources: [
    { from: 'adapters', to: 'adapters', filter: ['**/*'] },
    { from: 'plugins',  to: 'plugins',  filter: ['**/*'] },
    { from: 'docs',     to: 'docs',     filter: ['**/*'] },
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
