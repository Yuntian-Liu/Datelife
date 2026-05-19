const rateLimit = require('express-rate-limit')

const sendCodeLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  message: { error: '发送过于频繁，请 1 分钟后再试' },
  keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
})

module.exports = { sendCodeLimiter }
