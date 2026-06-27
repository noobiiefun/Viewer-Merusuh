'use strict';

/**
 * Config loader — membaca .env dan memvalidasi nilai penting
 */

const logger = require('./logger');

function required(key) {
  const val = process.env[key];
  if (!val) {
    logger.warn(`[Config] ${key} belum diisi di .env — beberapa fitur mungkin tidak berjalan.`);
  }
  return val || '';
}

function bool(key, defaultVal = false) {
  const val = process.env[key];
  if (val === undefined || val === '') return defaultVal;
  return val === 'true' || val === '1';
}

const config = {
  SERVER_URL:    required('SERVER_URL'),
  CLIENT_SECRET: required('CLIENT_SECRET'),
  CLIENT_NAME:   process.env.CLIENT_NAME || 'GamePC',

  ADAPTER_AHK:    bool('ADAPTER_AHK', true),
  ADAPTER_VJOY:   bool('ADAPTER_VJOY', false),
  ADAPTER_PLUGIN: bool('ADAPTER_PLUGIN', false),

  AHK_EXE_PATH: process.env.AHK_EXE_PATH || 'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',

  VJOY_CONTROLLER_TYPE: process.env.VJOY_CONTROLLER_TYPE || 'DS4',

  PLUGIN_LOCAL_PORT: parseInt(process.env.PLUGIN_LOCAL_PORT || '3001', 10),
  PLUGIN_TOKEN:      process.env.PLUGIN_TOKEN || '',
  PLUGIN_EFFECT_TTL: parseInt(process.env.PLUGIN_EFFECT_TTL || '30000', 10),

  DASHBOARD_ENABLED: bool('DASHBOARD_ENABLED', true),
  DASHBOARD_PORT:    parseInt(process.env.DASHBOARD_PORT || '3002', 10),

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

module.exports = config;
