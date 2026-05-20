const SECRET = process.env.TURNSTILE_SECRET_KEY

async function requireTurnstile(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next()

  const token = req.headers['cf-turnstile-response']
  if (!token) {
    return res.status(400).json({ error: '请完成人机验证' })
  }

  try {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: SECRET,
        response: token,
        remoteip: req.ip
      })
    })

    const data = await verifyRes.json()
    if (!data.success) {
      return res.status(403).json({ error: '人机验证失败，请重试' })
    }

    next()
  } catch (err) {
    console.error('[Turnstile] 验证失败:', err.message)
    return res.status(503).json({ error: '人机验证服务异常' })
  }
}

module.exports = { requireTurnstile }
