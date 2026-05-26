const { Router } = require('express')
const QRCode = require('qrcode')
const { getDb, generateShortId } = require('../lib/db')
const { authRequired } = require('../middleware/auth')

const router = Router()

function calcExpireDate(produceDate, shelfLifeDays) {
  const d = new Date(produceDate)
  d.setDate(d.getDate() + shelfLifeDays)
  return d.toISOString().slice(0, 10)
}

function getStatus(expireDate) {
  // 统一使用 UTC+8 计算"今天"
  const now = new Date()
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const today = new Date(Date.UTC(utc8.getUTCFullYear(), utc8.getUTCMonth(), utc8.getUTCDate()))

  const expire = new Date(expireDate)
  expire.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((expire - today) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { status: 'expired', daysLeft }
  if (daysLeft <= 14) return { status: 'expiring', daysLeft }
  return { status: 'normal', daysLeft }
}

function attachStatus(food) {
  if (food.consumed_at) {
    return { ...food, status: 'consumed', days_left: 0 }
  }
  const { status, daysLeft } = getStatus(food.expire_date)
  return { ...food, status, days_left: daysLeft }
}

const MAX_TAGS = 8

function syncTags(db, userId, tagsJson) {
  try {
    const arr = JSON.parse(tagsJson)
    if (!Array.isArray(arr) || arr.length === 0) return
    const existing = db.prepare('SELECT COUNT(*) AS c FROM tags WHERE user_id = ?').get(userId).c
    const remaining = MAX_TAGS - existing
    if (remaining <= 0) return
    const stmt = db.prepare('INSERT OR IGNORE INTO tags (user_id, name) VALUES (?, ?)')
    let added = 0
    for (const t of arr) {
      if (!t) continue
      if (added >= remaining) break
      const result = stmt.run(userId, t)
      if (result.changes > 0) added++
    }
  } catch {}
}

// 获取食品列表（已登录只返回自己的，未登录返回空）
router.get('/', (req, res) => {
  const db = getDb()
  let foods

  if (req.user) {
    foods = db.prepare('SELECT * FROM foods WHERE user_id = ? AND consumed_at IS NULL ORDER BY created_at DESC').all(req.user.uid)
  } else {
    foods = []
  }

  res.json(foods.map(attachStatus))
})

// 获取当前用户所有标签（从 tags 表读取，独立于食品）
router.get('/tags', (req, res) => {
  const db = getDb()
  if (!req.user) return res.json([])

  const rows = db.prepare('SELECT name FROM tags WHERE user_id = ? ORDER BY name').all(req.user.uid)
  res.json(rows.map(r => r.name))
})

// 新增标签（需要登录）
router.post('/tags', authRequired, (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: '标签名不能为空' })
  const db = getDb()
  const trimmed = name.trim()
  const count = db.prepare('SELECT COUNT(*) AS c FROM tags WHERE user_id = ?').get(req.user.uid).c
  if (count >= MAX_TAGS) return res.status(400).json({ error: `标签最多 ${MAX_TAGS} 个` })
  try {
    db.prepare('INSERT INTO tags (user_id, name) VALUES (?, ?)').run(req.user.uid, trimmed)
    res.json({ name: trimmed })
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: '标签已存在' })
    throw e
  }
})

// 获取单个食品（公开，附加 is_owner 标记）
router.get('/:id', (req, res) => {
  const db = getDb()
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!food) return res.status(404).json({ error: '食品不存在' })

  const result = attachStatus(food)
  result.is_owner = req.user ? food.user_id === req.user.uid : false
  res.json(result)
})

// 通过 uuid 获取食品（公开，用于跨账号二维码扫描）
router.get('/by-uuid/:uuid', (req, res) => {
  const db = getDb()
  const food = db.prepare('SELECT * FROM foods WHERE uuid = ?').get(req.params.uuid)
  if (!food) return res.status(404).json({ error: '食品不存在' })

  const result = attachStatus(food)
  result.is_owner = req.user ? food.user_id === req.user.uid : false
  res.json(result)
})

