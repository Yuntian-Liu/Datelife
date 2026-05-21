const { Router } = require('express')
const crypto = require('crypto')
const { getDb, getNextUid } = require('../lib/db')
const { sign } = require('../lib/jwt')
const { sendVerificationCode } = require('../lib/email')
const { authRequired } = require('../middleware/auth')
const { requireTurnstile } = require('../middleware/turnstile')
const { sendCodeLimiter } = require('../middleware/rateLimit')

const router = Router()

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex')
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex')
}

// POST /api/auth/send-code — 发送验证码
router.post('/send-code', sendCodeLimiter, requireTurnstile, async (req, res) => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' })
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const db = getDb()
  db.prepare(`
    INSERT INTO verification_codes (email, code, expires_at, attempts)
    VALUES (?, ?, ?, 0)
    ON CONFLICT(email) DO UPDATE SET code=?, expires_at=?, attempts=0
  `).run(email, code, expiresAt, code, expiresAt)

  try {
    await sendVerificationCode(email, code)
    res.json({ success: true, message: '验证码已发送' })
  } catch (err) {
    console.error('[Auth] 发送邮件失败:', err.message)
    res.status(500).json({ error: '验证码发送失败，请稍后重试' })
  }
})

// POST /api/auth/check-email — 检查邮箱状态（发验证码前调用）
router.post('/check-email', (req, res) => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email)

  if (user) {
    // 已注册 → 直接可以登录
    res.json({ exists: true, needInvite: false })
  } else if (process.env.INVITE_MODE === 'true') {
    // 未注册 + 邀请码模式 → 需要邀请码
    res.json({ exists: false, needInvite: true })
  } else {
    // 未注册 + 公开模式 → 正常注册流程
    res.json({ exists: false, needInvite: false })
  }
})

// POST /api/auth/verify-invite — 校验邀请码（不发邮件，仅预检）
router.post('/verify-invite', (req, res) => {
  const { code: inviteCode } = req.body
  if (!inviteCode) {
    return res.status(400).json({ error: '请输入邀请码' })
  }

  const db = getDb()
  const row = db.prepare(
    "SELECT * FROM invite_codes WHERE code = ? AND (expires_at IS NULL OR expires_at > datetime('now','localtime'))"
  ).get(inviteCode)

  if (!row) {
    return res.status(400).json({ error: '邀请码无效或已过期' })
  }
  if (row.use_count >= row.max_uses) {
    return res.status(400).json({ error: '邀请码使用次数已达上限' })
  }

  // 仅返回校验通过，不扣减次数（注册成功时才标记）
  res.json({ valid: true })
})

// POST /api/auth/login-code — 验证码登录
router.post('/login-code', (req, res) => {
  const { email, code, invite_code: clientInviteCode } = req.body
  if (!email || !code) {
    return res.status(400).json({ error: '邮箱和验证码不能为空' })
  }

  const db = getDb()

  // 如果带了邀请码标记，说明是拦截后的重试，需要先校验邀请码
  if (clientInviteCode) {
    const inviteRow = db.prepare(
      "SELECT * FROM invite_codes WHERE code = ? AND (expires_at IS NULL OR expires_at > datetime('now','localtime'))"
    ).get(clientInviteCode)
    if (!inviteRow || inviteRow.use_count >= inviteRow.max_uses) {
      return res.status(400).json({ error: '邀请码无效或已过期' })
    }
  }

  // 查验证码
  const vc = db.prepare('SELECT * FROM verification_codes WHERE email = ?').get(email)
  if (!vc) {
    return res.status(400).json({ error: '请先发送验证码' })
  }
  if (new Date(vc.expires_at) < new Date()) {
    return res.status(400).json({ error: '验证码已过期，请重新发送' })
  }
  if (vc.attempts >= 5) {
    return res.status(429).json({ error: '验证码尝试次数过多，请重新发送' })
  }

  // 记录尝试次数
  db.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ?').run(email)

  if (vc.code !== code) {
    return res.status(400).json({ error: '验证码错误' })
  }

  // 验证码正确，查用户
  const user = db.prepare('SELECT id, uid, email, nickname, avatar_seed, bio, is_admin, badge FROM users WHERE email = ?').get(email)

  if (user) {
    // 已有账号 → 登录
    const token = sign({ uid: user.uid, email: user.email, nickname: user.nickname })
    res.json({ token, user })
  } else {
    // 新用户 → 返回 needRegister
    res.json({ needRegister: true, email })
  }
})

