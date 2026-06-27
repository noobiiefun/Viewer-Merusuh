'use strict';

/**
 * Adapter Manager
 * Router efek → adapter yang sesuai berdasarkan payload.adapter
 */

const logger = require('../utils/logger');
const bus    = require('./eventBus');

class AdapterManager {
  constructor() {
    this.adapters = new Map();
  }

  register(name, adapter) {
    this.adapters.set(name, adapter);
    logger.debug(`[AdapterManager] Adapter "${name}" terdaftar.`);
  }

  async initAll() {
    for (const [name, adapter] of this.adapters.entries()) {
      if (typeof adapter.init === 'function') {
        try {
          const ok      = await adapter.init();
          const enabled = ok !== false;
          bus.emit('adapter:status', { name, enabled, error: enabled ? null : 'Gagal init' });
        } catch (err) {
          logger.error(`[AdapterManager] Error init "${name}":`, err.message);
          bus.emit('adapter:status', { name, enabled: false, error: err.message });
        }
      } else {
        bus.emit('adapter:status', { name, enabled: true });
      }
    }
  }

  async execute(payload) {
    const { adapter: adapterName, action, params = {}, duration_ms = 0, donation = {} } = payload;
    if (!adapterName) { logger.warn('[AdapterManager] Payload tidak ada field "adapter".'); return; }

    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      logger.warn(`[AdapterManager] Adapter "${adapterName}" tidak ditemukan.`);
      return;
    }

    logger.info(`[AdapterManager] → [${adapterName}] action="${action}"`);
    await adapter.execute({ action, params, duration_ms, donation });
  }

  async destroyAll() {
    for (const [name, adapter] of this.adapters.entries()) {
      if (typeof adapter.destroy === 'function') {
        try { await adapter.destroy(); } catch {}
      }
    }
  }
}

module.exports = new AdapterManager();
