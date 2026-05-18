<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { foods, barcode } from '../utils/api'
import { useConfirm } from '../composables/useConfirm'

const showConfirm = useConfirm()

const foodList = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(null)
const form = ref({ name: '', produce_date: '', shelf_life_days: '' })
const errMsg = ref('')

// 扫码相关
const showScanner = ref(false)
const showScanMode = ref(false)
const scanMode = ref('barcode') // 'barcode' | 'qrcode'
const scanStatus = ref('')
let scanner = null

onMounted(async () => {
  try {
    foodList.value = await foods.getAll()
  } finally {
    loading.value = false
  }
})

function resetForm() {
  form.value = { name: '', produce_date: new Date().toISOString().slice(0, 10), shelf_life_days: '' }
  editing.value = null
}

function openAdd() {
  resetForm()
  showForm.value = true
}

function openEdit(food) {
  editing.value = food.id
  form.value = {
    name: food.name,
    produce_date: food.produce_date,
    shelf_life_days: food.shelf_life_days
  }
  showForm.value = true
}

async function submitForm() {
  errMsg.value = ''
  const data = {
    name: form.value.name,
    produce_date: form.value.produce_date,
    shelf_life_days: Number(form.value.shelf_life_days)
  }
  try {
    if (editing.value) {
      const updated = await foods.update(editing.value, data)
      const idx = foodList.value.findIndex(f => f.id === editing.value)
      foodList.value[idx] = updated
    } else {
      const created = await foods.create(data)
      foodList.value.unshift(created)
    }
    showForm.value = false
    resetForm()
  } catch (e) {
    errMsg.value = e.message
  }
}

function startScan() {
  showScanMode.value = true
}

async function startScanWithMode(mode) {
  scanMode.value = mode
  showScanMode.value = false
  showScanner.value = true
  scanStatus.value = '正在启动摄像头...'
  await nextTick()

  // 根据屏幕宽度调整扫码框大小
  const isMobile = window.innerWidth < 640
  const config = mode === 'barcode'
    ? { fps: 10, qrbox: { width: isMobile ? 250 : 300, height: isMobile ? 120 : 150 } }
    : { fps: 10, qrbox: { width: isMobile ? 200 : 250, height: isMobile ? 200 : 250 } }

  try {
    scanner = new Html5Qrcode('scanner-container')
    await scanner.start(
      { facingMode: 'environment' },
      config,
      onScanSuccess,
      () => {} // 忽略扫描失败
    )
    scanStatus.value = mode === 'barcode' ? '请将条形码对准扫描框' : '请将二维码对准扫描框'
  } catch (e) {
    scanStatus.value = '无法启动摄像头：' + e.message
    setTimeout(() => { showScanner.value = false }, 3000)
  }
}

async function stopScan() {
  if (scanner) {
    try {
      await scanner.stop()
      scanner.clear()
    } catch {}
    scanner = null
  }
  showScanner.value = false
  showScanMode.value = false
  scanStatus.value = ''
}

async function onScanSuccess(decodedText) {
  await stopScan()

  // 判断是 URL（二维码）还是数字（条形码）
  if (decodedText.includes('/f/')) {
    // 二维码：解析食品 ID 并查询名称
    await handleQrcode(decodedText)
  } else {
    // 条形码：调 API 查询商品
    await handleBarcode(decodedText)
  }
}

async function handleQrcode(url) {
  scanStatus.value = '正在查询食品信息...'

  try {
    // 从 URL 中提取食品 ID
    const match = url.match(/\/f\/(\d+)/)
    if (!match) {
      scanStatus.value = '无效的食品二维码'
      setTimeout(() => { scanStatus.value = '' }, 3000)
      return
    }

    const foodId = match[1]
    const food = await foods.getById(foodId)

    // 填充表单
    resetForm()
    form.value.name = food.name
    showForm.value = true
    scanStatus.value = ''
  } catch (e) {
    scanStatus.value = '查询失败：' + e.message
    setTimeout(() => { scanStatus.value = '' }, 3000)
  }
}

async function handleBarcode(code) {
  scanStatus.value = '正在查询商品信息...'
  showScanner.value = false

  try {
    const result = await barcode.lookup(code)
    if (result.found) {
      // 自动填充表单
      resetForm()
      form.value.name = result.goods_name
      showForm.value = true
      scanStatus.value = ''
    } else {
      // 未找到商品，提示手动输入
      resetForm()
      showForm.value = true
      scanStatus.value = '未找到商品信息，请手动输入名称'
      setTimeout(() => { scanStatus.value = '' }, 3000)
    }
  } catch (e) {
    scanStatus.value = '查询失败：' + e.message
    setTimeout(() => { scanStatus.value = '' }, 3000)
  }
}

