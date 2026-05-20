const { Router } = require('express')
const QRCode = require('qrcode')
const { getDb } = require('../lib/db')
const { authRequired } = require('../middleware/auth')

const router = Router()

function calcExpireDate(produceDate, shelfLifeDays) {
  const d = new Date(produceDate)
  d.setDate(d.getDate() + shelfLifeDays)
  return d.toISOString().slice(0, 10)
}

function getStatus(expireDate) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expire = new Date(expireDate)
  expire.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((expire - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { status: 'expired', daysLeft }
  if (daysLeft <= 14) return { status: 'expiring', daysLeft }
  return { status: 'normal', daysLeft }
}

function attachStatus(food) {
  const { status, daysLeft } = getStatus(food.expire_date)
  return { ...food, status, days_left: daysLeft }
}

// 获取食品列表（已登录只返回自己的，未登录返回空）
router.get('/', (req, res) => {
  const db = getDb()
  let foods

  if (req.user) {
    foods = db.prepare('SELECT * FROM foods WHERE user_id = ? ORDER BY created_at DESC').all(req.user.uid)
  } else {
    foods = []
  }

  res.json(foods.map(attachStatus))
})

// 获取当前用户所有已用标签（去重聚合，用于录入自动补全）
router.get('/tags', (req, res) => {
  const db = getDb()
  if (!req.user) return res.json([])

  const rows = db.prepare("SELECT tags FROM foods WHERE user_id = ? AND tags != '[]'").all(req.user.uid)
  const tagSet = new Set()
  for (const row of rows) {
    try {
      const arr = JSON.parse(row.tags)
      if (Array.isArray(arr)) arr.forEach(t => { if (t) tagSet.add(t) })
    } catch {}
  }
  res.json([...tagSet].sort())
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

// 新增食品（需要登录）
router.post('/', authRequired, (req, res) => {
  const { name, barcode, produce_date, shelf_life_days, shelf_life_unit, category, tags } = req.body
  if (!name || !produce_date || !shelf_life_days) {
    return res.status(400).json({ error: '名称、生产日期、保质期天数必填' })
  }

  const expire_date = calcExpireDate(produce_date, shelf_life_days)
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO foods (user_id, name, barcode, produce_date, shelf_life_days, shelf_life_unit, expire_date, category, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.uid, name, barcode || null, produce_date, shelf_life_days, shelf_life_unit || '天', expire_date, category || null, tags || '[]')

  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(attachStatus(food))
})

// 编辑食品（需要登录 + 是自己的）
router.put('/:id', authRequired, (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: '食品不存在' })
  if (existing.user_id !== req.user.uid) return res.status(403).json({ error: '无权操作此食品' })

  const name = req.body.name ?? existing.name
  const barcode = req.body.barcode ?? existing.barcode
  const produce_date = req.body.produce_date ?? existing.produce_date
  const shelf_life_days = req.body.shelf_life_days ?? existing.shelf_life_days
  const shelf_life_unit = req.body.shelf_life_unit ?? existing.shelf_life_unit ?? '天'
  const category = req.body.category ?? existing.category
  const tags = req.body.tags ?? existing.tags
  const expire_date = calcExpireDate(produce_date, shelf_life_days)

  db.prepare(`
    UPDATE foods SET name=?, barcode=?, produce_date=?, shelf_life_days=?, shelf_life_unit=?, expire_date=?, category=?, tags=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(name, barcode, produce_date, shelf_life_days, shelf_life_unit, expire_date, category, tags, req.params.id)

  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  res.json(attachStatus(food))
})

// 删除食品（需要登录 + 是自己的）
router.delete('/:id', authRequired, (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: '食品不存在' })
  if (existing.user_id !== req.user.uid) return res.status(403).json({ error: '无权操作此食品' })

  const result = db.prepare('DELETE FROM foods WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: '食品不存在' })
  res.json({ success: true })
})

// 全局删除标签（需要登录）
router.delete('/tags/:tagName', authRequired, (req, res) => {
  const db = getDb()
  const tagName = decodeURIComponent(req.params.tagName)
  if (!tagName) return res.status(400).json({ error: '标签名不能为空' })

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
  const url = `${baseUrl}/f/${food.id}`
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
