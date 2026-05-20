<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { foods } from '../utils/api'
import { useConfirm } from '../composables/useConfirm'
import { logger } from '../utils/logger'

const router = useRouter()
const showConfirm = useConfirm()
const { isAuthenticated } = inject('auth', { isAuthenticated: computed(() => false) })

const allTags = ref([])
const tagInput = ref('')
const tagCounts = ref({})
const loading = ref(true)

const TAG_COLORS = ['bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700', 'bg-orange-100 text-orange-700', 'bg-lime-100 text-lime-700']
const tagColorCache = new Map()

function tagColor(name) {
  if (tagColorCache.has(name)) return tagColorCache.get(name)
  const used = [...tagColorCache.values()]
  let idx = 0
  for (let i = 0; i < name.length; i++) idx += name.charCodeAt(i)
  let color = TAG_COLORS[idx % TAG_COLORS.length]
  while (used.includes(color)) { idx++; color = TAG_COLORS[idx % TAG_COLORS.length] }
  tagColorCache.set(name, color)
  return color
}

async function loadTags() {
  if (!isAuthenticated.value) return
  try {
    const list = await foods.getAll()
    const countMap = {}
    for (const f of list) {
      try {
        JSON.parse(f.tags || '[]').forEach(t => { countMap[t] = (countMap[t] || 0) + 1 })
      } catch {}
    }
    allTags.value = Object.keys(countMap).sort()
    tagCounts.value = countMap
  } catch (e) {}
  loading.value = false
}

onMounted(loadTags)

function addTag() {
  const t = tagInput.value.trim()
  if (!t) return
  if (allTags.value.includes(t)) {
    tagInput.value = ''
    return
  }
  allTags.value.push(t)
  allTags.value.sort()
  tagCounts.value[t] = 0
  tagInput.value = ''
}

async function deleteTag(t) {
  const confirmed = await showConfirm({
    title: '删除标签',
    message: `确定要删除标签「${t}」吗？\n\n将从所有食品中移除此标签（共 ${tagCounts.value[t] || 0} 个食品受影响）。此操作不可撤销。`,
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  })
  if (!confirmed) return

  try {
    await foods.deleteTag(t)
    logger.info('tags', '全局删除标签', { tag: t })
    allTags.value = allTags.value.filter(tag => tag !== t)
    delete tagCounts.value[t]
    tagColorCache.delete(t)
  } catch (e) {
    logger.error('tags', '删除标签失败', { tag: t, error: e.message })
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <!-- 顶部导航 -->
    <header class="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <button @click="router.push('/settings')"
          class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 bg-gray-100 hover:bg-primary-50 px-4 py-2 rounded-full transition font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          返回设置
        </button>
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div class="mb-8">
        <h1 class="text-xl font-bold text-gray-800 font-brand flex items-center gap-2">
          标签管理
          <span class="text-sm font-normal text-gray-400 font-sans ml-1">ℹ 管理所有食品的标签</span>
        </h1>
      </div>

      <div v-if="loading" class="text-center text-gray-300 py-20">加载中...</div>

      <div v-else>
        <!-- 标签列表 -->
        <div v-if="allTags.length" class="space-y-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400">所有标签 ({{ allTags.length }})</span>
          </div>
          <div class="space-y-2">
            <div v-for="t in allTags" :key="t"
              class="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100/80 p-3.5 group hover:border-primary-200 transition">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="px-2.5 py-1 rounded-full text-sm font-medium whitespace-nowrap select-none" :class="tagColor(t)">{{ t }}</span>
                <span class="text-xs text-gray-300 shrink-0">用于 {{ tagCounts[t] || 0 }} 个食品</span>
              </div>
              <button @click="deleteTag(t)"
                class="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition">
                删除
              </button>
            </div>
          </div>
        </div>

        <div v-else class="text-center text-gray-300 py-16">
          <div class="text-4xl mb-3">🏷️</div>
          <p class="text-sm">还没有标签</p>
          <p class="text-xs text-gray-400 mt-1">在添加食品时输入标签即可</p>
        </div>

        <!-- 新增标签 -->
        <div class="mt-8 pt-6 border-t border-gray-100">
          <h2 class="text-sm font-semibold text-gray-500 mb-3">新增标签</h2>
          <div class="flex gap-2">
            <input v-model="tagInput" @keydown.enter.prevent="addTag" placeholder="输入标签名..."
              class="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
            <button @click="addTag"
              class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shrink-0">添加</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
