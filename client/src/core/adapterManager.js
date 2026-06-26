'use strict';

/**
 * Adapter Manager
 * Router efek → adapter yang sesuai berdasarkan payload.adapter
 */

const logger = require('../utils/logger');

class AdapterManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.adapters = new Map();
  }

  /**
   * Daftarkan adapter
   * @param {string} name - nama adapter (misal: 'ahk', 'vjoy', 'plugin')
   * @param {object} adapter - objek adapter dengan method execute(payload)
   */
  register(name, adapter) {
    this.adapters.set(name, adapter);
    logger.debug(`[AdapterManager] Adapter "${name}" terdaftar.`);
  }

  /**
   * Inisialisasi semua adapter yang terdaftar
   */
  async initAll() {
    for (const [name, adapter] of this.adapters.entries()) {
      if (typeof adapter.init === 'function') {
        logger.debug(`[AdapterManager] Init adapter "${name}"...`);
        try {
          const ok = await adapter.init();
          if (ok === false) {
            logger.warn(`[AdapterManager] Adapter "${name}" gagal init — akan dilewati.`);
          }
        } catch (err) {
          logger.error(`[AdapterManager] Error init adapter "${name}":`, err.message);
        }
      }
    }
  }

  /**
   * Eksekusi efek berdasarkan payload
   * @param {object} payload
   * @param {string} payload.adapter  - nama adapter target
   * @param {string} payload.action   - nama action
   * @param {object} payload.params   - parameter tambahan
   */
  async execute(payload) {
    const { adapter: adapterName, action, params = {} } = payload;

    if (!adapterName) {
      logger.warn('[AdapterManager] Payload tidak memiliki field "adapter".');
      return;
    }

    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      logger.warn(`[AdapterManager] Adapter "${adapterName}" tidak ditemukan.`);
      logger.warn(`[AdapterManager] Adapter terdaftar: ${[...this.adapters.keys()].join(', ') || '(kosong)'}`);
      return;
    }

    logger.info(`[AdapterManager] Routing → [${adapterName}] action="${action}"`);
    await adapter.execute({ action, params });
  }

  /**
   * Destroy semua adapter (cleanup)
   */
  async destroyAll() {
    for (const [name, adapter] of this.adapters.entries()) {
      if (typeof adapter.destroy === 'function') {
        try { await adapter.destroy(); } catch {}
        logger.debug(`[AdapterManager] Adapter "${name}" destroyed.`);
      }
    }
  }
}

module.exports = new AdapterManager();
