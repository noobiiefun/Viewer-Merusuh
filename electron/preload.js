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

// ── Bridge khusus untuk halaman first-run wizard (electron/wizard.html) ──
contextBridge.exposeInMainWorld('setupWizard', {
  // Cek apakah AutoHotkey & ViGEmBus sudah terpasang di sistem
  checkDependencies: () => ipcRenderer.invoke('wizard-check-deps'),

  // Simpan konfigurasi (platform donasi, API key, port, dll) ke .env
  saveConfig: (data) => ipcRenderer.invoke('wizard-save-config', data),

  // Mulai tunnel ngrok, dapatkan URL webhook publik
  startNgrok: () => ipcRenderer.invoke('wizard-start-ngrok'),

  // Copy teks ke clipboard (dipakai tombol copy URL webhook)
  copyToClipboard: (text) => ipcRenderer.invoke('wizard-copy', text),

  // Tandai setup selesai — memicu pindah dari wizard ke dashboard
  completeSetup: () => ipcRenderer.invoke('wizard-complete'),
})
