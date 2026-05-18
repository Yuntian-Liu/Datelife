<script setup>
import { computed, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'

const route = useRoute()
const showNav = computed(() => route.path === '/')

const showAddForm = ref(false)
provide('showAddForm', showAddForm)
</script>

<template>
  <div class="min-h-screen bg-bg font-body">
    <router-view />
    <BottomNav v-if="showNav" @add="showAddForm = true" />
  </div>
</template>
