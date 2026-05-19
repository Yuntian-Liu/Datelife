<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  siteKey: { type: String, required: true }
})

const emit = defineEmits(['verify', 'expire', 'error'])

const containerRef = ref(null)
let widgetId = null

onMounted(() => {
  if (!window.turnstile) {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = renderWidget
    document.head.appendChild(script)
  } else {
    renderWidget()
  }
})

function renderWidget() {
  if (!containerRef.value || !window.turnstile) return
  widgetId = window.turnstile.render(containerRef.value, {
    sitekey: props.siteKey,
    callback: (token) => emit('verify', token),
    'expired-callback': () => emit('expire'),
    'error-callback': () => emit('error')
  })
}

onUnmounted(() => {
  if (widgetId && window.turnstile) {
    window.turnstile.remove(widgetId)
  }
})
</script>

<template>
  <div ref="containerRef" class="turnstile-widget"></div>
</template>
