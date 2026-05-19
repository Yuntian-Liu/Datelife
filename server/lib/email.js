const API_KEY = process.env.RESEND_API_KEY

async function sendVerificationCode(email, code) {
  if (!API_KEY) throw new Error('RESEND_API_KEY 未配置')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Datelife <noreply@datelife.ytunx.com>',
      to: [email],
      subject: '【Datelife】登录验证码',
      html: `
        <div style="max-width:480px;margin:0 auto;padding:20px;font-family:-apple-system,'Noto Sans SC',sans-serif">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:24px;font-weight:700;color:#22c55e">🍱 Datelife</span>
          </div>
          <div style="background:#f8faf9;border-radius:16px;padding:32px 24px;text-align:center">
            <p style="color:#6b7280;font-size:14px;margin-bottom:16px">你的验证码是</p>
            <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#15803d;margin:20px 0">${code}</div>
            <p style="color:#9ca3af;font-size:12px">5 分钟内有效 · 请勿泄露给他人</p>
          </div>
          <p style="text-align:center;color:#d1d5db;font-size:12px;margin-top:24px">
            如果这不是你的操作，请忽略此邮件
          </p>
        </div>
      `
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || '邮件发送失败')
  }

  return await res.json()
}

module.exports = { sendVerificationCode }
