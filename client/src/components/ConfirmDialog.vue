<script setup>
const props = defineProps({
  title: { type: String, default: '确认' },
  message: { type: String, required: true },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  type: { type: String, default: 'default' } // 'default' | 'danger'
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- 遮罩 -->
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('cancel')"></div>

    <!-- 弹窗 -->
    <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ title }}</h3>
      <p class="text-sm text-gray-500 mb-6">{{ message }}</p>

      <div class="flex gap-3 justify-end">
        <button
          @click="emit('cancel')"
          class="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          {{ cancelText }}
        </button>
        <button
          @click="emit('confirm')"
          class="px-4 py-2 rounded-xl text-sm text-white transition"
          :class="type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
