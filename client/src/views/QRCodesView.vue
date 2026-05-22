<script setup>
import { ref, onMounted, inject, computed } from 'vue'
import { jsPDF } from 'jspdf'
import { foods } from '../utils/api'
import { logger } from '../utils/logger'

const { isAuthenticated } = inject('auth', { isAuthenticated: computed(() => false) })
const foodList = ref([])
const loading = ref(true)
const downloadingPDF = ref(false)

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      foodList.value = await foods.getAll()
      logger.info('qrcode', '二维码页加载完成', { count: foodList.value.length })
    } catch (e) {
      logger.error('qrcode', '二维码页加载失败', { error: e.message })
    }
  }
  loading.value = false
})

function qrUrl(id) {
  return `/api/foods/${id}/qrcode`
}

function daysDigits(d) {
  const n = Math.abs(d)
  return String(n).padStart(3, '0')
}

function daysColor(food) {
  if (food.status === 'expired') return 'text-red-600'
  if (food.status === 'expiring') return 'text-yellow-600'
  return 'text-primary-600'
}

function statusColorHex(food) {
  if (food.status === 'expired') return '#ef4444'
  if (food.status === 'expiring') return '#eab308'
  return '#22c55e'
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function buildCardCanvas(food, qrImg) {
  const w = 480, h = 600
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  // 白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  // QR 码图片（居中，关闭平滑保持边缘锐利）
  const qrSize = 400
  const qrX = (w - qrSize) / 2
  const qrY = 16
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

  // 倒计时数字（等宽，颜色和 QR 一致）
  const color = statusColorHex(food)
  ctx.fillStyle = color
  ctx.font = 'bold 36px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(String(Math.abs(food.days_left)).padStart(3, '0'), w / 2, qrY + qrSize + 44)

  // 食品名称
  ctx.fillStyle = '#374151'
  ctx.font = '26px -apple-system, "Noto Sans SC", sans-serif'
  ctx.textAlign = 'center'
  const name = food.name.length > 10 ? food.name.slice(0, 10) + '...' : food.name
  ctx.fillText(name, w / 2, qrY + qrSize + 84)

  // 过期日期
  ctx.fillStyle = '#9ca3af'
  ctx.font = '22px -apple-system, "Noto Sans SC", sans-serif'
  ctx.fillText(food.expire_date + ' 过期', w / 2, qrY + qrSize + 118)

  return canvas
}

function buildTitleCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 1000
  canvas.height = 100
  const ctx = canvas.getContext('2d')
  ctx.font = 'bold 56px "Playfair Display", "Noto Serif SC", "Georgia", serif'
  ctx.fillStyle = '#1f2937'
  ctx.textAlign = 'center'
  ctx.fillText('🍱 Datelife · 二维码打印', 500, 68)
  return canvas
}

function buildWatermarkCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 220
  canvas.height = 130
  const ctx = canvas.getContext('2d')
  ctx.save()
  ctx.translate(110, 65)
  ctx.rotate(-22 * Math.PI / 180)
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif'
  ctx.fillStyle = 'rgba(148, 163, 184, 0.18)'
  ctx.textAlign = 'center'
  ctx.fillText('Datelife - 食品保质期管理', 0, -6)
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif'
  ctx.fillStyle = 'rgba(148, 163, 184, 0.14)'
  ctx.fillText('https://datelife.ytunx.com', 0, 12)
  ctx.restore()
  return canvas
}

function buildPageNumberCanvas(pageNum, totalPages) {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 24
  const ctx = canvas.getContext('2d')
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#9ca3af'
  ctx.textAlign = 'center'
  ctx.fillText(`第 ${pageNum} 页 / 共 ${totalPages} 页`, 100, 16)
  return canvas
}

