const express = require('express')
const cors = require('cors')
const path = require('path')
const { getDb } = require('./lib/db')
const foodsRouter = require('./routes/foods')

const app = express()
const PORT = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

// 触发数据库初始化
getDb()

// 路由
app.use('/api/foods', foodsRouter)

// 生产环境：serve 前端静态文件
if (isProd) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist')
  app.use(express.static(clientDist))
  app.get('/{path*}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Datelife server running on http://localhost:${PORT}`)
})
