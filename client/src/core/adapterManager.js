'use strict';

/**
 * adapterManager.js — Router efek ke adapter yang sesuai
 * Step 2: tambah support logging execution time dan error recovery
 */

const logger = require('../utils/logger');

class AdapterManager {
  constructor() {
    this._adapters = new Map();
    // Track execution stats per adapter
    this._stats = new Map();
  }

  /**
   * Register adapter
   * @param {string} name - nama adapter (misal: 'ahk', 'vjoy')
   * @param {object} adapter - object dengan method execute(payload)
   */
  register(name, adapter) {
    if (!adapter || typeof adapter.execute !== 'function') {
      throw new Error(`Adapter "${name}" harus memiliki method execute()`);
    }
    this._adapters.set(name, adapter);
    this._stats.set(name, { success: 0, failed: 0, totalMs: 0 });
    logger.info(`[AdapterManager] Adapter terdaftar: ${name}`);
  }

  /**
   * Eksekusi efek berdasarkan payload.adapter
   * @param {object} payload - event 'effect' dari server
   */
  async execute(payload) {
    const { id, name: effectName, adapter: adapterName, action, params, duration_ms, donation } = payload;

    logger.info(`[AdapterManager] Efek diterima: "${effectName}" (id=${id}) → adapter=${adapterName} action=${action}`);

    const adapter = this._adapters.get(adapterName);
    if (!adapter) {
      logger.warn(`[AdapterManager] Adapter "${adapterName}" tidak terdaftar. Efek diabaikan.`);
      return;
    }

    const stats = this._stats.get(adapterName);
    const startTime = Date.now();

    try {
      await adapter.execute({ action, params, duration_ms, donation });
      const elapsed = Date.now() - startTime;
      stats.success++;
      stats.totalMs += elapsed;
      logger.info(`[AdapterManager] ✓ Efek "${effectName}" selesai dalam ${elapsed}ms`);
    } catch (err) {
      const elapsed = Date.now() - startTime;
      stats.failed++;
      logger.error(`[AdapterManager] ✗ Efek "${effectName}" gagal setelah ${elapsed}ms: ${err.message}`);
    }
  }

  /**
   * Daftar adapter terdaftar
   */
  listAdapters() {
    return [...this._adapters.keys()];
  }

  /**
   * Statistik eksekusi
   */
  getStats() {
    const result = {};
    for (const [name, s] of this._stats.entries()) {
      const avgMs = s.success > 0 ? Math.round(s.totalMs / s.success) : 0;
      result[name] = { ...s, avgMs };
    }
    return result;
  }
}

// Singleton
module.exports = new AdapterManager();
