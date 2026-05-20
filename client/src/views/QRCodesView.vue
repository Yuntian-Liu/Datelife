<script setup>
import { ref, onMounted, inject, computed } from 'vue'
import { foods } from '../utils/api'

const { isAuthenticated } = inject('auth', { isAuthenticated: computed(() => false) })
const foodList = ref([])
const loading = ref(true)

onMounted(async () => {
  if (isAuthenticated.value) {
    try { foodList.value = await foods.getAll() } catch (e) {}
  }
  loading.value = false
})

function qrUrl(id) {
  return `/api/foods/${id}/qrcode`
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-6">
      <!-- 页面标题 -->
      <div class="mb-6">
        <h1 class="text-xl font-bold text-gray-800 font-brand">二维码打印</h1>
        <p class="text-sm text-gray-400 mt-1">共 {{ foodList.length }} 件食品</p>
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
          <span class="mt-3 text-sm font-medium text-gray-700 text-center truncate w-full">{{ food.name }}</span>
          <span class="text-xs text-gray-400 mt-0.5">{{ food.expire_date }} 过期</span>
        </div>
      </div>
    </main>
  </div>
</template>
