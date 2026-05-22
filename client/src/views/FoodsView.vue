<script setup>
import { ref, onMounted, inject, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { foods } from '../utils/api'
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
  while (used.includes(color) && used.length < TAG_COLORS.length) {
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
const filter = ref(
  route.query.filter && ['normal', 'expiring', 'expired'].includes(route.query.filter)
    ? route.query.filter : 'all'
)
const searchQuery = ref(route.query.q || '')

// 标签相关
const allTags = ref([])
const selectedFilterTags = ref(
  route.query.tags ? route.query.tags.split(',').filter(Boolean) : []
)
const showTagFilter = ref(false)

// 排序：time = 添加时间（默认），expiry = 到期紧急程度
const sortBy = ref(route.query.sort === 'expiry' ? 'expiry' : 'time')

// toast
const toastLine1 = ref('')
const toastLine2 = ref('')
const toastDone = ref(false)

async function consumeFood(food) {
  try {
    if ((food.quantity ?? 1) <= 1) {
      const confirmed = await showConfirm({
        title: '最后一件也吃掉啦',
        message: '确定要删除「' + food.name + '」吗？',
        confirmText: '吃掉并删除',
        cancelText: '取消',
        type: 'danger'
      })
      if (!confirmed) return
    }
    const result = await foods.consume(food.id)
    if (result.deleted) {
      foodList.value = foodList.value.filter(f => f.id !== food.id)
      toastLine1.value = '已吃掉最后一件「' + food.name + '」'
      toastLine2.value = '已删除，嗝~'
      toastDone.value = true
    } else {
      food.quantity = result.quantity
      toastLine1.value = '已吃掉一件「' + food.name + '」'
      toastLine2.value = '还剩 ' + result.quantity + ' 件，嗝~'
      toastDone.value = false
    }
    logger.info('foods', '吃掉一件', { foodId: food.id, name: food.name, result })
  } catch (e) {
    logger.error('foods', '吃掉一件失败', { foodId: food.id, error: e.message })
  }
  setTimeout(() => { toastLine1.value = ''; toastLine2.value = '' }, 2000)
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

// 从 App.vue 注入底部导航的添加触发
const showAddForm = inject('showAddForm', ref(false))
watch(showAddForm, (val) => {
  if (val) {
    router.push('/foods/add')
    showAddForm.value = false
  }
})

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
    try { foodList.value = await foods.getAll() } catch (e) { logger.error('foods', '食品列表加载失败', { error: e.message }) }
    try { allTags.value = await foods.getTags() } catch (e) { logger.warn('tags', '加载已有标签列表失败', { error: e.message }) }
  }
  loading.value = false
})

// 筛选状态变化时同步到 URL
watch(
  () => [filter.value, selectedFilterTags.value.join(','), searchQuery.value, sortBy.value],
  () => { syncFiltersToQuery() }
)

// URL query 变化时同步回筛选状态（如点击底部导航 /foods 重置筛选，或从详情页返回恢复筛选）
watch(
  () => [route.query.filter, route.query.tags, route.query.q, route.query.sort],
  ([f, t, q, s]) => {
    filter.value = (f && ['normal', 'expiring', 'expired'].includes(f)) ? f : 'all'
    selectedFilterTags.value = t ? t.split(',').filter(Boolean) : []
    searchQuery.value = q || ''
    sortBy.value = s === 'expiry' ? 'expiry' : 'time'
    if (f || t || q || s) {
      logger.info('foods', '从 URL 恢复筛选状态', { filter: f || 'all', tags: t || '', q: q || '', sort: s || 'time' })
    }
  }
)

