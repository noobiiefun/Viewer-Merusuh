'use strict';

/**
 * Internal event bus
 * Digunakan untuk komunikasi antar modul tanpa coupling langsung.
 *
 * Events yang dipakai:
 *   'log'            { level, message, timestamp }
 *   'effect'         payload efek lengkap dari server
 *   'conn:status'    { status: 'connected'|'disconnected'|'reconnecting', serverUrl }
 *   'adapter:status' { name, enabled, error? }
 */

const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(30);

module.exports = bus;
