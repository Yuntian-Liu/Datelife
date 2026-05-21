<script setup>
import { ref, onMounted, inject, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { foods, barcode } from '../utils/api'
import { useConfirm } from '../composables/useConfirm'
import { logger } from '../utils/logger'

const TAG_COLORS = ['bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700', 'bg-orange-100 text-orange-700', 'bg-lime-100 text-lime-700']
const tagColorCache = new Map()

function tagColor(name) {
  if (tagColorCache.has(name)) return tagColorCache.get(name)
  const used = [...tagColorCache.values()]
  let idx = 0
  for (let i = 0; i < name.length; i++) idx += name.charCodeAt(i)
  let color = TAG_COLORS[idx % TAG_COLORS.length]
  // 如果颜色已被占用，找下一个未用的
  while (used.includes(color)) {
    idx++
    color = TAG_COLORS[idx % TAG_COLORS.length]
  }
  tagColorCache.set(name, color)
  return color
}

const route = useRoute()
const router = useRouter()
const showConfirm = useConfirm()
const { isAuthenticated } = inject('auth', { isAuthenticated: computed(() => false) })

const foodList = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(null)
const form = ref({ name: '', produce_date: '', shelf_life_days: '' })
const errMsg = ref('')
const filter = ref(
  route.query.filter && ['normal', 'expiring', 'expired'].includes(route.query.filter)
    ? route.query.filter : 'all'
)
const searchQuery = ref(route.query.q || '')
const scanStatus = ref('')
const showScanPicker = ref(false)

// 标签相关
const tagInput = ref('')
const formTags = ref([])
const allTags = ref([])
const selectedFilterTags = ref(
  route.query.tags ? route.query.tags.split(',').filter(Boolean) : []
)
const showTagFilter = ref(false)
const showTagLimitModal = ref(false)

// 排序：time = 添加时间（默认），expiry = 到期紧急程度
const sortBy = ref(route.query.sort === 'expiry' ? 'expiry' : 'time')

// 保质期单位切换
const shelfLifeUnit = ref('天')
const showUnitPicker = ref(false)
const unitOptions = ['天', '周', '月']

function switchUnit(unit) {
  shelfLifeUnit.value = unit
  showUnitPicker.value = false
}

// 标签输入：回车添加（全局标签上限 8 个）
function addTag() {
  const t = tagInput.value.trim()
  if (!t) return
  if (!allTags.value.includes(t) && allTags.value.length >= 8) {
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

// 标签筛选
function toggleFilterTag(t) {
  const idx = selectedFilterTags.value.indexOf(t)
  if (idx >= 0) selectedFilterTags.value.splice(idx, 1)
  else selectedFilterTags.value.push(t)
  logger.info('tags', '标签筛选', { tag: t, selectedCount: selectedFilterTags.value.length })
}

function clearTagFilter() {
  selectedFilterTags.value = []
  filter.value = 'all'
}

function unitMultiplier() {
  if (shelfLifeUnit.value === '周') return 7
  if (shelfLifeUnit.value === '月') return 30
  return 1
}

// 从 App.vue 注入底部导航的添加触发
const showAddForm = inject('showAddForm', ref(false))
watch(showAddForm, (val) => {
  if (val) {
    openAdd()
    showAddForm.value = false
  }
})

const availableTags = computed(() => allTags.value.filter(t => !formTags.value.includes(t)))

const filteredList = computed(() => {
  let list = foodList.value
  if (filter.value !== 'all' && filter.value !== 'tags') {
    list = list.filter(f => f.status === filter.value)
  }
  if (selectedFilterTags.value.length > 0) {
    list = list.filter(f => {
      const ft = JSON.parse(f.tags || '[]')
      return selectedFilterTags.value.some(t => ft.includes(t))
    })
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(f => f.name.toLowerCase().includes(q))
  }
  if (sortBy.value === 'expiry') {
    list = [...list].sort((a, b) => a.days_left - b.days_left)
  } else {
    list = [...list].sort((a, b) => b.id - a.id)
  }
  return list
})

onMounted(async () => {
  if (isAuthenticated.value) {
    try { foodList.value = await foods.getAll() } catch (e) {}
    try { allTags.value = await foods.getTags() } catch (e) { logger.warn('tags', '加载已有标签列表失败', { error: e.message }) }
  }
  loading.value = false
  // 处理从详情页带来的编辑请求
  if (route.query.edit) {
    const editId = String(route.query.edit)
    const food = foodList.value.find(f => String(f.id) === editId)
    if (food) {
      openEdit(food)
      const eq = { ...route.query }; delete eq.edit; router.replace({ query: eq })
    }
  }
  // 处理从扫码页带回的结果
  handleScanResult()
  // 处理从扫码页手动返回（未扫到结果）
  if (route.query.fromScan === '1') {
    const fq = { ...route.query }; delete fq.fromScan; router.replace({ query: fq })
    openAdd()
  }
})

// 筛选状态变化时同步到 URL
watch(
  () => [filter.value, selectedFilterTags.value.join(','), searchQuery.value, sortBy.value],
  () => { syncFiltersToQuery() }
)

// URL query 变化时同步回筛选状态（如点击底部导航 /foods 重置筛选）
watch(
  () => [route.query.filter, route.query.tags, route.query.q, route.query.sort],
  ([f, t, q, s]) => {
    filter.value = (f && ['normal', 'expiring', 'expired'].includes(f)) ? f : 'all'
    selectedFilterTags.value = t ? t.split(',').filter(Boolean) : []
    searchQuery.value = q || ''
    sortBy.value = s === 'expiry' ? 'expiry' : 'time'
  }
)

// 监听路由变化，处理扫码返回
watch(() => route.query.scanResult, (val) => {
  if (val) handleScanResult()
})

// 监听扫码页手动返回
watch(() => route.query.fromScan, (val) => {
  if (val === '1') {
    const fq2 = { ...route.query }; delete fq2.fromScan; router.replace({ query: fq2 })
    openAdd()
  }
})

async function handleScanResult() {
  const result = route.query.scanResult
  if (!result) return
  const sq = { ...route.query }; delete sq.scanResult; router.replace({ query: sq })
  const decodedText = decodeURIComponent(result)
  scanStatus.value = '正在查询...'
  resetForm()
  showForm.value = true

  if (decodedText.includes('/f/')) {
    // 二维码：食品详情链接
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
    // 条形码
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

function resetForm() {
  form.value = { name: '', produce_date: new Date().toISOString().slice(0, 10), shelf_life_days: '' }
  shelfLifeUnit.value = '天'
  showUnitPicker.value = false
  formTags.value = []
  tagInput.value = ''
  editing.value = null
  showTagLimitModal.value = false
}

function openAdd() {
  resetForm()
  scanStatus.value = ''
  showForm.value = true
}

function openEdit(food) {
  editing.value = food.id
  form.value = { name: food.name, produce_date: food.produce_date, shelf_life_days: food.shelf_life_days }
  let parsed = []
  try { parsed = JSON.parse(food.tags || '[]') } catch {}
  formTags.value = Array.isArray(parsed) ? parsed : []
  scanStatus.value = ''
  showForm.value = true
}

async function submitForm() {
  errMsg.value = ''
  const data = {
    name: form.value.name,
    produce_date: form.value.produce_date,
    shelf_life_days: Number(form.value.shelf_life_days) * unitMultiplier(),
    shelf_life_unit: shelfLifeUnit.value
  }
  const tagData = { ...data, tags: JSON.stringify(formTags.value) }
  try {
    if (editing.value) {
      const updated = await foods.update(editing.value, tagData)
      const idx = foodList.value.findIndex(f => f.id === editing.value)
      foodList.value[idx] = updated
      logger.info('foods', '更新食品', { id: editing.value, name: data.name, unit: data.shelf_life_unit })
    } else {
      const created = await foods.create(tagData)
      foodList.value.unshift(created)
      logger.info('foods', '创建食品', { id: created.id, name: data.name, unit: data.shelf_life_unit })
    }
    if (formTags.value.length) logger.info('tags', '通过食品提交同步标签', { tags: formTags.value.slice() })
    showForm.value = false
    resetForm()
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

async function remove(id) {
  const confirmed = await showConfirm({ title: '删除食品', message: '确定要删除这个食品吗？此操作不可恢复。', confirmText: '删除', cancelText: '取消', type: 'danger' })
  if (!confirmed) return
  await foods.delete(id)
  foodList.value = foodList.value.filter(f => f.id !== id)
  logger.info('foods', '删除食品', { id })
}

function statusLabel(food) {
  if (food.status === 'expired') return '已过期'
  if (food.status === 'expiring') return '临期'
  return '可食用'
}

function statusDot(food) { return food.status === 'expired' ? 'bg-red-500' : food.status === 'expiring' ? 'bg-yellow-500' : 'bg-primary-500' }
function statusText(food) { return food.status === 'expired' ? 'text-red-600' : food.status === 'expiring' ? 'text-yellow-600' : 'text-primary-600' }
function statusBorder(food) { return food.status === 'expired' ? 'border-l-red-400' : food.status === 'expiring' ? 'border-l-yellow-400' : 'border-l-primary-400' }

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'normal', label: '可食用' },
  { key: 'expiring', label: '临期' },
  { key: 'expired', label: '已过期' },
  { key: 'tags', label: '标签' }
]

function syncFiltersToQuery() {
  const query = {}
  if (filter.value !== 'all' && filter.value !== 'tags') {
    query.filter = filter.value
  }
  if (selectedFilterTags.value.length > 0) {
    query.tags = selectedFilterTags.value.join(',')
  }
  if (searchQuery.value) {
    query.q = searchQuery.value
  }
  if (sortBy.value !== 'time') {
    query.sort = sortBy.value
  }
  router.replace({ query })
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-6" @click="showTagFilter = false">
      <!-- 筛选栏 -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div class="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100 relative">
          <button v-for="opt in filterOptions.slice(0, 4)" :key="opt.key"
            @click="filter = opt.key; showTagFilter = false"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition leading-tight text-center"
            :class="filter === opt.key && !selectedFilterTags.length ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-primary-500'"
          >
            <template v-if="opt.label.length === 3">{{ opt.label[0] }}<br class="sm:hidden">{{ opt.label.slice(1) }}</template>
            <template v-else>{{ opt.label }}</template>
          </button>
          <!-- 标签筛选按钮 -->
          <div class="relative">
            <button @click.stop="showTagFilter = !showTagFilter; filter = 'tags'"
              class="px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1"
              :class="(filter === 'tags' || selectedFilterTags.length) ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-primary-500'"
            >
              {{ selectedFilterTags.length === 0 ? '标签' : (selectedFilterTags.length === 1 ? selectedFilterTags[0] : selectedFilterTags[0] + '+' + (selectedFilterTags.length - 1)) }}
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <!-- 标签选择面板 -->
            <div v-if="showTagFilter" class="absolute top-full mt-1 right-0 sm:right-auto sm:left-0 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-20 sm:min-w-[180px] max-h-[240px] overflow-y-auto"
              @click.stop>
              <div class="flex items-center justify-between mb-2 px-1">
                <span class="text-xs text-gray-400">选择标签筛选</span>
                <button v-if="selectedFilterTags.length" @click="clearTagFilter()" class="text-xs text-gray-400 hover:text-red-500 transition">清除</button>
              </div>
              <template v-if="allTags.length">
                <div class="flex flex-col sm:flex-row sm:flex-wrap gap-1.5">
                  <button v-for="t in allTags" :key="t" @click.stop="toggleFilterTag(t)"
                    class="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition select-none truncate"
                    :class="selectedFilterTags.includes(t) ? (tagColor(t) + ' ring-1 ring-offset-0') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'">
                    {{ t }}
                    <span v-if="selectedFilterTags.includes(t)" class="ml-0.5 opacity-70">✓</span>
                  </button>
                </div>
              </template>
              <div v-else class="text-xs text-gray-400 text-center py-3">暂无标签，先给食品添加标签吧</div>
            </div>
          </div>
        </div>
        <div class="relative flex items-center gap-2 flex-1 max-w-xs min-w-0">
          <div class="relative flex-1 min-w-0">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input v-model="searchQuery" placeholder="搜索食品..."
              class="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
          </div>
          <!-- 排序切换 -->
          <div class="shrink-0 flex items-center bg-white rounded-full border border-gray-200 p-0.5">
            <button @click="sortBy = 'time'; logger.info('foods', '切换排序：添加时间')" class="w-7 h-7 rounded-full flex items-center justify-center transition"
              :class="sortBy === 'time' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              title="按添加时间排序">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button @click="sortBy = 'expiry'; logger.info('foods', '切换排序：到期紧急')" class="w-7 h-7 rounded-full flex items-center justify-center transition"
              :class="sortBy === 'expiry' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              title="按到期紧急排序">
              <span class="flex gap-0.5 items-center">
                <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- 添加/编辑表单 -->
      <div v-if="showForm" class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-5 mb-6">
        <h2 class="text-lg font-semibold mb-4 font-brand">{{ editing ? '编辑食品' : '添加食品' }}</h2>
        <div v-if="scanStatus" class="mb-3 p-3 bg-primary-50 text-primary-700 rounded-xl text-sm">{{ scanStatus }}</div>

        <!-- 扫码方式选择面板（轻量级，点击后跳转全屏扫码页） -->
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

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="relative">
            <input v-model="form.name" placeholder="食品名称" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
            <button @click="startScan" type="button" class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-600 transition" title="扫码识别">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
            </button>
          </div>

          <!-- 标签输入区 -->
          <div class="col-span-full sm:col-span-3">
            <div class="mb-2">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs text-gray-400">已添加的标签</span>
                <span class="text-xs" :class="allTags.length >= 8 ? 'text-red-400' : 'text-gray-300'">{{ allTags.length }}/8</span>
              </div>
              <!-- 已有标签胶囊（可点击取消） -->
              <div v-if="formTags.length" class="flex items-center gap-1.5 flex-wrap mb-2">
                <button v-for="t in formTags" :key="t" @click="removeTag(t)" type="button"
                  class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium transition select-none"
                  :class="tagColor(t)">
                  {{ t }}
                  <span class="opacity-60">&times;</span>
                </button>
              </div>
              <!-- 可选已有标签 -->
              <div v-if="availableTags.length" class="flex items-center gap-1.5 flex-wrap mb-2">
                <button v-for="t in availableTags" :key="t" @click.stop="addExistingTag(t)"
                  class="px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition select-none hover:scale-105"
                  :class="'bg-gray-100 text-gray-500 hover:bg-gray-200'">
                  + {{ t }}
                </button>
              </div>
            </div>
            <div class="relative">
              <input v-model="tagInput" @keydown.enter.prevent="addTag" :disabled="allTags.length >= 8" :placeholder="allTags.length >= 8 ? '已达标签上限' : '+ 添加新标签...'"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400" />
              <button v-if="allTags.length >= 8" @click="logger.info('tags', '查看标签限制信息', { globalCount: allTags.length }); showTagLimitModal = true" type="button"
                class="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition p-2 cursor-pointer active:scale-90" title="查看解决方法">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
              </button>
              <button v-else @click="addTag" type="button"
                class="md:hidden absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-primary-500 text-white rounded-lg text-sm font-bold active:scale-90 transition">
                +
              </button>
            </div>
          </div>

          <input v-model="form.produce_date" type="date" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
          <div class="relative flex rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-transparent">
            <input v-model="form.shelf_life_days" type="number" placeholder="保质期" min="1" class="flex-1 min-w-0 px-3 py-2.5 text-sm focus:outline-none rounded-l-xl" />
            <button @click="showUnitPicker = !showUnitPicker" type="button" class="shrink-0 px-3 py-2.5 text-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition border-l border-gray-200 flex items-center gap-1 rounded-r-xl">
              {{ shelfLifeUnit }}
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <!-- 单位下拉 -->
            <div v-if="showUnitPicker" class="fixed inset-0 z-20" @click="showUnitPicker = false"></div>
            <div v-if="showUnitPicker" class="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30 min-w-[64px]">
              <button v-for="opt in unitOptions" :key="opt" @click.prevent="switchUnit(opt)" type="button"
                class="w-full px-4 py-2 text-sm text-center hover:bg-primary-50 hover:text-primary-600 transition"
                :class="shelfLifeUnit === opt ? 'text-primary-600 font-medium' : 'text-gray-600'"
              >{{ opt }}</button>
            </div>
          </div>
        </div>
        <div v-if="errMsg" class="text-red-500 text-xs mt-3">{{ errMsg }}</div>
        <div class="flex gap-2 mt-4">
          <button @click="submitForm" class="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-xl text-sm font-medium transition shadow-sm">{{ editing ? '保存' : '添加' }}</button>
          <button @click="showForm = false; resetForm()" class="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">取消</button>
        </div>
      </div>

      <!-- 加载/空状态 -->
      <div v-if="loading" class="text-center text-gray-400 py-20">加载中...</div>
      <div v-else-if="filteredList.length === 0" class="text-center py-20">
        <div class="text-4xl mb-3">🍽️</div>
        <div class="text-gray-400 text-sm">{{ foodList.length === 0 ? '还没有食品，点击 + 添加吧' : '没有匹配的食品' }}</div>
      </div>

      <!-- PC 表格 + 手机卡片 -->
      <template v-else>
      <div class="hidden md:block bg-white rounded-2xl shadow-md border border-gray-100/80 overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th class="px-5 py-3 font-medium">食品名称</th>
              <th class="px-5 py-3 font-medium">标签</th>
              <th class="px-5 py-3 font-medium">生产日期</th>
              <th class="px-5 py-3 font-medium">保质期</th>
              <th class="px-5 py-3 font-medium">过期日期</th>
              <th class="px-5 py-3 font-medium">状态</th>
              <th class="px-5 py-3 font-medium w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="food in filteredList" :key="food.id" class="border-b border-gray-50 last:border-0 hover:bg-primary-50/30 transition group">
              <td class="px-5 py-3.5"><router-link :to="`/f/${food.id}`" class="font-medium text-gray-800 hover:text-primary-600 transition">{{ food.name }}</router-link></td>
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-1 flex-wrap">
                  <template v-if="food.tags">
                    <span v-for="t in JSON.parse(food.tags).slice(0, 2)" :key="t"
                      class="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" :class="tagColor(t)">{{ t }}</span>
                    <span v-if="JSON.parse(food.tags).length > 2"
                      class="text-xs text-gray-300">...</span>
                  </template>
                </div>
              </td>
              <td class="px-5 py-3.5 text-sm text-gray-500">{{ food.produce_date }}</td>
              <td class="px-5 py-3.5 text-sm text-gray-500">{{ food.shelf_life_days }} 天</td>
              <td class="px-5 py-3.5 text-sm text-gray-700 font-medium">{{ food.expire_date }}</td>
              <td class="px-5 py-3.5">
                <span :class="statusText(food)" class="inline-flex items-center gap-1.5 text-xs font-medium">
                  <span :class="statusDot(food)" class="w-2 h-2 rounded-full"></span>
                  {{ statusLabel(food) }}
                  <span class="font-normal opacity-70">({{ food.days_left >= 0 ? '还剩' + food.days_left + '天' : '过期' + (-food.days_left) + '天' }})</span>
                </span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button @click.prevent="openEdit(food)" class="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition" title="编辑"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                  <button @click.prevent="remove(food.id)" class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="删除"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 手机卡片 -->
      <div class="md:hidden space-y-3">
        <div v-for="food in filteredList" :key="food.id"
          class="bg-white rounded-2xl shadow-md border border-gray-100/80 border-l-4 p-4"
          :class="statusBorder(food)">
          <router-link :to="`/f/${food.id}`" class="block active:opacity-70 transition">
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-800 truncate">{{ food.name }}</span>
                  <template v-if="food.tags && JSON.parse(food.tags).length">
                    <span v-for="t in JSON.parse(food.tags).slice(0, 2)" :key="t"
                      class="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap" :class="tagColor(t)">{{ t }}</span>
                    <span v-if="JSON.parse(food.tags).length > 2" class="text-[10px] text-gray-300 ml-0.5">...</span>
                  </template>
                </div>
                <div class="text-xs mt-1">
                  <div :class="statusText(food)">{{ food.days_left >= 0 ? '还剩 ' + food.days_left + ' 天' : '已过期 ' + (-food.days_left) + ' 天' }}</div>
                  <div class="text-gray-400">过期：{{ food.expire_date }}</div>
                </div>
              </div>
              <div class="flex items-center gap-0.5 ml-1 shrink-0">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                  :class="[statusText(food), { 'bg-red-50': food.status==='expired', 'bg-yellow-50': food.status==='expiring', 'bg-primary-50': food.status==='normal' }]">
                  <span :class="statusDot(food)" class="w-1.5 h-1.5 rounded-full"></span>
                  {{ statusLabel(food) }}
                </span>
                <button @click.prevent="openEdit(food)" class="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 active:bg-blue-100 transition" title="编辑">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button @click.prevent="remove(food.id)" class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition" title="删除">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </router-link>
        </div>
      </div>
      </template>
    </main>

    <!-- 超限弹窗（Teleport 到 body 避免层级问题） -->
    <teleport to="body">
      <div v-if="showTagLimitModal" class="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" @click.self="showTagLimitModal = false">
        <div class="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center">
          <div class="text-2xl mb-3">🏷️</div>
          <p class="text-sm text-gray-600 mb-4">已达标签上限（8 个）</p>
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

