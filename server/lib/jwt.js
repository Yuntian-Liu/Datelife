const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET
if (!SECRET) {
  console.warn('[JWT] 警告: 未配置 JWT_SECRET，请设置环境变量')
}

function sign(payload) {
  if (!SECRET) throw new Error('JWT_SECRET 未配置')
  return jwt.sign(payload, SECRET, { expiresIn: '30d' })
}

function verify(token) {
  if (!SECRET) throw new Error('JWT_SECRET 未配置')
  return jwt.verify(token, SECRET)
}

module.exports = { sign, verify }
