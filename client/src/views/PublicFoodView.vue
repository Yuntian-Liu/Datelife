<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { foods } from '../utils/api'
import { logger } from '../utils/logger'

defineOptions({ name: 'PublicFoodView' })

const route = useRoute()
const router = useRouter()
const food = ref(null)
const error = ref('')
const loading = ref(true)

async function loadFood() {
  loading.value = true
  error.value = ''
  food.value = null
  try {
    const isUuid = route.path.startsWith('/u/')
    const param = isUuid ? route.params.uuid : route.params.id
    const data = isUuid ? await foods.getByUuid(param) : await foods.getById(param)
    food.value = data
    logger.info('public-detail', '查看公开食品详情', { id: data.id, uuid: data.uuid, name: data.name, viaUuid: isUuid })
  } catch (e) {
    const param = route.params.uuid || route.params.id
    logger.error('public-detail', '加载食品失败', { param, error: e.message })
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadFood)
watch(() => [route.params.id, route.params.uuid], ([id, uuid]) => {
  if (id || uuid) loadFood()
})

const isConsumed = computed(() => !!food.value?.consumed_at)

function statusLabel(f) {
  if (f.consumed_at) return '已移除'
  if (f.status === 'expired') return '已过期'
  if (f.status === 'expiring') return '临期'
  return '可食用'
}

function statusDot(f) {
  if (f.consumed_at) return 'bg-gray-400'
  if (f.status === 'expired') return 'bg-red-500'
  if (f.status === 'expiring') return 'bg-yellow-500'
  return 'bg-primary-500'
}

function statusText(f) {
  if (f.consumed_at) return 'text-gray-600 bg-gray-50'
  if (f.status === 'expired') return 'text-red-600 bg-red-50'
  if (f.status === 'expiring') return 'text-yellow-600 bg-yellow-50'
  return 'text-primary-600 bg-primary-50'
}

function shelfLifeDisplay(f) {
  const days = f.shelf_life_days
  const unit = f.shelf_life_unit || '天'
  if (unit === '周') return (days / 7) + ' 周'
  if (unit === '月') return (days / 30) + ' 月'
  return days + ' 天'
}

function daysColor(f) {
  if (f.status === 'expired') return 'text-red-600 font-medium'
  if (f.status === 'expiring') return 'text-yellow-600'
  return ''
}

function calcDaysLeft(f) {
  // 统一使用 UTC+8 计算"今天"
  const now = new Date()
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const today = new Date(Date.UTC(utc8.getUTCFullYear(), utc8.getUTCMonth(), utc8.getUTCDate()))

  const expire = new Date(f.expire_date)
  expire.setHours(0, 0, 0, 0)
  return Math.ceil((expire - today) / (1000 * 60 * 60 * 24))
}

function statusBorder(f) {
  if (f.consumed_at) return 'border-l-gray-300'
  if (f.status === 'expired') return 'border-l-red-400'
  if (f.status === 'expiring') return 'border-l-yellow-400'
  return 'border-l-primary-400'
}

const TAG_COLORS = ['bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700', 'bg-orange-100 text-orange-700', 'bg-lime-100 text-lime-700']
const tagColorCache = new Map()

function tagColor(name) {
  if (tagColorCache.has(name)) return tagColorCache.get(name)
  const used = [...tagColorCache.values()]
  let idx = 0
  for (let i = 0; i < name.length; i++) idx += name.charCodeAt(i)
  let color = TAG_COLORS[idx % TAG_COLORS.length]
  while (used.includes(color) && used.length < TAG_COLORS.length) { idx++; color = TAG_COLORS[idx % TAG_COLORS.length] }
  tagColorCache.set(name, color)
  return color
}

function foodTags(f) {
  try { return JSON.parse(f.tags || '[]') } catch { return [] }
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <!-- 顶部导航 -->
    <header class="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <router-link to="/" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 bg-gray-100 hover:bg-primary-50 px-4 py-2 rounded-full transition font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          了解更多 🍱 Datelife
        </router-link>
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div v-if="loading" class="text-center text-gray-300 py-20">加载中...</div>
      <div v-else-if="error" class="text-center text-red-400 py-20">{{ error }}</div>

      <div v-if="food" class="bg-white rounded-2xl shadow-md border border-gray-100/80 border-l-4 p-5 sm:p-8" :class="statusBorder(food)">
        <div class="flex items-center justify-between mb-4 sm:mb-6">
          <h1 class="text-lg sm:text-2xl font-bold text-gray-800 font-brand">{{ food.name }}</h1>
          <span :class="statusText(food)" class="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium">
            <span :class="statusDot(food)" class="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full"></span>
            {{ statusLabel(food) }}
          </span>
        </div>

        <!-- 标签 -->
        <div v-if="foodTags(food).length" class="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-6">
          <span v-for="t in foodTags(food)" :key="t" class="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium" :class="tagColor(t)">{{ t }}</span>
        </div>

        <!-- consumed 提示 -->
        <div v-if="isConsumed" class="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500">
          该食品已从列表中移除
        </div>

        <div class="space-y-0 divide-y divide-gray-100 text-sm sm:text-base">
          <div class="flex justify-between py-3 sm:py-4">
            <span class="text-gray-400">生产日期</span>
            <span class="text-gray-700 font-medium">{{ food.produce_date }}</span>
          </div>
          <div class="flex justify-between py-3 sm:py-4">
            <span class="text-gray-400">保质期</span>
            <span class="text-gray-700 font-medium">{{ shelfLifeDisplay(food) }}</span>
          </div>
          <div class="flex justify-between py-3 sm:py-4">
            <span class="text-gray-400">过期日期</span>
            <span class="text-gray-800 font-bold text-base sm:text-lg">{{ food.expire_date }}</span>
          </div>
          <div class="flex justify-between py-3 sm:py-4">
            <span class="text-gray-400">剩余天数</span>
            <span :class="daysColor(food)" class="font-bold text-base sm:text-lg">
              {{ calcDaysLeft(food) >= 0 ? calcDaysLeft(food) + ' 天' : '已过期 ' + (-calcDaysLeft(food)) + ' 天' }}
            </span>
          </div>
        </div>

        <!-- 二维码 -->
        <div class="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center">
          <p class="text-xs text-gray-400 mb-3">扫码查看详情</p>
          <img :src="`/api/foods/${food.id}/qrcode`" alt="二维码" class="w-32 h-32 rounded-xl" />
          <p class="text-[11px] text-gray-300 mt-2">打印此标签贴在食品包装上</p>
        </div>
      </div>

      <!-- 底部推广 -->
      <div v-if="food" class="mt-8">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
          <p class="text-sm font-medium text-gray-700 mb-1">🍱 Datelife</p>
          <p class="text-xs text-gray-400 mb-3">扫码即知新鲜期，让每一份食品都不被辜负</p>
          <div class="flex items-center justify-center gap-3 text-xs text-gray-400 mb-3">
            <span>📅 保质期追踪</span>
            <span class="text-gray-200">|</span>
            <span>📱 扫码管理</span>
            <span class="text-gray-200">|</span>
            <span>🏷️ 标签分类</span>
          </div>
          <a href="/" class="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium transition">
            立即体验
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </main>
  </div>
</template>