// 状态筛选变化记录
watch(filter, (val, old) => {
  if (old && val !== old) logger.info('foods', '状态筛选', { from: old, to: val })
})

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
          <div class="relative flex items-stretch">
            <button @click.stop="showTagFilter = !showTagFilter; filter = 'tags'"
              class="px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1"
              :class="(filter === 'tags' || selectedFilterTags.length) ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-primary-500'"
            >
              {{ selectedFilterTags.length === 0 ? '标签' : (selectedFilterTags.length === 1 ? selectedFilterTags[0] : selectedFilterTags[0] + '+' + (selectedFilterTags.length - 1)) }}
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <!-- 标签选择面板 -->
            <div v-if="showTagFilter" class="absolute top-full mt-2 right-0 sm:right-auto sm:left-0 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-20 sm:min-w-[180px] max-h-[240px] overflow-y-auto"
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
              :class="sortBy === 'time' ? 'ring-1 ring-primary-500 text-gray-700' : 'text-gray-400 hover:text-gray-600'"
              title="按添加时间排序">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button @click="sortBy = 'expiry'; logger.info('foods', '切换排序：到期紧急')" class="w-7 h-7 rounded-full flex items-center justify-center transition"
              :class="sortBy === 'expiry' ? 'ring-1 ring-primary-500 text-gray-700' : 'text-gray-400 hover:text-gray-600'"
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
              <th class="px-5 py-3 font-medium">数量</th>
              <th class="px-5 py-3 font-medium">过期日期</th>
              <th class="px-5 py-3 font-medium">状态</th>
              <th class="px-5 py-3 font-medium w-32">操作</th>
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
              <td class="px-5 py-3.5 text-sm text-gray-600 font-medium">×{{ food.quantity ?? 1 }}</td>
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
                  <button @click.prevent="router.push('/foods/edit/' + food.id)" class="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition" title="编辑"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                  <button @click.prevent="consumeFood(food)" class="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition" title="吃掉一件">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12,23a10.927,10.927,0,0,0,7.778-3.222,1,1,0,0,0,0-1.414L13.414,12l6.364-6.364a1,1,0,0,0,0-1.414A11,11,0,1,0,12,23ZM12,3a8.933,8.933,0,0,1,5.618,1.967l-6.325,6.326a1,1,0,0,0,0,1.414l6.325,6.326A9,9,0,1,1,12,3Z"/>
                      <circle cx="21" cy="12" r="2"/>
                      <circle cx="10" cy="7" r="2"/>
                    </svg>
                  </button>
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
                  <div :class="statusText(food)">{{ food.days_left >= 0 ? '还剩 ' + food.days_left + ' 天' : '已过期 ' + (-food.days_left) + ' 天' }}<span class="text-gray-400"> · ×{{ food.quantity ?? 1 }} 件</span></div>
                  <div class="text-gray-400">过期：{{ food.expire_date }}</div>
                </div>
              </div>
              <div class="flex items-center gap-0.5 ml-1 shrink-0">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                  :class="[statusText(food), { 'bg-red-50': food.status==='expired', 'bg-yellow-50': food.status==='expiring', 'bg-primary-50': food.status==='normal' }]">
                  <span :class="statusDot(food)" class="w-1.5 h-1.5 rounded-full"></span>
                  {{ statusLabel(food) }}
                </span>
                <button @click.prevent="router.push('/foods/edit/' + food.id)" class="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 active:bg-blue-100 transition" title="编辑">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button @click.prevent="consumeFood(food)" class="p-1 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 active:bg-amber-100 transition" title="吃掉一件">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12,23a10.927,10.927,0,0,0,7.778-3.222,1,1,0,0,0,0-1.414L13.414,12l6.364-6.364a1,1,0,0,0,0-1.414A11,11,0,1,0,12,23ZM12,3a8.933,8.933,0,0,1,5.618,1.967l-6.325,6.326a1,1,0,0,0,0,1.414l6.325,6.326A9,9,0,1,1,12,3Z"/>
                    <circle cx="21" cy="12" r="2"/>
                    <circle cx="10" cy="7" r="2"/>
                  </svg>
                </button>
                <button @click.prevent="remove(food.id)" class="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition" title="删除">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </router-link>
        </div>
      </div>
      </template>
    </main>

    <!-- Toast -->
    <teleport to="body">
      <div v-if="toastLine1" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] backdrop-blur-md text-sm px-5 py-3 rounded-2xl shadow-xl transition-all duration-300 max-w-[280px] text-center"
        :class="toastDone ? 'bg-green-50/80 border border-green-100/50 text-green-700' : 'bg-white/80 border border-gray-100/50 text-gray-700'">
        <p class="break-all">{{ toastLine1 }}</p>
        <p class="mt-0.5">{{ toastLine2 }}</p>
      </div>
    </teleport>
  </div>
</template>

