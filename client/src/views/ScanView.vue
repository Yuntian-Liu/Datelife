<script setup>
import { ref, onMounted, onBeforeUnmount, onActivated, onDeactivated, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { logger } from '../utils/logger'

const route = useRoute()
const router = useRouter()

const currentMode = ref(route.query.mode === 'qrcode' ? 'qrcode' : 'barcode')
const status = ref('正在启动摄像头...')
const error = ref('')
const showTimeoutHint = ref(false)
let scanner = null
let scanTimer = null

let initLock = false

async function initScan() {
  if (initLock) return
  initLock = true
  currentMode.value = route.query.mode === 'qrcode' ? 'qrcode' : 'barcode'
  const mode = currentMode.value
  error.value = ''
  await nextTick()
  startTimeoutTimer()

  const isMobile = window.innerWidth < 640
  const screenRatio = window.innerWidth / window.innerHeight
  const config = mode === 'barcode'
    ? {
        fps: 10,
        qrbox: { width: isMobile ? 560 : 720, height: isMobile ? 80 : 100 },
        aspectRatio: isMobile ? Math.min(screenRatio * 1.8, 2) : 1.777,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF
        ]
      }
    : { fps: 10, qrbox: { width: isMobile ? 240 : 280, height: isMobile ? 240 : 280 }, aspectRatio: isMobile ? Math.min(screenRatio * 1.4, 1.2) : 1 }

  try {
    logger.info('scan', '扫码页初始化', { mode })
    logger.info('scan', '扫码配置', { mode, fps: config.fps, formatsCount: config.formatsToSupport?.length || 0, isMobile })
    scanner = new Html5Qrcode('scanner')
    await scanner.start({ facingMode: 'environment' }, config, onScanSuccess, () => {})
    logger.info('scan', '摄像头启动成功', { mode })
    status.value = mode === 'barcode' ? '请将条形码对准扫描框' : '请将二维码对准扫描框'
    startTimeoutTimer()
  } catch (e) {
    logger.error('scan', '摄像头启动失败', { mode, error: e.message })
    error.value = '无法启动摄像头：' + e.message
  } finally {
    initLock = false
  }
}

async function cleanupScan() {
  clearTimeout(scanTimer)
  showTimeoutHint.value = false
  if (scanner) {
    try { await scanner.stop(); scanner.clear() } catch {}
    scanner = null
  }
}

onMounted(initScan)
onActivated(initScan)
onDeactivated(cleanupScan)
onBeforeUnmount(cleanupScan)

async function onScanSuccess(decodedText) {
  const prefix = decodedText.length > 20 ? decodedText.slice(0, 20) + '...' : decodedText
  logger.info('scan', '扫码成功', { mode, resultType: decodedText.includes('/f/') ? 'qrcode' : 'barcode', prefix })
  clearTimeout(scanTimer)
  await stopScanner()
  router.push('/foods/add?scanResult=' + encodeURIComponent(decodedText))
}

async function stopScanner() {
  if (scanner) {
    try { await scanner.stop(); scanner.clear() } catch {}
    scanner = null
  }
}

function startTimeoutTimer() {
  clearTimeout(scanTimer)
  scanTimer = setTimeout(() => {
    logger.warn('scan', '扫码超时提醒触发', { mode })
    showTimeoutHint.value = true
  }, 10000)
}

function onTimeoutRetry() {
  showTimeoutHint.value = false
  startTimeoutTimer()
}

function onTimeoutGoBack() {
  logger.info('scan', '超时弹窗 → 返回手动录入')
  clearTimeout(scanTimer)
  goBack()
}

function goBack() {
  logger.info('scan', '用户点返回')
  clearTimeout(scanTimer)
  stopScanner().finally(() => router.replace('/foods/add?fromScan=1'))
}
</script>

<template>
  <div class="fixed inset-0 z-30 bg-black flex flex-col">
    <!-- 顶部控制栏 -->
    <div class="flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/50 to-transparent shrink-0 absolute top-0 left-0 right-0 z-10">
      <button @click="goBack" class="flex items-center gap-1.5 text-white/90 hover:text-white transition">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        <span class="text-sm">返回</span>
      </button>
      <span class="text-white/90 text-sm font-medium font-brand tracking-wide">
        {{ currentMode === 'barcode' ? '扫条形码' : '扫二维码' }}
      </span>
      <div class="w-14"></div>
    </div>

    <!-- 摄像头区域 -->
    <div class="flex-1 relative">
      <!-- 超时温馨提醒 -->
      <div v-if="showTimeoutHint" class="absolute inset-0 flex items-center justify-center z-20">
        <div class="bg-black/70 border border-white/10 rounded-2xl px-5 py-5 text-center mx-6 max-w-xs w-full">
          <div class="text-2xl mb-2">🥺</div>
          <p class="text-white/50 text-xs mb-5">扫了好一会儿了，要不先歇歇？</p>
          <div class="flex gap-3">
            <button @click="onTimeoutRetry" class="flex-1 border border-white/20 hover:border-white/40 text-white/70 hover:text-white px-3 py-2.5 rounded-xl text-sm transition">再试试看</button>
            <button @click="onTimeoutGoBack" class="flex-1 bg-white hover:bg-white/90 text-gray-800 px-3 py-2.5 rounded-xl text-sm font-medium transition active:scale-95">不扫啦<br>回去手动填～</button>
          </div>
        </div>
      </div>

      <div v-if="error" class="absolute inset-0 flex items-center justify-center z-10">
        <div class="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-8 text-center mx-8">
          <div class="text-4xl mb-4">📷</div>
          <p class="text-white/70 text-sm mb-5">{{ error }}</p>
          <button @click="goBack" class="bg-white/20 hover:bg-white/30 text-white px-6 py-2.5 rounded-full text-sm font-medium transition">返回</button>
        </div>
      </div>
      <div id="scanner" class="w-full h-full" :class="{ 'has-guide-line': currentMode === 'barcode' }"></div>
      <!-- 底部提示 -->
      <div class="absolute bottom-10 left-0 right-0 text-center pointer-events-none z-10">
        <p class="inline-block bg-black/40 backdrop-blur-sm text-white/70 text-xs px-4 py-1.5 rounded-full">{{ status }}</p>
      </div>
    </div>
  </div>
</template>

<style>
/* 非 scoped：强制 html5-qrcode 居中，不覆盖视频/内部布局避免二维码变形 */
#scanner {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden;
}
</style>

<style scoped>
#scanner {
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

#scanner.has-guide-line {
  position: relative;
}

#scanner.has-guide-line::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 12%;
  right: 12%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.9), transparent);
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.5), 0 0 24px rgba(74, 222, 128, 0.2);
}
</style>
