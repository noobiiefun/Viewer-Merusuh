// server/db/database.js
// Singleton koneksi SQLite — import ini di mana pun butuh DB

const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../viewer-merusuh.db')

let _db = null
let Database = null

// ── Load better-sqlite3 dengan error handling yang jelas ────────────
try {
  Database = require('better-sqlite3')
} catch (err) {
  console.error('\n❌ [Database] Gagal load better-sqlite3:', err.message)
  if (err.message.includes('bindings file') || err.message.includes('NODE_MODULE_VERSION')) {
    console.error(`
  ════════════════════════════════════════════════════
   FIX: better-sqlite3 native binding tidak cocok
  ════════════════════════════════════════════════════
   Jalankan perintah ini di root project:

     rd /s /q node_modules\\better-sqlite3
     npm install better-sqlite3@12.11.1

   Lalu jalankan ulang aplikasi.
  ════════════════════════════════════════════════════
    `)
  }
  throw err
}

function getDB() {
  if (!_db) {
    try {
      _db = new Database(DB_PATH)
      _db.pragma('journal_mode = WAL')
      _db.pragma('foreign_keys = ON')
    } catch (err) {
      console.error('❌ [Database] Gagal buka database:', err.message)
      throw err
    }
  }
  return _db
}

module.exports = { getDB }
