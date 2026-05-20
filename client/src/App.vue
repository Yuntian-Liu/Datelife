<script setup>
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import { logger } from './utils/logger'
import DesktopHeader from './components/DesktopHeader.vue'
import BottomNav from './components/BottomNav.vue'
import Watermark from './components/Watermark.vue'

const route = useRoute()
const router = useRouter()
const { user, isAuthenticated } = useAuth()

const showNav = computed(() => ['/', '/foods', '/qrcodes', '/settings'].includes(route.path) && !route.path.startsWith('/scan'))

const showAddForm = ref(false)
provide('showAddForm', showAddForm)
provide('auth', { user, isAuthenticated })

function handleAdd() {
  if (route.path === '/foods') {
    showAddForm.value = true
  } else {
    router.push('/foods').then(() => {
      showAddForm.value = true
    })
  }
}

onMounted(() => {
  logger.info('app', 'App 初始化', { route: route.path, isAuthenticated: isAuthenticated.value, isDev: import.meta.env.DEV })
})

watch(() => route.path, (to, from) => {
  if (from) logger.info('nav', `路由: ${from} → ${to}`)
})
</script>

<template>
  <div class="min-h-screen bg-bg font-body">
    <DesktopHeader v-if="showNav" @add="handleAdd" />
    <router-view />
    <BottomNav v-if="showNav" @add="handleAdd" />
    <Watermark />
  </div>
</template>
