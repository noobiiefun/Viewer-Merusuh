// server/core/eventBus.js
// Internal EventEmitter — backbone komunikasi antar modul
// Setiap donasi masuk akan di-emit ke sini, lalu diterima effectEngine

const { EventEmitter } = require('events')

const eventBus = new EventEmitter()
eventBus.setMaxListeners(20)

// Event yang digunakan:
// 'donation'  → { platform, donatorName, amount, message, rawPayload }
// 'effect'    → { effectId, effectName, actionKey, adapter, durationMs, donation }
// 'log'       → { level, message, data }

module.exports = eventBus
