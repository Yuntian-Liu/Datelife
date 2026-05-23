<script setup>
import { ref, onMounted, onActivated, inject, computed } from 'vue'
import { foods } from '../utils/api'
import { getBadge } from '../utils/badges'
import { logger } from '../utils/logger'

const { user, isAuthenticated } = inject('auth', { user: ref(null), isAuthenticated: computed(() => false) })
const badge = computed(() => getBadge(user.value?.badge))

const foodList = ref([])
const loading = ref(true)

let initLock = false

async function loadHome() {
  if (initLock) return
  initLock = true
  if (isAuthenticated.value) {
    try {
      foodList.value = await foods.getAll()
      logger.info('home', '首页加载完成', { total: foodList.value.length, expiring: stats.value.expiring, expired: stats.value.expired })
    } catch (e) {
      logger.error('home', '首页加载失败', { error: e.message })
    }
  }
  loading.value = false
  initLock = false
}

onMounted(loadHome)
onActivated(loadHome)

const stats = computed(() => {
  const total = foodList.value.length
  const normal = foodList.value.filter(f => f.status === 'normal').length
  const expiring = foodList.value.filter(f => f.status === 'expiring').length
  const expired = foodList.value.filter(f => f.status === 'expired').length
  return { total, normal, expiring, expired }
})

const expiringSoon = computed(() => {
  return foodList.value
    .filter(f => f.status === 'expiring')
    .sort((a, b) => a.days_left - b.days_left)
    .slice(0, 2)
})

const expiredList = computed(() => {
  return foodList.value
    .filter(f => f.status === 'expired')
    .sort((a, b) => b.days_left - a.days_left)
    .slice(0, 2)
})

function daysLabel(d) {
  return d >= 0 ? `还剩 ${d} 天` : `已过期 ${-d} 天`
}

function avatarUrl(seed) {
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-6">

      <!-- 未登录：欢迎页 -->
      <div v-if="!isAuthenticated" class="text-center py-20">
        <div class="mb-4">
          <span class="font-brand text-3xl font-bold text-gray-800">🍱 Datelife</span>
        </div>
        <p class="text-gray-400 mb-8">管理你的食品保质期</p>
        <router-link to="/settings"
          class="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-full font-medium transition shadow-md hover:shadow-lg active:scale-95">
          开始使用 →
        </router-link>
      </div>

      <!-- 已登录：仪表盘 -->
      <template v-if="isAuthenticated">
        <!-- 问候卡片 -->
        <div v-if="user" class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-5 mb-6 flex items-center gap-4">
          <div class="relative shrink-0">
            <template v-if="badge">
              <div class="rounded-full p-[2.5px] bg-gradient-to-r shadow-sm" :class="badge.ringColor">
                <img v-if="user.avatar_seed" :src="avatarUrl(user.avatar_seed)"
                  class="w-14 h-14 rounded-full bg-white shadow-sm" alt="头像" />
                <div v-else class="w-14 h-14 rounded-full bg-white flex items-center justify-center text-2xl">🍱</div>
              </div>
            </template>
            <template v-else>
              <img v-if="user.avatar_seed" :src="avatarUrl(user.avatar_seed)"
                class="w-14 h-14 rounded-full bg-primary-100 shadow-sm" alt="头像" />
              <div v-else class="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-2xl">🍱</div>
            </template>
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-gray-800 truncate">你好，{{ user.nickname }}</h2>
            <p v-if="user.bio" class="text-sm text-gray-400 truncate mt-0.5">{{ user.bio }}</p>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="text-center text-gray-400 py-20">加载中...</div>

        <template v-else>
          <!-- 统计卡片 -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-4 text-center">
              <div class="text-2xl font-bold text-gray-800">{{ stats.total }}</div>
              <div class="text-xs text-gray-400 mt-1">总共管理</div>
            </div>
            <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-4 text-center">
              <div class="text-2xl font-bold text-primary-500">{{ stats.normal }}</div>
              <div class="text-xs text-gray-400 mt-1">可食用</div>
            </div>
            <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-4 text-center">
              <div class="text-2xl font-bold text-yellow-500">{{ stats.expiring }}</div>
              <div class="text-xs text-gray-400 mt-1">临期</div>
            </div>
            <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-4 text-center">
              <div class="text-2xl font-bold text-red-400">{{ stats.expired }}</div>
              <div class="text-xs text-gray-400 mt-1">已过期</div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="foodList.length === 0" class="text-center py-16">
            <div class="text-4xl mb-3">🍽️</div>
            <div class="text-gray-400 text-sm mb-4">还没有食品，点击下方 + 添加吧</div>
          </div>

          <template v-else>
            <!-- 临期 + 已过期 双栏 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <!-- 即将过期 -->
              <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-5 min-h-[160px] flex flex-col">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                    即将过期
                  </h3>
                  <router-link v-if="stats.expiring > 0" to="/foods" class="text-xs text-primary-500 hover:text-primary-600 font-medium transition">
                    查看全部 →
                  </router-link>
                </div>
                <div v-if="expiringSoon.length" class="space-y-2 flex-1">
                  <router-link v-for="food in expiringSoon" :key="food.id" :to="`/f/${food.id}`"
                    class="flex items-center justify-between py-2 px-3 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition">
                    <span class="text-sm font-medium text-gray-700 truncate max-w-[70%]">{{ food.name }}</span>
                    <span class="text-xs text-yellow-600 font-medium shrink-0 ml-2">{{ daysLabel(food.days_left) }}</span>
                  </router-link>
                </div>
                <div v-else class="flex-1 flex items-center justify-center">
                  <span class="text-xs text-gray-300">保质期还早呢~</span>
                </div>
              </div>

              <!-- 已过期 -->
              <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-5 min-h-[160px] flex flex-col">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-800 text-sm flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-red-400"></span>
                    已过期
                  </h3>
                  <router-link v-if="stats.expired > 0" to="/foods" class="text-xs text-primary-500 hover:text-primary-600 font-medium transition">
                    查看全部 →
                  </router-link>
                </div>
                <div v-if="expiredList.length" class="space-y-2 flex-1">
                  <router-link v-for="food in expiredList" :key="food.id" :to="`/f/${food.id}`"
                    class="flex items-center justify-between py-2 px-3 bg-red-50 rounded-xl hover:bg-red-100 transition">
                    <span class="text-sm font-medium text-gray-700 truncate max-w-[70%]">{{ food.name }}</span>
                    <span class="text-xs text-red-600 font-medium shrink-0 ml-2">{{ daysLabel(food.days_left) }}</span>
                  </router-link>
                </div>
                <div v-else class="flex-1 flex items-center justify-center">
                  <span class="text-xs text-gray-300">都在保质期内~</span>
                </div>
              </div>
            </div>
          </template>
        </template>
      </template>

    </main>
  </div>
</template>
