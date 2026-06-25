/**
 * utils/config.js
 * Membaca dan memvalidasi environment variables dari .env
 */

'use strict';

require('dotenv').config();

const config = {
  // Koneksi
  serverUrl:      process.env.SERVER_URL     || 'http://192.168.1.10:3000',
  clientSecret:   process.env.CLIENT_SECRET  || '',
  clientName:     process.env.CLIENT_NAME    || 'GamePC',

  // Adapter flags
  adapterAhk:    process.env.ADAPTER_AHK    !== 'false',
  adapterVjoy:   process.env.ADAPTER_VJOY   === 'true',
  adapterPlugin: process.env.ADAPTER_PLUGIN === 'true',

  // AHK
  ahkExePath:     process.env.AHK_EXE_PATH   || 'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
  ahkScriptsPath: process.env.AHK_SCRIPTS_PATH || '',

  // Plugin
  pluginLocalPort: parseInt(process.env.PLUGIN_LOCAL_PORT || '3001', 10),

  // Misc
  logLevel: process.env.LOG_LEVEL || 'info',
};

/**
 * Validasi minimal — lempar error jika konfigurasi kritis kosong.
 */
function validate() {
  const errors = [];
  if (!config.serverUrl)    errors.push('SERVER_URL wajib diisi di .env');
  if (!config.clientSecret) errors.push('CLIENT_SECRET wajib diisi di .env');

  if (errors.length) {
    console.error('\n❌  Konfigurasi client tidak valid:\n');
    errors.forEach(e => console.error('   •', e));
    console.error('\n   Salin .env.example menjadi .env lalu isi nilainya.\n');
    process.exit(1);
  }
}

module.exports = { config, validate };
