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

  // 给 foods 表添加 quantity 列（如果不存在）
  try {
    db.prepare("ALTER TABLE foods ADD COLUMN quantity INTEGER DEFAULT 1").run()
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 给 foods 表添加 uuid 列（如果不存在）— 跨设备/账号迁移的唯一标识
  try {
    db.prepare("ALTER TABLE foods ADD COLUMN uuid TEXT").run()
  } catch (e) {
    // 列已存在，忽略错误
  }
  try {
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_uuid ON foods(uuid)').run()
  } catch (e) {}

  // 给 foods 表添加 consumed_at 列（软删除标记，NULL = 在库，非空 = 已移除）
  try {
    db.prepare('ALTER TABLE foods ADD COLUMN consumed_at TEXT DEFAULT NULL').run()
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 回填已有数据的 uuid（仅 uuid 为空的行）
  const emptyUuid = db.prepare("SELECT id FROM foods WHERE uuid IS NULL OR uuid = ''").all()
  if (emptyUuid.length > 0) {
    const updateUuid = db.prepare('UPDATE foods SET uuid = ? WHERE id = ?')
    for (const row of emptyUuid) {
      updateUuid.run(generateShortId(), row.id)
    }
    console.log(`[DB] 回填 ${emptyUuid.length} 条食品的 uuid`)
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

  // 种子邀请码（INSERT OR IGNORE，新增码自动写入，已有码不重复）
  const insertInvite = db.prepare('INSERT OR IGNORE INTO invite_codes (code, max_uses) VALUES (?, 1)')
  const seeds = [
    'datelife-alpha-2026',
    'datelife-bty0fa', 'datelife-b0ehom', 'datelife-hcdy7h',
    'datelife-063siw', 'datelife-ksjkoc', 'datelife-29mfbl',
    'datelife-is4r6k', 'datelife-32hgyp', 'datelife-lalizb',
    'datelife-lw4azq'
  ]
  seeds.forEach(code => insertInvite.run(code))
}

function getNextUid() {
  const row = db.prepare('SELECT COALESCE(MAX(uid), 99999) + 1 AS next_uid FROM users').get()
  return row.next_uid
}

// 8 位短唯一 ID，排除易混淆字符 o/0/l/1
const SHORT_ID_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789'
function generateShortId() {
  const crypto = require('crypto')
  const bytes = crypto.randomBytes(8)
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += SHORT_ID_CHARS[bytes[i] % SHORT_ID_CHARS.length]
  }
  return id
}

module.exports = { getDb, getNextUid, generateShortId }
