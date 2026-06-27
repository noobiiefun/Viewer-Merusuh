'use strict';

/**
 * Logger dengan color-coding dan forward ke dashboard event bus
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = {
  error: '\x1b[31m',   // merah
  warn:  '\x1b[33m',   // kuning
  info:  '\x1b[36m',   // cyan
  debug: '\x1b[90m',   // abu-abu
  reset: '\x1b[0m',
};

const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

let _bus = null;
// Lazy-load bus untuk hindari circular require
function getBus() {
  if (!_bus) {
    try { _bus = require('../core/eventBus'); } catch {}
  }
  return _bus;
}

function log(level, ...args) {
  if (LEVELS[level] > currentLevel) return;

  const ts  = new Date().toLocaleTimeString('id-ID', { hour12: false });
  const col = COLORS[level] || '';
  const rst = COLORS.reset;
  const tag = level.toUpperCase().padEnd(5);
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

  process.stdout.write(`${col}[${ts}] ${tag}${rst} ${msg}\n`);

  // Forward ke dashboard via bus (non-blocking, best-effort)
  try {
    const bus = getBus();
    if (bus) bus.emit('log', { level, message: msg, timestamp: Date.now() });
  } catch {}
}

const logger = {
  error: (...a) => log('error', ...a),
  warn:  (...a) => log('warn',  ...a),
  info:  (...a) => log('info',  ...a),
  debug: (...a) => log('debug', ...a),
};

module.exports = logger;
