// ==================== Datelife Service Worker ====================
const CACHE_NAME = 'datelife-v251a'

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// Install: 预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// Activate: 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

// Fetch: 分层缓存策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 非 GET 请求不处理
  if (event.request.method !== 'GET') return

  // API 请求：直接走网络，不缓存
  if (url.pathname.startsWith('/api/')) return

  // CDN 资源（Google Fonts 等）：Network First
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then((res) => { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, clone)); return res })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // index.html：Network First（确保更新）
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, clone)); return res })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // 其他同源静态资源：Cache First
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
          return res
        })
      )
    )
  }
})
