<script setup>
const emit = defineEmits(['add'])
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

        <!-- 中间占位，给凸起按钮留空间 -->
        <div class="w-14"></div>

        <router-link
          to="/settings"
          class="flex flex-col items-center gap-0.5 text-gray-400 hover:text-primary-500 transition px-4 py-1"
          active-class="!text-primary-500"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-xs font-semibold">设置</span>
        </router-link>
      </div>

      <!-- 中间凸起的"+"按钮 -->
      <button
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
