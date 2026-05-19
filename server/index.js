require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const express = require('express')
const cors = require('cors')
const path = require('path')
const { getDb } = require('./lib/db')
const foodsRouter = require('./routes/foods')
const barcodeRouter = require('./routes/barcode')
const authRouter = require('./routes/auth')
const { optionalAuth } = require('./middleware/auth')

const app = express()
const PORT = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

// 触发数据库初始化
getDb()

// 路由
app.use('/api/foods', optionalAuth, foodsRouter)
app.use('/api/barcode', barcodeRouter)
app.use('/api/auth', authRouter)

// 生产环境：serve 前端静态文件
if (isProd) {
  const clientDist = path.join(__dirname, 'client', 'dist')
  app.use(express.static(clientDist, { fallthrough: true }))
  // SPA fallback：所有未匹配的 API 路由返回 index.html
  app.use((_req, res, next) => {
    if (!res.headersSent) {
      res.sendFile(path.join(clientDist, 'index.html'))
    } else {
      next()
    }
  })
}

app.listen(PORT, () => {
  console.log(`Datelife server running on http://localhost:${PORT}`)
})