// POST /api/auth/login-password — 密码登录
router.post('/login-password', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码不能为空' })
  }

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)

  if (!user) {
    return res.status(401).json({ error: '账号不存在，请先用验证码注册' })
  }
  if (!user.password_hash || !user.salt) {
    return res.status(401).json({ error: '该账号未设置密码，请用验证码登录' })
  }

  const hash = hashPassword(password, user.salt)
  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.password_hash))) {
    return res.status(401).json({ error: '密码错误' })
  }

  const token = sign({ uid: user.uid, email: user.email, nickname: user.nickname })
  const { password_hash: _, salt: __, ...safeUser } = user
  res.json({ token, user: safeUser })
})

// POST /api/auth/register — 注册（新用户填完昵称密码后）
router.post('/register', (req, res) => {
  const { email, code, nickname, password, bio, avatar_seed: clientAvatarSeed, invite_code: clientInviteCode } = req.body
  if (!email || !code || !nickname || !password) {
    return res.status(400).json({ error: '所有字段都不能为空' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' })
  }

  const db = getDb()

  // 重新验证验证码
  const vc = db.prepare('SELECT * FROM verification_codes WHERE email = ?').get(email)
  if (!vc || vc.code !== code || new Date(vc.expires_at) < new Date()) {
    return res.status(400).json({ error: '验证码无效或已过期' })
  }

  // 检查是否已被注册
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: '该邮箱已被注册' })
  }

  // 创建用户
  const uid = getNextUid()
  const avatar_seed = clientAvatarSeed || ('user-' + crypto.randomBytes(4).toString('hex'))
  const salt = generateSalt()
  const passwordHash = hashPassword(password, salt)

  db.prepare(`
    INSERT INTO users (uid, email, nickname, avatar_seed, bio, password_hash, salt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uid, email, nickname, avatar_seed, bio || '', passwordHash, salt)

  // 标记邀请码已用（如果有）
  if (clientInviteCode) {
    db.prepare(`
      UPDATE invite_codes SET used_by = ?, used_at = datetime('now','localtime'), use_count = use_count + 1
      WHERE code = ?
    `).run(uid, clientInviteCode)
  }

  // 清除验证码
  db.prepare('DELETE FROM verification_codes WHERE email = ?').run(email)

  // 签发 token
  const user = db.prepare('SELECT id, uid, email, nickname, avatar_seed, bio, is_admin, badge FROM users WHERE email = ?').get(email)
  const token = sign({ uid: user.uid, email: user.email, nickname: user.nickname })

  res.status(201).json({ token, user })
})

// GET /api/auth/profile — 获取用户资料
router.get('/profile', authRequired, (req, res) => {
  const db = getDb()
  const user = db.prepare(
    'SELECT id, uid, email, nickname, avatar_seed, bio, is_admin, badge, created_at FROM users WHERE uid = ?'
  ).get(req.user.uid)

  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  res.json(user)
})

// PUT /api/auth/profile — 更新用户资料
router.put('/profile', authRequired, (req, res) => {
  const { nickname, bio, avatar_seed } = req.body
  const db = getDb()

  const current = db.prepare('SELECT nickname, bio, avatar_seed FROM users WHERE uid = ?').get(req.user.uid)
  if (!current) {
    return res.status(404).json({ error: '用户不存在' })
  }

  db.prepare(`
    UPDATE users SET nickname=?, bio=?, avatar_seed=?, updated_at=datetime('now','localtime')
    WHERE uid=?
  `).run(
    nickname ?? current.nickname,
    bio ?? current.bio,
    avatar_seed ?? current.avatar_seed,
    req.user.uid
  )

  const updated = db.prepare(
    'SELECT id, uid, email, nickname, avatar_seed, bio, is_admin, badge, created_at FROM users WHERE uid = ?'
  ).get(req.user.uid)

  res.json(updated)
})

// POST /api/auth/dev-login — 开发模式模拟登录（仅非生产环境可用）
router.post('/dev-login', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }
  const db = getDb()
  const { uid = 100000 } = req.body

  let user = db.prepare(
    'SELECT id, uid, email, nickname, avatar_seed, bio, is_admin, badge FROM users WHERE uid = ?'
  ).get(uid)

  // 用户不存在则自动创建
  if (!user) {
    const nextUid = uid
    db.prepare(`
      INSERT INTO users (uid, email, nickname, avatar_seed, bio, is_admin, badge)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nextUid, 'dev@datelife.app', '碳碳', 'tantan', '好好吃饭，不浪费', 0, 'developer')
    user = db.prepare(
      'SELECT id, uid, email, nickname, avatar_seed, bio, is_admin, badge FROM users WHERE uid = ?'
    ).get(nextUid)
  }

  const token = sign({ uid: user.uid, email: user.email })
  res.json({ token, user })
})

module.exports = router
