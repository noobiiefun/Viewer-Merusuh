/**
 * adapters/vjoy.js
 * Adapter vJoy / ViGEmBus untuk sisi client.
 *
 * Status: STUB — Step 3 akan mengimplementasikan logika penuh.
 *
 * Dependency yang dibutuhkan:
 *   npm install vigemclient        (ViGEmBus virtual gamepad)
 *
 * ViGEmBus harus terinstall di PC Gaming:
 *   https://github.com/nefarius/ViGEmBus/releases
 */

'use strict';

const logger = require('../utils/logger');

const LABEL = 'vJoy';

class VjoyAdapter {
  constructor() {
    this.client = null;
    this.controller = null;
  }

  async init() {
    logger.warn(LABEL, '⚙️  vJoy adapter belum diimplementasikan (coming in Step 3).');
    logger.warn(LABEL, 'Set ADAPTER_VJOY=false di .env untuk menonaktifkan pesan ini.');
  }

  execute({ action, params }) {
    logger.warn(LABEL, `vJoy stub — action "${action}" dilewati.`);
  }
}

module.exports = VjoyAdapter;
