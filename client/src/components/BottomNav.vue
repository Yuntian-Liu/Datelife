<script setup>
import { inject, computed } from 'vue'
import { getBadge } from '../utils/badges'

const emit = defineEmits(['add'])
const { user, isAuthenticated } = inject('auth', { user: computed(() => null), isAuthenticated: computed(() => false) })

const avatarUrl = computed(() => {
  if (!user.value?.avatar_seed) return ''
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${user.value.avatar_seed}`
})

const badge = computed(() => getBadge(user.value?.badge))
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 md:hidden">
    <div class="relative mx-4 mb-4">
      <div class="bg-white rounded-full shadow-lg px-4 py-2 flex items-center justify-around">
        <router-link
          to="/"
          class="flex flex-col items-center gap-0.5 text-gray-400 hover:text-primary-500 transition px-4 py-1"
          active-class="!text-primary-500"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
          </svg>
          <span class="text-xs font-semibold">首页</span>
        </router-link>

        <!-- 食品 -->
        <router-link
          to="/foods"
          class="flex flex-col items-center gap-0.5 text-gray-400 hover:text-primary-500 transition px-4 py-1"
          active-class="!text-primary-500"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span class="text-xs font-semibold">食品</span>
        </router-link>

        <!-- 中间占位，给凸起按钮留空间 -->
        <div class="w-14"></div>

        <!-- 二维码 -->
        <router-link
          to="/qrcodes"
          class="flex flex-col items-center gap-0.5 text-gray-400 hover:text-primary-500 transition px-4 py-1"
          active-class="!text-primary-500"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM14.25 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM3.75 14.25c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM14.25 14.25c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
          </svg>
          <span class="text-xs font-semibold">二维码</span>
        </router-link>

        <router-link
          to="/settings"
          class="relative flex flex-col items-center gap-0.5 text-gray-400 hover:text-primary-500 transition px-4 py-1"
          active-class="!text-primary-500"
        >
          <!-- 已登录时显示头像 -->
          <div v-if="isAuthenticated && avatarUrl" class="relative">
            <img :src="avatarUrl"
              class="w-6 h-6 rounded-full bg-primary-100 shadow-sm" alt="头像" />
            <span v-if="badge" class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm"
              :class="badge?.label === '开发者' ? 'bg-amber-400' : badge?.label === '内测' ? 'bg-emerald-400' : 'bg-violet-400'"></span>
          </div>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-xs font-semibold">设置</span>
        </router-link>
      </div>

      <!-- 中间凸起的"+"按钮（仅已登录显示） -->
      <button
        v-if="isAuthenticated"
        @click="emit('add')"
        class="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 rounded-full shadow-xl flex items-center justify-center transition-colors"
      >
        <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  </nav>
</template>
