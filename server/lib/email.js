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
      from: 'Datelife <noreply@ytunx.com>',
      to: [email],
      subject: '【Datelife】登录验证码',
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:-apple-system,'Noto Sans SC','PingFang SC',sans-serif">

          <!-- 顶部渐变条 -->
          <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 50%,#15803d 100%);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:1px">🍱 Datelife</div>
            <p style="color:#bbf7d0;font-size:13px;margin-top:6px">食品日期管理 · 登录安全验证</p>
          </div>

          <!-- 主内容卡片 -->
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:32px 24px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.06)">

            <!-- 提示文字 -->
            <p style="color:#6b7280;font-size:15px;margin:0 0 20px">你的邮箱正在用于登录 Datelife</p>

            <!-- 验证码区域 -->
            <div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:2px dashed #86efac;border-radius:14px;padding:20px 16px;margin:0 0 20px">
              <p style="color:#166534;font-size:12px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px">验证码</p>
              <div style="font-size:40px;font-weight:800;letter-spacing:10px;color:#15803d;font-family:'SF Mono',Menlo,Monaco,monospace;-webkit-user-select:none;user-select:none">
                ${code}
              </div>
            </div>

            <!-- 有效期提示 -->
            <div style="display:inline-flex;align-items:center;gap:6px;background:#fefce8;border-radius:20px;padding:6px 14px;margin-bottom:8px">
              <span style="font-size:14px">⏱</span>
              <span style="color:#a16207;font-size:12px;font-weight:500">5 分钟内有效，请勿泄露给他人</span>
            </div>

          </div>

          <!-- 底部提示 -->
          <div style="text-align:center;margin-top:20px;padding:0 8px">
            <div style="display:inline-flex;align-items:center;gap:6px;color:#9ca3af;font-size:12px;line-height:1.6">
              <span>🛡</span>
              <span>如果这不是你的操作，请忽略此邮件<br>账号安全由你自己守护</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #f3f4f6">
            <p style="color:#d1d5db;font-size:11px;margin:0">
              此邮件由系统自动发送，请勿直接回复<br>
              <span style="color:#22c55e;font-weight:600">Datelife</span> · 让每一份食物都不被浪费
            </p>
          </div>

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
