// server/db/database.js
// Singleton koneksi SQLite — import ini di mana pun butuh DB

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '../../viewer-merusuh.db')

let _db = null

function getDB() {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
  }
  return _db
}

module.exports = { getDB }
