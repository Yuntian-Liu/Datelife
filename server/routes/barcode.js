const { Router } = require('express')

const router = Router()

const API_BASE = 'https://apione.apibyte.cn/api/barcode'

router.get('/:code', async (req, res) => {
  const { code } = req.params
  const apiKey = process.env.BARCODE_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: '未配置 BARCODE_API_KEY' })
  }

  // 验证条形码格式：8-13位数字
  if (!/^\d{8,13}$/.test(code)) {
    return res.status(400).json({ error: '条形码格式不正确，需8-13位数字' })
  }

  try {
    const url = `${API_BASE}?key=${apiKey}&barcode=${code}`
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      return res.status(502).json({ error: '条形码查询服务异常' })
    }

    const data = await response.json()

    if (data.code === 200 && data.data?.found) {
      res.json({
        found: true,
        goods_name: data.data.goods_name,
        brand: data.data.brand,
        company: data.data.company,
        specification: data.data.specification,
        category: data.data.category
      })
    } else {
      res.json({ found: false })
    }
  } catch (err) {
    if (err.name === 'TimeoutError') {
      console.error('[Barcode] 查询超时:', err.message)
      return res.status(504).json({ error: '条形码查询超时' })
    }
    console.error('[Barcode] 查询失败:', err.message)
    res.status(500).json({ error: '条形码查询失败' })
  }
})

module.exports = router
