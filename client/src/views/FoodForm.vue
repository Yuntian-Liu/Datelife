<script setup>
import { ref, onMounted, onActivated, inject, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { foods, barcode } from '../utils/api'
import { logger } from '../utils/logger'

const TAG_COLORS = ['bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700', 'bg-orange-100 text-orange-700', 'bg-lime-100 text-lime-700']
const tagColorCache = new Map()

function tagColor(name) {
  if (tagColorCache.has(name)) return tagColorCache.get(name)
  const used = [...tagColorCache.values()]
  let idx = 0
  for (let i = 0; i < name.length; i++) idx += name.charCodeAt(i)
  let color = TAG_COLORS[idx % TAG_COLORS.length]
  while (used.includes(color) && used.length < TAG_COLORS.length) {
    idx++
    color = TAG_COLORS[idx % TAG_COLORS.length]
  }
  tagColorCache.set(name, color)
  return color
}

const MAX_TAGS = 8
const route = useRoute()
const router = useRouter()
const { isAuthenticated } = inject('auth', { isAuthenticated: computed(() => false) })

const editing = ref(null)
const form = ref({ name: '', produce_date: '', shelf_life_days: '', quantity: 1 })
const errMsg = ref('')
const scanStatus = ref('')
const showScanPicker = ref(false)
const tagInput = ref('')
const formTags = ref([])
const allTags = ref([])
const showTagLimitModal = ref(false)
const shelfLifeUnit = ref('天')
const showUnitPicker = ref(false)
const unitOptions = ['天', '周', '月']
const pageTitle = computed(() => editing.value ? '编辑食品' : '添加食品')

const availableTags = computed(() => allTags.value.filter(t => !formTags.value.includes(t)))

function switchUnit(unit) {
  shelfLifeUnit.value = unit
  showUnitPicker.value = false
}

function unitMultiplier() {
  if (shelfLifeUnit.value === '周') return 7
  if (shelfLifeUnit.value === '月') return 30
  return 1
}

function addTag() {
  const t = tagInput.value.trim()
  if (!t) return
  if (!allTags.value.includes(t) && allTags.value.length >= MAX_TAGS) {
    logger.warn('tags', '标签超限弹窗触发', { attemptedTag: t, globalCount: allTags.value.length })
    showTagLimitModal.value = true
    return
  }
  if (formTags.value.includes(t)) return
  formTags.value.push(t)
  if (!allTags.value.includes(t)) allTags.value.push(t)
  logger.info('tags', '添加标签到食品', { tag: t, formTagCount: formTags.value.length, globalTagCount: allTags.value.length })
  tagInput.value = ''
}

function removeTag(t) {
  formTags.value = formTags.value.filter(tag => tag !== t)
  logger.info('tags', '从食品移除标签', { tag: t })
}

function addExistingTag(t) {
  if (formTags.value.includes(t)) return
  formTags.value.push(t)
  logger.info('tags', '选择已有标签', { tag: t })
}

function resetForm() {
  form.value = { name: '', produce_date: new Date().toISOString().slice(0, 10), shelf_life_days: '', quantity: 1 }
  shelfLifeUnit.value = '天'
  showUnitPicker.value = false
  formTags.value = []
  tagInput.value = ''
  editing.value = null
  showTagLimitModal.value = false
  errMsg.value = ''
  scanStatus.value = ''
}

async function submitForm() {
  errMsg.value = ''
  if (!form.value.name.trim()) { errMsg.value = '请输入食品名称'; return }
  if (!form.value.produce_date) { errMsg.value = '请选择生产日期'; return }
  if (!form.value.shelf_life_days || Number(form.value.shelf_life_days) <= 0) { errMsg.value = '请输入有效的保质期天数'; return }
  const data = {
    name: form.value.name.trim(),
    produce_date: form.value.produce_date,
    shelf_life_days: Number(form.value.shelf_life_days) * unitMultiplier(),
    shelf_life_unit: shelfLifeUnit.value,
    quantity: Number(form.value.quantity) || 1
  }
  const tagData = { ...data, tags: JSON.stringify(formTags.value) }
  try {
    if (editing.value) {
      await foods.update(editing.value, tagData)
      logger.info('foods', '更新食品', { id: editing.value, name: data.name, unit: data.shelf_life_unit })
    } else {
      const created = await foods.create(tagData)
      logger.info('foods', '创建食品', { id: created.id, name: data.name, unit: data.shelf_life_unit })
    }
    if (formTags.value.length) logger.info('tags', '通过食品提交同步标签', { tags: formTags.value.slice() })
    router.push('/foods')
  } catch (e) {
    logger.error('foods', editing.value ? '更新食品失败' : '创建食品失败', { name: data.name, error: e.message })
    errMsg.value = e.message
  }
}

function startScan() { showScanPicker.value = true }

function goScan(mode) {
  showScanPicker.value = false
  router.push(`/scan?mode=${mode}`)
}

async function handleScanResult() {
  const result = route.query.scanResult
  if (!result) return
  const sq = { ...route.query }; delete sq.scanResult; router.replace({ query: sq })
  const decodedText = decodeURIComponent(result)
  scanStatus.value = '正在查询...'
  resetForm()

  if (decodedText.includes('/f/')) {
    const match = decodedText.match(/\/f\/(\d+)/)
    if (!match) {
      logger.warn('foods', '扫码结果无效', { type: 'qrcode', decodedText })
      scanStatus.value = '无效的食品二维码'
      setTimeout(() => { scanStatus.value = '' }, 3000)
      return
    }
    try {
      const food = await foods.getById(match[1])
      form.value.name = food.name
      scanStatus.value = ''
      logger.info('foods', '扫码查询食品成功', { type: 'qrcode', foodId: match[1] })
    } catch (e) {
      logger.error('foods', '扫码查询食品失败', { type: 'qrcode', foodId: match[1], error: e.message })
      scanStatus.value = '查询失败：' + e.message
      setTimeout(() => { scanStatus.value = '' }, 3000)
    }
  } else {
    try {
      const result = await barcode.lookup(decodedText)
      if (result.found) {
        form.value.name = result.goods_name
        scanStatus.value = ''
        logger.info('foods', '条码查询成功', { barcode: decodedText, name: result.goods_name })
      } else {
        logger.warn('foods', '条码未找到商品', { barcode: decodedText })
        scanStatus.value = '未找到商品信息，请手动输入名称'
        setTimeout(() => { scanStatus.value = '' }, 3000)
      }
    } catch (e) {
      logger.error('foods', '条码查询失败', { barcode: decodedText, error: e.message })
      scanStatus.value = '查询失败：' + e.message
      setTimeout(() => { scanStatus.value = '' }, 3000)
    }
  }
}

async function initForm() {
  if (!isAuthenticated.value) { router.push('/foods'); return }

  try { allTags.value = await foods.getTags() } catch (e) { logger.warn('tags', '加载已有标签列表失败', { error: e.message }) }

  const id = route.params.id
  if (id) {
    try {
      const food = await foods.getById(id)
      editing.value = food.id
      form.value = { name: food.name, produce_date: food.produce_date, shelf_life_days: food.shelf_life_days, quantity: food.quantity ?? 1 }
      try { formTags.value = JSON.parse(food.tags || '[]') } catch { logger.error('foods', '标签数据解析失败', { id: food.id, tags: food.tags }) }
      logger.info('foods', '打开编辑食品表单', { id: food.id, name: food.name })
    } catch (e) {
      logger.error('foods', '加载食品失败', { id, error: e.message })
      errMsg.value = '加载食品失败'
    }
  } else {
    resetForm()
    logger.info('foods', '打开添加食品表单')
  }

  if (route.query.scanResult) handleScanResult()
  if (route.query.fromScan === '1') {
    const fq = { ...route.query }; delete fq.fromScan; router.replace({ query: fq })
  }
}

onMounted(initForm)
onActivated(initForm)
</script>

<template>
  <div class="min-h-screen bg-bg">
    <main class="max-w-lg mx-auto px-4 py-6 pb-28 md:pb-6">
      <!-- 返回按钮 -->
      <button @click="router.push('/foods')"
        class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-500 transition font-medium mb-4">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        返回食品列表
      </button>

      <!-- 标题 -->
      <h1 class="text-xl font-bold text-gray-800 font-brand mb-6">{{ pageTitle }}</h1>

      <!-- 表单 -->
      <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-5">
        <div v-if="scanStatus" class="mb-3 p-3 bg-primary-50 text-primary-700 rounded-xl text-sm">{{ scanStatus }}</div>

        <!-- 扫码方式选择面板 -->
        <div v-if="showScanPicker" class="mb-4 p-4 bg-gray-50 rounded-xl">
          <p class="text-sm text-gray-600 mb-3">选择扫码方式</p>
          <div class="flex gap-3">
            <button @click="goScan('barcode')" class="flex-1 py-3 px-4 bg-white rounded-xl border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition text-center">
              <div class="text-sm font-medium text-gray-700">条形码</div>
              <div class="text-xs text-gray-400 mt-1">扫描商品条形码查询名称</div>
            </button>
            <button @click="goScan('qrcode')" class="flex-1 py-3 px-4 bg-white rounded-xl border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition text-center">
              <div class="text-sm font-medium text-gray-700">二维码</div>
              <div class="text-xs text-gray-400 mt-1">扫描已有食品二维码</div>
            </button>
          </div>
          <button @click="showScanPicker = false" class="mt-3 text-xs text-gray-400 hover:text-gray-600 transition">取消</button>
        </div>

        <div class="space-y-4">
          <!-- 食品名称 -->
          <div class="relative">
            <label class="block text-xs text-gray-400 mb-1">食品名称</label>
            <input v-model="form.name" placeholder="输入食品名称" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
            <button @click="startScan" type="button" class="absolute right-2 bottom-2 p-1 text-gray-400 hover:text-primary-600 transition" title="扫码识别">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
            </button>
          </div>

          <!-- 标签 -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-gray-400">标签</span>
              <span class="text-xs" :class="allTags.length >= MAX_TAGS ? 'text-red-400' : 'text-gray-300'">{{ allTags.length }}/{{ MAX_TAGS }}</span>
            </div>
            <div v-if="formTags.length" class="flex items-center gap-1.5 flex-wrap mb-2">
              <button v-for="t in formTags" :key="t" @click="removeTag(t)" type="button"
                class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium transition select-none"
                :class="tagColor(t)">
                {{ t }}
                <span class="opacity-60">&times;</span>
              </button>
            </div>
            <div v-if="availableTags.length" class="flex items-center gap-1.5 flex-wrap mb-2">
              <button v-for="t in availableTags" :key="t" @click="addExistingTag(t)"
                class="px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition select-none hover:scale-105 bg-gray-100 text-gray-500 hover:bg-gray-200">
                + {{ t }}
              </button>
            </div>
            <div class="relative">
              <input v-model="tagInput" @keydown.enter.prevent="addTag" :disabled="allTags.length >= MAX_TAGS" :placeholder="allTags.length >= MAX_TAGS ? '已达标签上限' : '+ 添加新标签...'"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400" />
              <button v-if="allTags.length >= MAX_TAGS" @click="showTagLimitModal = true" type="button"
                class="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition p-2 cursor-pointer active:scale-90" title="查看解决方法">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
              </button>
              <button v-else @click="addTag" type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-primary-500 text-white rounded-lg text-sm font-bold active:scale-90 transition">
                +
              </button>
            </div>
          </div>

          <!-- 生产日期 + 保质期 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-400 mb-1">生产日期</label>
              <input v-model="form.produce_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">保质期</label>
              <div class="relative flex rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-transparent">
                <input v-model="form.shelf_life_days" type="number" placeholder="天数" min="1" class="flex-1 min-w-0 px-3 py-2.5 text-sm focus:outline-none rounded-l-xl" />
                <button @click="showUnitPicker = !showUnitPicker" type="button" class="shrink-0 px-3 py-2.5 text-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition border-l border-gray-200 flex items-center gap-1 rounded-r-xl">
                  {{ shelfLifeUnit }}
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div v-if="showUnitPicker" class="fixed inset-0 z-20" @click="showUnitPicker = false"></div>
                <div v-if="showUnitPicker" class="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30 min-w-[64px]">
                  <button v-for="opt in unitOptions" :key="opt" @click.prevent="switchUnit(opt)" type="button"
                    class="w-full px-4 py-2 text-sm text-center hover:bg-primary-50 hover:text-primary-600 transition"
                    :class="shelfLifeUnit === opt ? 'text-primary-600 font-medium' : 'text-gray-600'"
                  >{{ opt }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 数量 -->
          <div>
            <label class="block text-xs text-gray-400 mb-1">数量</label>
            <input v-model="form.quantity" type="number" min="1" placeholder="1"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
          </div>
        </div>

        <div v-if="errMsg" class="text-red-500 text-xs mt-3">{{ errMsg }}</div>
        <div class="flex gap-2 mt-5">
          <button @click="submitForm" class="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-xl text-sm font-medium transition shadow-sm">{{ editing ? '保存修改' : '添加食品' }}</button>
          <button @click="router.push('/foods')" class="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition">取消</button>
        </div>
      </div>
    </main>

    <!-- 标签上限弹窗 -->
    <teleport to="body">
      <div v-if="showTagLimitModal" class="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" @click.self="showTagLimitModal = false">
        <div class="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center">
          <div class="text-2xl mb-3">🏷️</div>
          <p class="text-sm text-gray-600 mb-4">已达标签上限（{{ MAX_TAGS }} 个）</p>
          <p class="text-xs text-gray-400 leading-relaxed mb-5">
            如需添加新标签，可先在<br>
            <strong>设置 → 数据管理 → 标签管理</strong><br>
            中清理不需要的标签
          </p>
          <button @click="showTagLimitModal = false" class="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-xl text-sm font-medium transition">我知道了</button>
        </div>
      </div>
    </teleport>
  </div>
</template>
