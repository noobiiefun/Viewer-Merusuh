/**
 * utils/logger.js
 * Logger sederhana dengan color-coding untuk console output.
 * Menggunakan chalk v4 (CommonJS compatible).
 */

'use strict';

const chalk = require('chalk');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'] ?? 1;

function timestamp() {
  return new Date().toLocaleTimeString('id-ID', { hour12: false });
}

function tag(label, color) {
  return color(`[${label}]`);
}

const logger = {
  debug(label, ...args) {
    if (currentLevel > 0) return;
    console.log(chalk.gray(timestamp()), tag(label, chalk.gray), ...args);
  },
  info(label, ...args) {
    if (currentLevel > 1) return;
    console.log(chalk.white(timestamp()), tag(label, chalk.cyan), ...args);
  },
  success(label, ...args) {
    if (currentLevel > 1) return;
    console.log(chalk.white(timestamp()), tag(label, chalk.green), ...args);
  },
  warn(label, ...args) {
    if (currentLevel > 2) return;
    console.warn(chalk.yellow(timestamp()), tag(label, chalk.yellow), ...args);
  },
  error(label, ...args) {
    console.error(chalk.red(timestamp()), tag(label, chalk.red), ...args);
  },
};

module.exports = logger;