async function remove(id) {
  const confirmed = await showConfirm({
    title: '删除食品',
    message: '确定要删除这个食品吗？此操作不可恢复。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  })
  if (!confirmed) return
  await foods.delete(id)
  foodList.value = foodList.value.filter(f => f.id !== id)
}

function statusLabel(food) {
  if (food.status === 'expired') return '已过期'
  if (food.status === 'expiring') return '临期'
  return '可食用'
}

function statusDot(food) {
  if (food.status === 'expired') return 'bg-red-500'
  if (food.status === 'expiring') return 'bg-yellow-500'
  return 'bg-green-500'
}

function statusText(food) {
  if (food.status === 'expired') return 'text-red-600'
  if (food.status === 'expiring') return 'text-yellow-600'
  return 'text-green-600'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航栏 -->
    <header class="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-800">Datelife</h1>
        <button @click="openAdd"
          class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium transition shadow-sm hover:shadow">
          + 添加食品
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

      <!-- 录入/编辑表单 -->
      <div v-if="showForm" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 class="text-lg font-semibold mb-4">{{ editing ? '编辑食品' : '添加食品' }}</h2>

        <!-- 扫码状态提示 -->
        <div v-if="scanStatus" class="mb-3 p-3 bg-blue-50 text-blue-700 rounded-xl text-sm">
          {{ scanStatus }}
        </div>

        <!-- 扫码模式选择 -->
        <div v-if="showScanMode" class="mb-4 p-4 bg-gray-50 rounded-xl">
          <p class="text-sm text-gray-600 mb-3">选择扫码方式</p>
          <div class="flex gap-3">
            <button @click="startScanWithMode('barcode')"
              class="flex-1 py-3 px-4 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition text-center">
              <div class="text-sm font-medium text-gray-700">条形码</div>
              <div class="text-xs text-gray-400 mt-1">扫描商品条形码查询名称</div>
            </button>
            <button @click="startScanWithMode('qrcode')"
              class="flex-1 py-3 px-4 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition text-center">
              <div class="text-sm font-medium text-gray-700">二维码</div>
              <div class="text-xs text-gray-400 mt-1">扫描已有食品二维码</div>
            </button>
          </div>
          <button @click="showScanMode = false" class="mt-3 text-xs text-gray-400 hover:text-gray-600 transition">取消</button>
        </div>

        <!-- 扫码区域 -->
        <div v-if="showScanner" class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-500">{{ scanMode === 'barcode' ? '扫描条形码' : '扫描二维码' }}</span>
            <button @click="stopScan" class="text-gray-400 hover:text-gray-600 transition">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div id="scanner-container"
            class="w-full max-w-xs rounded-lg overflow-hidden relative"
            :class="{ 'has-guide-line': scanMode === 'barcode' }">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="relative">
            <input v-model="form.name" placeholder="食品名称" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent" />
            <button @click="startScan" type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-green-600 transition"
              title="扫码识别">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
          </div>
          <input v-model="form.produce_date" type="date" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent" />
          <input v-model="form.shelf_life_days" type="number" placeholder="保质期（天）" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent" />
        </div>
        <div v-if="errMsg" class="text-red-500 text-xs mt-3">{{ errMsg }}</div>
        <div class="flex gap-2 mt-4">
          <button @click="submitForm" class="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-xl text-sm transition">
            {{ editing ? '保存' : '添加' }}
          </button>
          <button @click="showForm = false; resetForm(); stopScan()" class="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
            取消
          </button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="text-center text-gray-400 py-20">加载中...</div>

      <!-- 空状态 -->
      <div v-else-if="foodList.length === 0" class="text-center text-gray-400 py-20">
        还没有食品，点击右上角添加吧
      </div>

      <!-- PC端：表格视图 / 手机端：卡片列表 -->
      <div v-else>
        <!-- PC 表格 -->
        <div class="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                <th class="px-5 py-3 font-medium">食品名称</th>
                <th class="px-5 py-3 font-medium">生产日期</th>
                <th class="px-5 py-3 font-medium">保质期</th>
                <th class="px-5 py-3 font-medium">过期日期</th>
                <th class="px-5 py-3 font-medium">状态</th>
                <th class="px-5 py-3 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="food in foodList" :key="food.id"
                class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition group">
                <td class="px-5 py-3.5">
                  <router-link :to="`/f/${food.id}`" class="font-medium text-gray-800 hover:text-green-600 transition">
                    {{ food.name }}
                  </router-link>
                </td>
                <td class="px-5 py-3.5 text-sm text-gray-500">{{ food.produce_date }}</td>
                <td class="px-5 py-3.5 text-sm text-gray-500">{{ food.shelf_life_days }} 天</td>
                <td class="px-5 py-3.5 text-sm text-gray-700 font-medium">{{ food.expire_date }}</td>
                <td class="px-5 py-3.5">
                  <span :class="statusText(food)" class="inline-flex items-center gap-1.5 text-xs font-medium">
                    <span :class="statusDot(food)" class="w-2 h-2 rounded-full"></span>
                    {{ statusLabel(food) }}
                    <span class="font-normal opacity-70">
                      ({{ food.days_left >= 0 ? '还剩' + food.days_left + '天' : '过期' + (-food.days_left) + '天' }})
                    </span>
                  </span>
                </td>
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button @click.prevent="openEdit(food)" class="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition" title="编辑">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button @click.prevent="remove(food.id)" class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="删除">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 0 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 手机卡片 -->
        <div class="md:hidden space-y-3">
          <router-link v-for="food in foodList" :key="food.id"
            :to="`/f/${food.id}`"
            class="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-[0.98] transition">
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-800 truncate">{{ food.name }}</div>
                <div class="text-xs text-gray-400 mt-1">
                  过期：{{ food.expire_date }}
                  <span :class="statusText(food)">
                    （{{ food.days_left >= 0 ? '还剩 ' + food.days_left + ' 天' : '已过期 ' + (-food.days_left) + ' 天' }}）
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 ml-3 shrink-0">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                  :class="[statusText(food), { 'bg-red-50': food.status==='expired', 'bg-yellow-50': food.status==='expiring', 'bg-green-50': food.status==='normal' }]">
                  <span :class="statusDot(food)" class="w-1.5 h-1.5 rounded-full"></span>
                  {{ statusLabel(food) }}
                </span>
              </div>
            </div>
          </router-link>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
#scanner-container {
  position: relative;
}

#scanner-container.has-guide-line::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 15%;
  right: 15%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.8), transparent);
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
}
</style>
