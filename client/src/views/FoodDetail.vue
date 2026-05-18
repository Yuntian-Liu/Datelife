<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { foods } from '../utils/api'

const route = useRoute()
const router = useRouter()
const food = ref(null)
const error = ref('')
const qrKey = ref(0)

async function loadFood() {
  try {
    food.value = await foods.getById(route.params.id)
    qrKey.value = Date.now()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(loadFood)
watch(() => route.params.id, loadFood)

function statusLabel(f) {
  if (f.status === 'expired') return '已过期'
  if (f.status === 'expiring') return '临期'
  return '可食用'
}

function statusDot(f) {
  if (f.status === 'expired') return 'bg-red-500'
  if (f.status === 'expiring') return 'bg-yellow-500'
  return 'bg-green-500'
}

function statusText(f) {
  if (f.status === 'expired') return 'text-red-600 bg-red-50'
  if (f.status === 'expiring') return 'text-yellow-600 bg-yellow-50'
  return 'text-green-600 bg-green-50'
}

function daysColor(f) {
  if (f.status === 'expired') return 'text-red-600 font-medium'
  if (f.status === 'expiring') return 'text-yellow-600'
  return ''
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航 -->
    <header class="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <button @click="router.push('/')" class="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          返回列表
        </button>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div v-if="error" class="text-center text-red-400 py-20">{{ error }}</div>

      <!-- PC端：左右分栏 -->
      <div v-else-if="food" class="hidden md:grid md:grid-cols-[1fr_280px] md:gap-8">
        <!-- 左侧：食品信息 -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-bold text-gray-800">{{ food.name }}</h1>
            <span :class="statusText(food)" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium">
              <span :class="statusDot(food)" class="w-2 h-2 rounded-full"></span>
              {{ statusLabel(food) }}
            </span>
          </div>

          <div class="space-y-0 divide-y divide-gray-100">
            <div class="flex justify-between py-4">
              <span class="text-gray-400">生产日期</span>
              <span class="text-gray-700 font-medium">{{ food.produce_date }}</span>
            </div>
            <div class="flex justify-between py-4">
              <span class="text-gray-400">保质期</span>
              <span class="text-gray-700 font-medium">{{ food.shelf_life_days }} 天</span>
            </div>
            <div class="flex justify-between py-4">
              <span class="text-gray-400">过期日期</span>
              <span class="text-gray-800 font-bold text-lg">{{ food.expire_date }}</span>
            </div>
            <div class="flex justify-between py-4">
              <span class="text-gray-400">剩余天数</span>
              <span :class="daysColor(food)" class="font-bold text-lg">
                {{ food.days_left >= 0 ? food.days_left + ' 天' : '已过期 ' + (-food.days_left) + ' 天' }}
              </span>
            </div>
          </div>

          <div class="text-xs text-gray-300 mt-8 pt-4 border-t border-gray-100">
            录入于 {{ food.created_at }}
          </div>
        </div>

        <!-- 右侧：二维码 -->
        <div class="flex flex-col items-center justify-start pt-4">
          <p class="text-xs text-gray-400 mb-4">扫码查看详情</p>
          <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 inline-block">
            <img :key="qrKey" :src="`/api/foods/${food.id}/qrcode?t=${qrKey}`" alt="二维码" class="w-48 h-48 rounded-lg" />
          </div>
          <p class="text-xs text-gray-300 mt-3 text-center max-w-[200px]">
            打印此标签贴在食品包装上，扫码即可查看详情
          </p>
        </div>
      </div>

      <!-- 手机端：上下堆叠 -->
      <div v-else-if="food" class="md:hidden space-y-4">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-lg font-bold text-gray-800">{{ food.name }}</h1>
            <span :class="statusText(food)" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium">
              <span :class="statusDot(food)" class="w-1.5 h-1.5 rounded-full"></span>
              {{ statusLabel(food) }}
            </span>
          </div>

          <div class="space-y-0 divide-y divide-gray-100 text-sm">
            <div class="flex justify-between py-3">
              <span class="text-gray-400">生产日期</span>
              <span class="text-gray-700">{{ food.produce_date }}</span>
            </div>
            <div class="flex justify-between py-3">
              <span class="text-gray-400">保质期</span>
              <span class="text-gray-700">{{ food.shelf_life_days }} 天</span>
            </div>
            <div class="flex justify-between py-3">
              <span class="text-gray-400">过期日期</span>
              <span class="text-gray-700 font-bold">{{ food.expire_date }}</span>
            </div>
            <div class="flex justify-between py-3">
              <span class="text-gray-400">剩余天数</span>
              <span :class="daysColor(food)">
                {{ food.days_left >= 0 ? food.days_left + ' 天' : '已过期 ' + (-food.days_left) + ' 天' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 二维码 -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center">
          <p class="text-xs text-gray-400 mb-3">扫码查看详情</p>
          <img :key="qrKey" :src="`/api/foods/${food.id}/qrcode?t=${qrKey}`" alt="二维码" class="w-40 h-40 rounded-xl" />
        </div>
      </div>
    </main>
  </div>
</template>
