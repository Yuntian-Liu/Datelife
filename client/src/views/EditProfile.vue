<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { logger } from '../utils/logger'

const router = useRouter()
const { user } = useAuth()

const nickname = ref('')
const bio = ref('')
const saving = ref(false)
const errMsg = ref('')

// 头像选择
const avatarPool = ref([])
const selectedAvatarIndex = ref(-1)
const avatarSeed = ref('')
const showAvatarPicker = ref(false)

const currentAvatarUrl = computed(() => {
  if (!user.value?.avatar_seed) return ''
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${user.value.avatar_seed}`
})

const displayAvatarUrl = computed(() => {
  if (avatarSeed.value && selectedAvatarIndex.value >= 0) {
    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${avatarSeed.value}`
  }
  return currentAvatarUrl.value
})

function generateRandomSeed() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

function generateAvatarPool() {
  avatarPool.value = Array.from({ length: 9 }, () => ({
    seed: generateRandomSeed()
  }))
  selectedAvatarIndex.value = -1
  avatarSeed.value = ''
}

const avatarUrls = computed(() =>
  avatarPool.value.map(item => ({
    ...item,
    url: `https://api.dicebear.com/7.x/lorelei/svg?seed=${item.seed}`
  }))
)

function selectAvatar(idx) {
  selectedAvatarIndex.value = idx
  avatarSeed.value = avatarPool.value[idx].seed
  showAvatarPicker.value = false
}

function openAvatarPicker() {
  generateAvatarPool()
  showAvatarPicker.value = true
}

onMounted(() => {
  nickname.value = user.value?.nickname || ''
  bio.value = user.value?.bio || ''
})

async function saveProfile() {
  errMsg.value = ''
  if (!nickname.value.trim()) {
    errMsg.value = '昵称不能为空'
    return
  }

  saving.value = true
  try {
    const data = {
      nickname: nickname.value.trim(),
      bio: bio.value.trim()
    }
    if (avatarSeed.value) {
      data.avatar_seed = avatarSeed.value
    }
    const updated = await auth.updateProfile(data)
    Object.assign(user.value, updated)
    localStorage.setItem('user', JSON.stringify(user.value))
    logger.info('profile', '保存资料成功', { nickname: data.nickname })
    router.push('/settings')
  } catch (e) {
    logger.error('profile', '保存资料失败', { error: e.message })
    errMsg.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <button @click="router.push('/settings')"
          class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 bg-gray-100 hover:bg-primary-50 px-4 py-2 rounded-full transition font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          编辑资料
        </button>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-6 space-y-6">
      <!-- 头像区域 -->
      <div class="flex flex-col items-center">
        <div class="relative">
          <img :src="displayAvatarUrl" alt="头像"
            class="w-24 h-24 rounded-full bg-primary-100 shadow-inner ring-4 ring-primary-50" />
          <div v-if="avatarSeed && selectedAvatarIndex >= 0"
            class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>
        <button @click="openAvatarPicker"
          class="mt-3 text-sm text-primary-500 hover:text-primary-600 font-medium transition">
          更换头像
        </button>
      </div>

      <!-- 表单 -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-500 mb-1.5">昵称</label>
          <input v-model="nickname" placeholder="取个好听的名字"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent bg-white" />
        </div>
        <div>
          <label class="block text-sm text-gray-500 mb-1.5">个性签名 <span class="text-gray-300">(可选)</span></label>
          <input v-model="bio" placeholder="写点什么介绍自己..." maxlength="50"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent bg-white" />
        </div>

        <div v-if="errMsg" class="p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
          {{ errMsg }}
        </div>

        <button @click="saveProfile" :disabled="saving || !nickname.trim()"
          class="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition shadow-md hover:shadow-lg active:scale-[0.98]">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </main>

    <!-- 头像选择器底部面板 -->
    <teleport to="body">
      <div v-if="showAvatarPicker" class="fixed inset-0 z-50 flex items-end justify-center pb-10 px-4" @click.self="showAvatarPicker = false">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-3xl w-full max-w-lg p-6 animate-slide-up">
          <div class="text-center mb-4">
            <p class="font-semibold text-gray-800">选择你的头像</p>
          </div>

          <div class="grid grid-cols-3 gap-3 mb-4">
            <div v-for="(avatar, idx) in avatarUrls" :key="avatar.seed"
              @click="selectAvatar(idx)"
              class="relative aspect-square rounded-2xl p-1 cursor-pointer transition-all duration-200 active:scale-95"
              :class="selectedAvatarIndex === idx
                ? 'border-2 border-primary-500 bg-primary-50 ring-2 ring-primary-200 shadow-md'
                : 'border-2 border-gray-200 bg-white hover:border-primary-300'">
              <img :src="avatar.url" :alt="'头像' + (idx+1)"
                class="w-full h-full rounded-xl" />
              <div v-if="selectedAvatarIndex === idx"
                class="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
                <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
          </div>

          <button @click="generateAvatarPool"
            class="mx-auto flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium transition mb-4">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            换一批
          </button>

          <button @click="showAvatarPicker = false"
            class="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition">
            取消
          </button>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
</style>
