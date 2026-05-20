<script setup>
import { inject, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const emit = defineEmits(['add'])
const { user, isAuthenticated } = inject('auth', { user: computed(() => null), isAuthenticated: computed(() => false) })

const avatarUrl = computed(() => {
  if (!user.value?.avatar_seed) return ''
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${user.value.avatar_seed}`
})

function linkClass(path) {
  if (path === '/settings') {
    return route.path.startsWith('/settings')
      ? 'text-primary-600 font-semibold'
      : 'text-gray-500 hover:text-primary-500 transition'
  }
  return route.path === path
    ? 'text-primary-600 font-semibold'
    : 'text-gray-500 hover:text-primary-500 transition'
}
</script>

<template>
  <header class="hidden md:block bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20">
    <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
      <!-- 左侧：品牌 -->
      <router-link to="/" class="font-brand text-xl font-bold text-gray-800 shrink-0">
        🍱 Datelife
      </router-link>

      <!-- 右侧：导航链接 + 添加按钮 + 设置 -->
      <nav class="flex items-center gap-1">
        <router-link to="/" class="px-3 py-1.5 rounded-lg text-sm transition" :class="linkClass('/')">首页</router-link>
        <router-link to="/foods" class="px-3 py-1.5 rounded-lg text-sm transition" :class="linkClass('/foods')">食品</router-link>
        <router-link to="/qrcodes" class="px-3 py-1.5 rounded-lg text-sm transition" :class="linkClass('/qrcodes')">二维码</router-link>

        <span class="w-px h-5 bg-gray-200 mx-2"></span>

        <button
          v-if="isAuthenticated"
          @click="emit('add')"
          class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition shadow-md hover:shadow-lg active:scale-95"
        >+ 添加食品</button>

        <router-link
          to="/settings"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition"
          :class="linkClass('/settings')"
        >
          <img v-if="isAuthenticated && avatarUrl" :src="avatarUrl"
            class="w-6 h-6 rounded-full bg-primary-100 shadow-sm" alt="头像" />
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{{ isAuthenticated ? user.nickname : '设置' }}</span>
        </router-link>
      </nav>
    </div>
  </header>
</template>
