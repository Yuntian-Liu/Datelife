const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'datelife.db')

const sql = process.argv[2]
const flag1 = process.argv[3]
const flag2 = process.argv[4]

if (!sql) {
  console.log('用法: node server/manage.js "<SQL>" [--yes] [--force]')
  console.log('')
  console.log('  示例:')
  console.log('    查: node server/manage.js "SELECT * FROM invite_codes"')
  console.log('    写: node server/manage.js "INSERT INTO invite_codes (code) VALUES (\'abc\')" --yes')
  console.log('  删除: node server/manage.js "DROP TABLE x" --yes --force')
  process.exit(0)
}

const confirmed = flag1 === '--yes'
const force = (flag1 === '--force' || flag2 === '--force')

// 安全检查
const sqlUpper = sql.trim().toUpperCase()
const isSelect = sqlUpper.startsWith('SELECT') || sqlUpper.startsWith('PRAGMA') || sqlUpper.startsWith('EXPLAIN')
const isDrop = sqlUpper.startsWith('DROP ') || sqlUpper.startsWith('ALTER ')

if (isDrop) {
  if (!confirmed) {
    console.log('[拒绝] DDL 操作需加 --yes')
    console.log(`  预览: ${sql.slice(0, 80)}...`)
    process.exit(1)
  }
  if (!force) {
    console.log('[拒绝] DDL 操作需加 --force 二次确认')
    process.exit(1)
  }
}

// 连接数据库
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

const stmt = db.prepare(sql)

if (isSelect) {
  // 只读：直接执行
  const rows = stmt.all()
  if (rows.length === 0) {
    console.log('(无结果)')
  } else {
    const cols = Object.keys(rows[0])
    console.log(cols.join('  |  '))
    console.log('-'.repeat(cols.join('  |  ').length))
    rows.forEach(row => console.log(cols.map(c => String(row[c] ?? 'NULL')).join('  |  ')))
    console.log(`\n${rows.length} row(s)`)
  }
} else {
  // 写操作：先预览
  if (!confirmed) {
    const words = sqlUpper.split(/\s+/)
    const op = words[0]
    console.log(`[预览] 即将执行: ${sql.slice(0, 120)}`)
    console.log(`  操作类型: ${op}`)
    console.log('  加 --yes 确认执行')
    process.exit(0)
  }
  const result = stmt.run()
  console.log(`[执行完成] ${result.changes} row(s) affected`)
}

db.close()
