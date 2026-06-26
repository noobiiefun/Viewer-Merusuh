'use strict';

const config = (() => {
  try { return require('./config'); } catch { return { LOG_LEVEL: 'info' }; }
})();

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const current = LEVELS[config.LOG_LEVEL] ?? LEVELS.info;

const C = {
  reset:  '\x1b[0m',
  gray:   '\x1b[90m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
};

function ts() {
  return new Date().toTimeString().slice(0, 8);
}

const logger = {
  debug: (msg) => { if (current <= 0) console.log(`${C.gray}[${ts()}] DBG${C.reset} ${msg}`); },
  info:  (msg) => { if (current <= 1) console.log(`${C.cyan}[${ts()}] INF${C.reset} ${msg}`); },
  warn:  (msg) => { if (current <= 2) console.log(`${C.yellow}[${ts()}] WRN${C.reset} ${msg}`); },
  error: (msg) => { if (current <= 3) console.error(`${C.red}[${ts()}] ERR${C.reset} ${msg}`); },
};

module.exports = logger;
