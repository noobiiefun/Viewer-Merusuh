/**
 * core/adapterManager.js
 * Router efek ke adapter yang tepat (AHK / vJoy / Plugin).
 *
 * Setiap adapter didaftarkan dengan nama uniknya.
 * Saat event 'effect' masuk, payload.adapter digunakan untuk
 * memilih adapter yang akan mengeksekusi efek.
 */

'use strict';

const logger = require('../utils/logger');
const { config } = require('../utils/config');

const LABEL = 'AdapterManager';

class AdapterManager {
  constructor() {
    /** @type {Map<string, object>} */
    this._adapters = new Map();
  }

  /**
   * Daftarkan adapter.
   * @param {string} name  - nama adapter: 'ahk' | 'vjoy' | 'plugin'
   * @param {object} adapter - objek dengan method execute(payload)
   */
  register(name, adapter) {
    this._adapters.set(name, adapter);
    logger.success(LABEL, `Adapter terdaftar: ${name}`);
  }

  /**
   * Inisialisasi semua adapter yang aktif.
   */
  async init() {
    // AHK adapter
    if (config.adapterAhk) {
      try {
        const AhkAdapter = require('../adapters/ahk');
        const ahk = new AhkAdapter();
        await ahk.init();
        this.register('ahk', ahk);
      } catch (err) {
        logger.warn(LABEL, `Adapter AHK gagal init: ${err.message}`);
      }
    }

    // vJoy adapter
    if (config.adapterVjoy) {
      try {
        const VjoyAdapter = require('../adapters/vjoy');
        const vjoy = new VjoyAdapter();
        await vjoy.init();
        this.register('vjoy', vjoy);
      } catch (err) {
        logger.warn(LABEL, `Adapter vJoy gagal init: ${err.message}`);
      }
    }

    // Plugin adapter
    if (config.adapterPlugin) {
      try {
        const PluginAdapter = require('../adapters/plugin');
        const plugin = new PluginAdapter();
        await plugin.init();
        this.register('plugin', plugin);
      } catch (err) {
        logger.warn(LABEL, `Adapter Plugin gagal init: ${err.message}`);
      }
    }

    if (this._adapters.size === 0) {
      logger.warn(LABEL, 'Tidak ada adapter yang aktif! Periksa ADAPTER_* di .env');
    }
  }

  /**
   * Eksekusi efek ke adapter yang sesuai.
   * @param {object} payload - payload dari server { adapter, action, params, ... }
   */
  execute(payload) {
    const { adapter: adapterName, action, params } = payload;

    if (!adapterName) {
      logger.warn(LABEL, 'Payload tanpa field "adapter", dilewati.');
      return;
    }

    const adapter = this._adapters.get(adapterName);
    if (!adapter) {
      logger.warn(LABEL, `Adapter "${adapterName}" tidak aktif di client ini.`);
      return;
    }

    try {
      adapter.execute({ action, params, raw: payload });
    } catch (err) {
      logger.error(LABEL, `Error saat eksekusi [${adapterName}] ${action}: ${err.message}`);
    }
  }
}

module.exports = AdapterManager;