// 新增食品（需要登录）
router.post('/', authRequired, (req, res) => {
  const { name, barcode, produce_date, shelf_life_days, shelf_life_unit, category, tags, quantity, uuid: requestedUuid } = req.body
  if (!name || !produce_date || !shelf_life_days) {
    return res.status(400).json({ error: '名称、生产日期、保质期天数必填' })
  }

  const expire_date = calcExpireDate(produce_date, shelf_life_days)
  const db = getDb()
  const uuid = requestedUuid || generateShortId()

  const result = db.prepare(`
    INSERT INTO foods (user_id, name, barcode, produce_date, shelf_life_days, shelf_life_unit, expire_date, category, tags, quantity, uuid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.uid, name, barcode || null, produce_date, shelf_life_days, shelf_life_unit || '天', expire_date, category || null, tags || '[]', quantity || 1, uuid)

  syncTags(db, req.user.uid, tags || '[]')

  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(attachStatus(food))
})

// 编辑食品（需要登录 + 是自己的）
router.put('/:id', authRequired, (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: '食品不存在' })
  if (existing.consumed_at) return res.status(400).json({ error: '该食品已被消费，无法编辑' })
  if (existing.user_id !== req.user.uid) return res.status(403).json({ error: '无权操作此食品' })

  const name = req.body.name ?? existing.name
  const barcode = req.body.barcode ?? existing.barcode
  const produce_date = req.body.produce_date ?? existing.produce_date
  const shelf_life_days = req.body.shelf_life_days ?? existing.shelf_life_days
  const shelf_life_unit = req.body.shelf_life_unit ?? existing.shelf_life_unit ?? '天'
  const category = req.body.category ?? existing.category
  const tags = req.body.tags ?? existing.tags
  const quantity = req.body.quantity ?? existing.quantity ?? 1
  const expire_date = calcExpireDate(produce_date, shelf_life_days)

  db.prepare(`
    UPDATE foods SET name=?, barcode=?, produce_date=?, shelf_life_days=?, shelf_life_unit=?, expire_date=?, category=?, tags=?, quantity=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(name, barcode, produce_date, shelf_life_days, shelf_life_unit, expire_date, category, tags, quantity, req.params.id)

  syncTags(db, req.user.uid, tags)

  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  res.json(attachStatus(food))
})

// 吃掉一件（需要登录 + 是自己的）
router.post('/:id/consume', authRequired, (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: '食品不存在' })
  if (existing.user_id !== req.user.uid) return res.status(403).json({ error: '无权操作此食品' })

  const qty = existing.quantity ?? 1
  if (qty <= 1) {
    db.prepare("UPDATE foods SET quantity = 0, consumed_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?")
      .run(req.params.id)
    return res.json({ deleted: true })
  }

  db.prepare("UPDATE foods SET quantity = quantity - 1, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(req.params.id)
  res.json({ quantity: qty - 1 })
})

// 删除食品（需要登录 + 是自己的）
router.delete('/:id', authRequired, (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: '食品不存在' })
  if (existing.user_id !== req.user.uid) return res.status(403).json({ error: '无权操作此食品' })

  const result = db.prepare("UPDATE foods SET consumed_at = datetime('now','localtime'), updated_at = datetime('now','localtime'), quantity = 0 WHERE id = ?").run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: '食品不存在' })
  res.json({ success: true })
})

// 全局删除标签（需要登录）
router.delete('/tags/:tagName', authRequired, (req, res) => {
  const db = getDb()
  const tagName = decodeURIComponent(req.params.tagName)
  if (!tagName) return res.status(400).json({ error: '标签名不能为空' })

  // 从 tags 表删除
  db.prepare('DELETE FROM tags WHERE user_id = ? AND name = ?').run(req.user.uid, tagName)

  // 找到所有包含该标签的食品
  const foods = db.prepare("SELECT id, tags FROM foods WHERE user_id = ? AND tags != '[]'").all(req.user.uid)
  let affected = 0
  for (const food of foods) {
    try {
      let tags = JSON.parse(food.tags)
      if (!Array.isArray(tags)) continue
      const idx = tags.indexOf(tagName)
      if (idx >= 0) {
        tags.splice(idx, 1)
        db.prepare("UPDATE foods SET tags = ?, updated_at = datetime('now','localtime') WHERE id = ?")
          .run(JSON.stringify(tags), food.id)
        affected++
      }
    } catch {}
  }
  res.json({ success: true, affected })
})

// 二维码颜色映射
const QR_COLORS = {
  normal: '#22c55e',
  expiring: '#eab308',
  expired: '#ef4444'
}

// 二维码生成（公开）
router.get('/:id/qrcode', (req, res) => {
  const db = getDb()
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!food) return res.status(404).json({ error: '食品不存在' })
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
  const url = `${baseUrl}/u/${food.uuid}`
  const { status } = getStatus(food.expire_date)
  const darkColor = QR_COLORS[status] || QR_COLORS.normal
  QRCode.toBuffer(url, { width: 256, margin: 2, color: { dark: darkColor, light: '#ffffff' } }, (err, buffer) => {
    if (err) return res.status(500).json({ error: '二维码生成失败' })
    res.type('image/png')
    res.set('Cache-Control', 'no-store')
    res.send(buffer)
  })
})

module.exports = router