async function downloadPDF() {
  downloadingPDF.value = true
  const startTime = Date.now()
  const totalItems = foodList.value.length
  logger.info('qrcode', '开始生成 PDF', { count: totalItems })

  try {
    const titleDataUrl = buildTitleCanvas().toDataURL('image/png')
    const watermarkDataUrl = buildWatermarkCanvas().toDataURL('image/png')

    // 分批加载所有二维码并合成卡片图
    const cardDataUrls = []
    const batchSize = 6
    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = foodList.value.slice(i, i + batchSize)
      const results = await Promise.all(batch.map(async (food) => {
        try {
          const qrImg = await loadImage(qrUrl(food.id))
          return buildCardCanvas(food, qrImg).toDataURL('image/png')
        } catch (e) {
          logger.error('qrcode', 'PDF 卡片合成失败', { foodId: food.id, name: food.name, error: e.message })
          return null
        }
      }))
      cardDataUrls.push(...results.filter(Boolean))
      logger.info('qrcode', 'PDF 卡片合成进度', { loaded: Math.min(i + batchSize, totalItems), total: totalItems })
    }

    const pdf = new jsPDF('portrait', 'mm', 'a4')
    const pageWidth = 210
    const pageHeight = 297
    const marginX = 13
    const marginTop = 24
    const marginBottom = 12
    const cols = 5
    const cellWidth = (pageWidth - marginX * 2) / cols
    const cellHeight = 40
    const rowsPerPage = Math.floor((pageHeight - marginTop - marginBottom) / cellHeight)
    const perPage = cols * rowsPerPage
    const totalPages = Math.ceil(cardDataUrls.length / perPage)
    const today = new Date().toISOString().slice(0, 10)

    // 水印 tile 实际尺寸
    const wmTileW = 55
    const wmTileH = 32.5

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage()

      // 标题
      pdf.addImage(titleDataUrl, 'PNG', (pageWidth - 100) / 2, 8, 100, 10)

      // 日期
      pdf.setFontSize(7)
      pdf.setTextColor(156, 163, 175)
      pdf.text(today, pageWidth / 2, 20, { align: 'center' })

      // 绿色分隔线
      pdf.setDrawColor(34, 197, 94)
      pdf.setLineWidth(0.3)
      pdf.line(marginX, 23, pageWidth - marginX, 23)

      // 卡片网格
      const start = page * perPage
      for (let row = 0; row < rowsPerPage; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = start + row * cols + col
          if (idx >= cardDataUrls.length) break
          const x = marginX + col * cellWidth
          const y = marginTop + row * cellHeight
          pdf.addImage(cardDataUrls[idx], 'PNG', x + 0.8, y + 0.8, cellWidth - 1.6, cellHeight - 2)
        }
      }

      // 水印平铺（最上层）
      for (let wy = 0; wy < pageHeight; wy += wmTileH) {
        for (let wx = -15; wx < pageWidth + 15; wx += wmTileW) {
          pdf.addImage(watermarkDataUrl, 'PNG', wx, wy, wmTileW, wmTileH)
        }
      }

      // 页码
      if (totalPages > 1) {
        const pnDataUrl = buildPageNumberCanvas(page + 1, totalPages).toDataURL('image/png')
        pdf.addImage(pnDataUrl, 'PNG', (pageWidth - 40) / 2, pageHeight - 11, 40, 5)
      }
    }

    pdf.save(`二维码打印_${today}.pdf`)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.info('qrcode', 'PDF 生成完成', { pages: totalPages, items: totalItems, elapsedSec: elapsed })
  } catch (e) {
    logger.error('qrcode', 'PDF 生成失败', { error: e.message })
  } finally {
    downloadingPDF.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-6">
      <!-- 页面标题 + 下载按钮 -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-800 font-brand">二维码打印</h1>
          <p class="text-sm text-gray-400 mt-1">共 {{ foodList.length }} 件食品</p>
        </div>
        <button
          @click="downloadPDF"
          :disabled="downloadingPDF || foodList.length === 0"
          class="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
        >
          <svg v-if="!downloadingPDF" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ downloadingPDF ? '生成中...' : '下载 PDF' }}
        </button>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="text-center text-gray-400 py-20">加载中...</div>

      <!-- 空状态 -->
      <div v-else-if="foodList.length === 0" class="text-center py-20">
        <div class="text-4xl mb-3">📱</div>
        <div class="text-gray-400 text-sm">还没有食品，先去添加吧</div>
      </div>

      <!-- 二维码卡片网格 -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3">
        <div v-for="food in foodList" :key="food.id"
          class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-4 flex flex-col items-center">
          <img :src="qrUrl(food.id)" :alt="food.name" class="w-full max-w-[200px] aspect-square rounded-lg" />
          <span class="text-[10px] tracking-widest leading-none" :class="daysColor(food)">{{ daysDigits(food.days_left) }}</span>
          <span class="mt-1 text-sm font-medium text-gray-700 text-center truncate w-full">{{ food.name }}</span>
          <span class="text-xs text-gray-400 mt-0.5">{{ food.expire_date }} 过期</span>
        </div>
      </div>
    </main>
  </div>
</template>
