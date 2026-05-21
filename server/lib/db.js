const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'datelife.db')
console.log('[DB] 数据库路径:', DB_PATH)

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
      user_id         INTEGER,
      name            TEXT NOT NULL,
      barcode         TEXT,
      produce_date    TEXT NOT NULL,
      shelf_life_days INTEGER NOT NULL,
      expire_date     TEXT NOT NULL,
      category        TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      uid           INTEGER UNIQUE,
      email         TEXT UNIQUE NOT NULL,
      nickname      TEXT NOT NULL,
      avatar_seed   TEXT,
      bio           TEXT DEFAULT '',
      password_hash TEXT,
      salt          TEXT,
      is_admin      INTEGER DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      email      TEXT PRIMARY KEY,
      code       TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts   INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tags (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      code        TEXT UNIQUE NOT NULL,
      used_by     INTEGER,
      used_at     TEXT,
      expires_at  TEXT,
      max_uses    INTEGER DEFAULT 1,
      use_count   INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `)

  // 给 foods 表添加 user_id 列（如果不存在）
  try {
    db.prepare('ALTER TABLE foods ADD COLUMN user_id INTEGER').run()
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 给 users 表添加 badge 列（如果不存在）
  try {
    db.prepare('ALTER TABLE users ADD COLUMN badge TEXT DEFAULT NULL').run()
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 给 foods 表添加 shelf_life_unit 列（如果不存在）
  try {
    db.prepare("ALTER TABLE foods ADD COLUMN shelf_life_unit TEXT DEFAULT '天'").run()
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 给 foods 表添加 tags 列（如果不存在）
  try {
    db.prepare("ALTER TABLE foods ADD COLUMN tags TEXT DEFAULT '[]'").run()
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 首次启动：从 foods 迁移已有标签到 tags 表
  const tagCount = db.prepare('SELECT COUNT(*) AS c FROM tags').get()
  if (tagCount.c === 0) {
    const rows = db.prepare("SELECT user_id, tags FROM foods WHERE tags != '[]'").all()
    const insertTag = db.prepare('INSERT OR IGNORE INTO tags (user_id, name) VALUES (?, ?)')
    for (const row of rows) {
      try {
        const arr = JSON.parse(row.tags)
        if (Array.isArray(arr)) arr.forEach(t => { if (t) insertTag.run(row.user_id, t) })
      } catch {}
    }
  }

  // 种子邀请码（仅表为空时插入）
  const inviteCount = db.prepare('SELECT COUNT(*) AS c FROM invite_codes').get()
  if (inviteCount.c === 0) {
    const insertInvite = db.prepare('INSERT INTO invite_codes (code, max_uses) VALUES (?, 1)')
    const seeds = ['datelife-alpha-2026', 'early-bird-2026', 'inner-test-001', 'inner-test-002', 'inner-test-003']
    seeds.forEach(code => insertInvite.run(code))
  }
}

function getNextUid() {
  const row = db.prepare('SELECT COALESCE(MAX(uid), 99999) + 1 AS next_uid FROM users').get()
  return row.next_uid
}

module.exports = { getDb, getNextUid }
