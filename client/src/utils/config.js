'use strict';

require('dotenv').config();

const REQUIRED = ['SERVER_URL'];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[Config] Missing required env: ${key}. Jalankan npm run setup.`);
    process.exit(1);
  }
}

module.exports = {
  SERVER_URL:       process.env.SERVER_URL,
  CLIENT_SECRET:    process.env.CLIENT_SECRET   || '',
  CLIENT_NAME:      process.env.CLIENT_NAME      || 'GamePC',
  LOG_LEVEL:        process.env.LOG_LEVEL        || 'info',
  LOG_DIR:          process.env.LOG_DIR          || null,
  AHK_EXE_PATH:     process.env.AHK_EXE_PATH    || 'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
  AHK_SCRIPTS_PATH: process.env.AHK_SCRIPTS_PATH || null,
  AHK_DRY_RUN:      process.env.AHK_DRY_RUN     || 'false',
  ADAPTER_AHK:      process.env.ADAPTER_AHK      !== 'false',
  ADAPTER_VJOY:     process.env.ADAPTER_VJOY     === 'true',
  ADAPTER_PLUGIN:   process.env.ADAPTER_PLUGIN   === 'true',
};
