// electron/preload.js
// Context bridge — expose API terbatas ke renderer (dashboard)
// Aman karena nodeIntegration = false

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Buka folder userData di Explorer
  openUserData: () => ipcRenderer.invoke('open-user-data'),

  // Restart server (setelah ganti config)
  restartServer: () => ipcRenderer.invoke('restart-server'),

  // Info app
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Cek apakah berjalan di Electron
  isElectron: true,
})
