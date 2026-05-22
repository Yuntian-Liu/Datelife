<script setup>
import { computed, onMounted, onBeforeUnmount, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import { logger } from './utils/logger'
import { changelogData } from './utils/changelog.js'
import DesktopHeader from './components/DesktopHeader.vue'
import BottomNav from './components/BottomNav.vue'
import Watermark from './components/Watermark.vue'
import RouteLoading from './components/RouteLoading.vue'

const UPDATE_KEY = 'datelife_last_seen_version'

const route = useRoute()
const router = useRouter()
const { user, isAuthenticated } = useAuth()

const showNav = computed(() => ['/', '/foods', '/qrcodes', '/settings'].includes(route.path) && !route.path.startsWith('/scan'))

const showAddForm = ref(false)
const showUpdateModal = ref(false)
const updateInfo = ref(null)
provide('showAddForm', showAddForm)
provide('auth', { user, isAuthenticated })

function checkVersionUpdate() {
  const lastSeen = localStorage.getItem(UPDATE_KEY)
  if (lastSeen !== __APP_VERSION__) {
    const changelog = changelogData['v' + __APP_VERSION__]
    if (changelog) {
      updateInfo.value = changelog
      showUpdateModal.value = true
      logger.info('app', '检测到版本更新，展示更新日志', { version: __APP_VERSION__, lastSeen: lastSeen || '(首次)' })
    }
  }
}

function closeUpdateModal() {
  showUpdateModal.value = false
  localStorage.setItem(UPDATE_KEY, __APP_VERSION__)
}

function handleAdd() {
  if (route.path === '/foods') {
    showAddForm.value = true
  } else {
    router.push('/foods').then(() => {
      showAddForm.value = true
    })
  }
}

const isRouteLoading = ref(false)
const showLoadingMessage = ref(false)
let loadingTimer = null
let messageTimer = null
let removeRouteGuards = null

onMounted(() => {
  logger.info('app', 'App 初始化', { route: route.path, isAuthenticated: isAuthenticated.value, isDev: import.meta.env.DEV })
  checkVersionUpdate()

  removeRouteGuards = (() => {
    const r1 = router.beforeEach(() => {
      clearTimeout(loadingTimer)
      clearTimeout(messageTimer)
      isRouteLoading.value = false
      showLoadingMessage.value = false

      loadingTimer = setTimeout(() => { isRouteLoading.value = true }, 300)
      messageTimer = setTimeout(() => { showLoadingMessage.value = true }, 1500)
      return true
    })
    const r2 = router.afterEach(() => {
      clearTimeout(loadingTimer)
      clearTimeout(messageTimer)
      isRouteLoading.value = false
      showLoadingMessage.value = false
    })
    return () => { r1(); r2() }
  })()

  setTimeout(() => {
    import('./views/QRCodesView.vue')
    import('./views/ScanView.vue')
    import('./views/SettingsView.vue')
  }, 3000)
})

onBeforeUnmount(() => {
  if (removeRouteGuards) removeRouteGuards()
})

watch(() => route.path, (to, from) => {
  if (from) logger.info('nav', `路由: ${from} → ${to}`)
})
</script>

<template>
  <div class="min-h-screen bg-bg font-body">
    <RouteLoading :visible="isRouteLoading" :show-message="showLoadingMessage" />
    <DesktopHeader v-if="showNav" @add="handleAdd" />
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <BottomNav v-if="showNav" @add="handleAdd" />
    <Watermark />

    <!-- 版本更新提醒 -->
    <teleport to="body">
      <div v-if="showUpdateModal" class="fixed inset-0 z-[120] flex items-center justify-center p-4"
        @click.self="closeUpdateModal">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[75vh] flex flex-col m-4">
          <div class="p-5 text-center shrink-0">
            <div class="text-2xl mb-2">🍱</div>
            <h2 class="text-lg font-semibold font-brand text-gray-800">Datelife 更新啦！</h2>
            <p class="text-sm text-gray-400 mt-1">快来看看有什么新功能~</p>
          </div>
          <div class="px-5 overflow-y-auto text-sm text-gray-500 leading-relaxed">
            <template v-if="updateInfo">
              <div v-for="(section, idx) in updateInfo.sections" :key="idx" class="mb-3">
                <p class="text-xs font-medium mb-1"
                  :class="{
                    'text-green-600': section.color === 'green',
                    'text-blue-600': section.color === 'blue',
                    'text-red-500': section.color === 'red',
                    'text-gray-500': section.color === 'gray'
                  }">{{ section.type }}</p>
                <ul class="text-xs text-gray-500 space-y-0.5 list-disc pl-4">
                  <li v-for="(item, i) in section.items" :key="i">{{ item }}</li>
                </ul>
              </div>
            </template>
          </div>
          <div class="p-4 shrink-0">
            <button @click="closeUpdateModal"
              class="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition active:scale-[0.98]">
              知道了
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
