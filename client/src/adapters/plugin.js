/**
 * adapters/plugin.js
 * Plugin adapter untuk sisi client.
 *
 * Status: STUB — Step 4 akan mengimplementasikan logika penuh.
 *
 * Cara kerja yang direncanakan (Step 4):
 *  - Client membuka HTTP server lokal di port PLUGIN_LOCAL_PORT
 *  - Game plugin (GTA5 / BeamNG / dll) polling ke /api/plugin/pending
 *  - Client menyimpan antrian efek dan menyajikannya ke game plugin
 *
 * Ini memungkinkan game plugin tetap bisa digunakan meski server
 * berada di PC yang berbeda.
 */

'use strict';

const logger = require('../utils/logger');

const LABEL = 'Plugin';

class PluginAdapter {
  constructor() {
    this._queue = [];
  }

  async init() {
    logger.warn(LABEL, '⚙️  Plugin adapter belum diimplementasikan (coming in Step 4).');
    logger.warn(LABEL, 'Set ADAPTER_PLUGIN=false di .env untuk menonaktifkan pesan ini.');
  }

  execute({ action, params, raw }) {
    // Di Step 4: push ke antrian yang bisa di-polling game plugin
    logger.warn(LABEL, `Plugin stub — action "${action}" dimasukkan ke queue (belum ada consumer).`);
    this._queue.push({ action, params, raw, timestamp: Date.now() });
  }
}

module.exports = PluginAdapter;
