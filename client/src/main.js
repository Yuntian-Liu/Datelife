import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { logger } from './utils/logger'

createApp(App).use(router).mount('#app')

// PWA Service Worker（仅生产模式）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch((e) => {
    logger.warn('sw', 'Service Worker 注册失败', { error: e.message })
  })
}
