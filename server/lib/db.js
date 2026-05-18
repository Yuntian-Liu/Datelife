const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'datelife.db')

let db

function getDb() {
  if (!db) {
    const fs = require('fs')
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initTables()
  }
  return db
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS foods (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      barcode         TEXT,
      produce_date    TEXT NOT NULL,
      shelf_life_days INTEGER NOT NULL,
      expire_date     TEXT NOT NULL,
      category        TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `)
}

module.exports = { getDb }
