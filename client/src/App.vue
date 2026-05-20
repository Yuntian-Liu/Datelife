<script setup>
import { computed, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth'
import BottomNav from './components/BottomNav.vue'
import Watermark from './components/Watermark.vue'

const route = useRoute()
const { user, isAuthenticated } = useAuth()

const showNav = computed(() => route.path === '/')

const showAddForm = ref(false)
provide('showAddForm', showAddForm)
provide('auth', { user, isAuthenticated })
</script>

<template>
  <div class="min-h-screen bg-bg font-body">
    <router-view />
    <BottomNav v-if="showNav" @add="showAddForm = true" />
    <Watermark />
  </div>
</template>
