<script setup>
defineProps({
  visible: Boolean,
  showMessage: Boolean
})
</script>

<template>
  <div v-if="visible" class="fixed top-0 left-0 right-0 z-[110] h-[2.5px] overflow-hidden pointer-events-none">
    <div class="h-full w-[35%] bg-gradient-to-r from-transparent via-primary-400 to-transparent loading-bar" />
  </div>

  <teleport to="body">
    <Transition name="msg">
      <div v-if="showMessage"
        class="fixed inset-0 z-[115] flex items-center justify-center p-6 pointer-events-none">
        <div
          class="bg-white/85 backdrop-blur-lg rounded-2xl shadow-lg shadow-black/5 px-6 py-5 max-w-[280px] text-center border border-gray-100/50">
          <p class="text-lg font-semibold font-brand text-gray-800">稍等片刻</p>
          <p class="text-sm text-gray-500 mt-1.5">🍱 Datelife 正在为你准备页面...</p>
          <p class="text-xs text-gray-400 mt-2 leading-relaxed">
            首次访问需下载一点资源，网络较慢时可能稍久。第二次打开就很快啦~
          </p>
        </div>
      </div>
    </Transition>
  </teleport>
</template>

<style scoped>
.loading-bar {
  animation: slide 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  position: absolute;
  top: 0;
  height: 100%;
}

@keyframes slide {
  0%   { left: -35%; }
  100% { left: 100%; }
}

.msg-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.msg-leave-active {
  transition: all 0.2s ease;
}
.msg-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.msg-leave-to {
  opacity: 0;
}
</style>
