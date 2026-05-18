const { Router } = require('express')
const QRCode = require('qrcode')
const { getDb } = require('../lib/db')

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

// 获取所有食品
router.get('/', (req, res) => {
  const db = getDb()
  const foods = db.prepare('SELECT * FROM foods ORDER BY created_at DESC').all()
  res.json(foods.map(attachStatus))
})

// 获取单个食品（详情页用，无需登录）
router.get('/:id', (req, res) => {
  const db = getDb()
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!food) return res.status(404).json({ error: '食品不存在' })
  res.json(attachStatus(food))
})

// 新增食品
router.post('/', (req, res) => {
  const { name, barcode, produce_date, shelf_life_days, category } = req.body
  if (!name || !produce_date || !shelf_life_days) {
    return res.status(400).json({ error: '名称、生产日期、保质期天数必填' })
  }
  const expire_date = calcExpireDate(produce_date, shelf_life_days)
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO foods (name, barcode, produce_date, shelf_life_days, expire_date, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, barcode || null, produce_date, shelf_life_days, expire_date, category || null)
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(attachStatus(food))
})

// 编辑食品
router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: '食品不存在' })

  const name = req.body.name ?? existing.name
  const barcode = req.body.barcode ?? existing.barcode
  const produce_date = req.body.produce_date ?? existing.produce_date
  const shelf_life_days = req.body.shelf_life_days ?? existing.shelf_life_days
  const category = req.body.category ?? existing.category
  const expire_date = calcExpireDate(produce_date, shelf_life_days)

  db.prepare(`
    UPDATE foods SET name=?, barcode=?, produce_date=?, shelf_life_days=?, expire_date=?, category=?, updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(name, barcode, produce_date, shelf_life_days, expire_date, category, req.params.id)

  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  res.json(attachStatus(food))
})

// 删除食品
router.delete('/:id', (req, res) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM foods WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: '食品不存在' })
  res.json({ success: true })
})

// 二维码生成（返回 PNG 图片）
router.get('/:id/qrcode', (req, res) => {
  const db = getDb()
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id)
  if (!food) return res.status(404).json({ error: '食品不存在' })
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
  const url = `${baseUrl}/f/${food.id}`
  QRCode.toBuffer(url, { width: 256, margin: 2, errorCorrectionLevel: 'L' }, (err, buffer) => {
    if (err) return res.status(500).json({ error: '二维码生成失败' })
    res.type('image/png')
    res.set('Cache-Control', 'no-store')
    res.send(buffer)
  })
})

module.exports = router
