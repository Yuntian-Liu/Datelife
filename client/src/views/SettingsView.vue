<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { USER_AGREEMENT_HTML, PRIVACY_POLICY_HTML } from '../utils/agreement'
import { getBadge } from '../utils/badges'

const router = useRouter()
const { user, isAuthenticated, setAuth, logout } = useAuth()

// 编辑资料
const editing = ref(false)
const editNickname = ref('')
const editBio = ref('')
const saving = ref(false)
const errMsg = ref('')

// 修改密码
const showPasswordForm = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const pwSaving = ref(false)

// 协议/政策弹窗
const showAgreement = ref(false)
const agreementType = ref('agreement')

const avatarUrl = computed(() => {
  if (!user.value?.avatar_seed) return ''
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.value.avatar_seed}`
})

const badge = computed(() => getBadge(user.value?.badge))

function startEdit() {
  editNickname.value = user.value.nickname || ''
  editBio.value = user.value.bio || ''
  editing.value = true
}

async function saveProfile() {
  saving.value = true
  errMsg.value = ''
  try {
    const updated = await auth.updateProfile({ nickname: editNickname.value, bio: editBio.value })
    // 更新本地状态（直接修改 user 对象）
    Object.assign(user.value, updated)
    editing.value = false
  } catch (e) {
    errMsg.value = e.message
  } finally {
    saving.value = false
  }
}

async function handleLogout() {
  logout()
  router.push('/')
}

function goToLogin() {
  router.push('/login')
}

function openAgreement(type) {
  agreementType.value = type
  showAgreement.value = true
}

const agreementContent = computed(() =>
  agreementType.value === 'privacy' ? PRIVACY_POLICY_HTML : USER_AGREEMENT_HTML
)
</script>

<template>
  <div class="min-h-screen bg-bg">
    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <button @click="router.push('/')"
          class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 bg-gray-100 hover:bg-primary-50 px-4 py-2 rounded-full transition font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          返回首页
        </button>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-8">

      <!-- 未登录状态 -->
      <div v-if="!isAuthenticated" class="text-center">
        <!-- Logo -->
        <div class="mb-8">
          <span class="font-brand text-3xl font-bold text-gray-800">🍱 Datelife</span>
        </div>

        <p class="text-gray-500 mb-8">管理你的食品保质期</p>

        <div class="space-y-3 max-w-xs mx-auto">
          <button @click="goToLogin"
            class="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-medium transition shadow-md hover:shadow-lg active:scale-[0.98]">
            邮箱验证码登录
          </button>
          <button @click="goToLogin"
            class="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-medium border border-gray-200 transition active:scale-[0.98]">
            密码登录
          </button>
        </div>

        <div class="mt-10 text-left bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80">
          <p class="text-sm font-medium text-gray-700 mb-3">登录后可以：</p>
          <ul class="space-y-2 text-sm text-gray-500">
            <li class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
              云同步你的食品列表
            </li>
            <li class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
              多设备访问，随时随地管理
            </li>
            <li class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
              打印专属二维码标签贴在包装上
            </li>
            <li class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
              临期提醒，不再浪费食物
            </li>
          </ul>
        </div>
      </div>

      <!-- 已登录状态 -->
      <div v-else>
        <!-- 用户信息卡片 -->
        <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-6 mb-4">
          <div class="flex items-center gap-4">
            <img :src="avatarUrl" alt="头像"
              class="w-16 h-16 rounded-full bg-primary-100 shadow-inner" />
            <div class="flex-1 min-w-0">
              <h2 class="font-semibold text-gray-800 text-lg truncate flex items-center gap-1.5">
                {{ user.nickname }}
                <span v-if="badge" :class="badge.style">{{ badge.label }}</span>
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">UID: {{ user.uid }}</p>
              <p class="text-xs text-gray-400 truncate">{{ user.email }}</p>
            </div>
          </div>
        </div>

        <!-- 个人资料 -->
        <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-5 mb-4">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">个人资料</h3>

          <template v-if="!editing">
            <div class="space-y-3">
              <div class="flex justify-between items-center py-2">
                <span class="text-sm text-gray-400">昵称</span>
                <span class="text-sm font-medium text-gray-700 flex items-center gap-1">
                  {{ user.nickname }}
                  <span v-if="badge" :class="badge.style">{{ badge.label }}</span>
                </span>
              </div>
              <div class="flex justify-between items-start py-2">
                <span class="text-sm text-gray-400">个性签名</span>
                <span class="text-sm text-gray-700 text-right max-w-[60%]">{{ user.bio || '未设置' }}</span>
              </div>
            </div>
            <button @click="startEdit" class="mt-4 w-full py-2 rounded-xl text-sm font-medium bg-primary-50 text-primary-600 hover:bg-primary-100 transition">
              编辑资料
            </button>
          </template>

          <template v-else>
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">昵称</label>
                <input v-model="editNickname"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">个性签名</label>
                <input v-model="editBio" placeholder="写点什么..."
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
              </div>
            </div>
            <div v-if="errMsg" class="mt-2 text-red-500 text-xs">{{ errMsg }}</div>
            <div class="flex gap-2 mt-4">
              <button @click="saveProfile" :disabled="saving"
                class="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white py-2 rounded-xl text-sm font-medium transition">
                {{ saving ? '保存中...' : '保存' }}
              </button>
              <button @click="editing = false; errMsg = ''"
                class="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition">
                取消
              </button>
            </div>
          </template>
        </div>

        <!-- 账号安全 -->
        <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-5 mb-4">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">账号安全</h3>
          <button class="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition text-left px-4 flex items-center justify-between group">
            <span>退出登录</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 group-hover:text-red-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>

        <!-- 协议与政策 -->
        <div class="flex gap-3 text-xs text-gray-400 mt-2 justify-center">
          <a @click="openAgreement('agreement')" class="hover:text-primary-500 transition">用户协议</a>
          <span>·</span>
          <a @click="openAgreement('privacy')" class="hover:text-primary-500 transition">隐私政策</a>
        </div>

        <!-- 退出按钮 -->
        <button @click="handleLogout"
          class="w-full py-3 rounded-2xl text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition">
          退出登录
        </button>
      </div>

    </main>

    <!-- 协议/政策弹窗 -->
    <teleport to="body">
      <div v-if="showAgreement" class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @click.self="showAgreement = false">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col m-4">
          <h2 class="text-lg font-semibold p-5 pb-0 border-b border-gray-100 font-brand shrink-0">
            {{ agreementType === 'privacy' ? '隐私政策' : '用户协议' }}
          </h2>
          <div class="p-5 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-4">
            <div v-html="agreementContent"></div>
          </div>
          <div class="p-4 border-t border-gray-100 shrink-0">
            <button @click="showAgreement = false"
              class="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition">
              关闭
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
