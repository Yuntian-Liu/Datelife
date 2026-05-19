const { verify } = require('../lib/jwt')

function authRequired(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' })
  }
  try {
    req.user = verify(header.slice(7))
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verify(header.slice(7))
    } catch {
      // token 无效，忽略
    }
  }
  next()
}

module.exports = { authRequired, optionalAuth }
