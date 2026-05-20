<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, foods } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useConfirm } from '../composables/useConfirm'
import { USER_AGREEMENT_HTML, PRIVACY_POLICY_HTML } from '../utils/agreement'
import { getBadge } from '../utils/badges'

const router = useRouter()
const { user, isAuthenticated, setAuth, logout } = useAuth()
const showConfirm = useConfirm()

// 编辑资料
const editing = ref(false)
const editNickname = ref('')
const editBio = ref('')
const saving = ref(false)
const errMsg = ref('')

// 食品统计
const foodCount = ref(0)

// 数据管理
const importing = ref(false)
const fileInput = ref(null)

async function exportData() {
  const list = await foods.getAll()
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    app: 'Datelife',
    foods: list.map(({ name, barcode, produce_date, shelf_life_days, expire_date, category }) => ({
      name, barcode, produce_date, shelf_life_days, expire_date, category
    }))
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `datelife-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return
  // 重置 input 以便下次选同一文件也能触发
  event.target.value = ''

  importing.value = true
  try {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsText(file)
    })

    let data
    try { data = JSON.parse(text) } catch {
      alert('文件格式错误，请选择有效的 Datelife 备份文件')
      return
    }

    if (!data.version || !Array.isArray(data.foods)) {
      alert('不是有效的 Datelife 备份文件')
      return
    }

    if (data.foods.length === 0) {
      alert('备份文件中没有食品数据')
      return
    }

    const confirmed = await showConfirm({
      title: '导入数据',
      message: `将导入 ${data.foods.length} 条食品数据，是否继续？`,
      confirmText: '导入',
      cancelText: '取消'
    })
    if (!confirmed) return

    // 去重：获取现有数据
    const existing = await foods.getAll()
    const existingKeys = new Set(existing.map(f => f.name + '|' + f.produce_date))

    let success = 0, fail = 0, skipped = 0
    for (const item of data.foods) {
      if (!item.name || !item.produce_date || !item.shelf_life_days) { fail++; continue }
      const key = item.name + '|' + item.produce_date
      if (existingKeys.has(key)) { skipped++; continue }
      try {
        await foods.create({
          name: item.name,
          barcode: item.barcode || null,
          produce_date: item.produce_date,
          shelf_life_days: item.shelf_life_days,
          category: item.category || null
        })
        success++
        existingKeys.add(key)
      } catch { fail++ }
    }

    const list = await foods.getAll()
    foodCount.value = list.length

    const parts = [`成功 ${success} 条`]
    if (skipped > 0) parts.push(`跳过 ${skipped} 条重复`)
    if (fail > 0) parts.push(`失败 ${fail} 条`)
    alert(`导入完成：${parts.join('，')}`)
  } catch (e) {
    alert('导入失败：' + e.message)
  } finally {
    importing.value = false
  }
}

// 协议/政策弹窗
const showAgreement = ref(false)
const agreementType = ref('agreement')

const avatarUrl = computed(() => {
  if (!user.value?.avatar_seed) return ''
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${user.value.avatar_seed}`
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
    Object.assign(user.value, updated)
    editing.value = false
  } catch (e) {
    errMsg.value = e.message
  } finally {
    saving.value = false
  }
}

async function handleLogout() {
  const confirmed = await showConfirm({
    title: '退出登录',
    message: '确定要退出登录吗？',
    confirmText: '退出',
    cancelText: '取消',
    type: 'danger'
  })
  if (!confirmed) return
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

// 开发模式：模拟登录
const isDev = import.meta.env.DEV
function mockLogin() {
  const mockUser = { uid: 100000, nickname: '碳碳', email: 'test@datelife.app', avatar_seed: 'tantan', badge: 'developer', bio: '好好吃饭，不浪费' }
  setAuth('dev-mock-token', mockUser)
  foodCount.value = 12
}

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      const list = await foods.getAll()
      foodCount.value = list.length
    } catch (e) {
      foodCount.value = 0
    }
  }
})
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

    <main class="max-w-lg mx-auto px-4 py-6 space-y-4">

      <!-- 开发模式：模拟登录按钮 -->
      <button v-if="isDev && !isAuthenticated" @click="mockLogin"
        class="fixed top-20 right-4 z-50 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-gray-700 transition">
        模拟登录
      </button>

      <!-- 未登录状态 -->
      <div v-if="!isAuthenticated" class="space-y-4 pt-2">
        <!-- 品牌横幅 -->
        <div class="bg-gradient-to-br from-primary-500 via-primary-600 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-primary-200/50 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4"></div>
          <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
          <div class="relative z-10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">🍱</span>
              <span class="font-brand text-xl font-bold">Datelife</span>
            </div>
            <p class="text-white/90 text-sm mt-3">管理你的食品保质期</p>
            <p class="text-white/70 text-xs mt-1">让每一份食材都不被浪费</p>
          </div>
        </div>

        <!-- 登录 CTA -->
        <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-5">
          <p class="text-sm font-medium text-gray-700 mb-4 text-center">登录以解锁全部功能</p>
          <div class="space-y-3">
            <button @click="goToLogin"
              class="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-medium transition shadow-md hover:shadow-lg active:scale-[0.98]">
              邮箱验证码登录
            </button>
            <button @click="goToLogin"
              class="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-medium border border-gray-200 transition active:scale-[0.98]">
              密码登录
            </button>
          </div>
        </div>

        <!-- 功能列表 -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80">
          <p class="text-sm font-medium text-gray-700 mb-3">登录后可以：</p>
          <ul class="space-y-3">
            <li class="flex items-start gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700">云同步</span>
                <p class="text-xs text-gray-400 mt-0.5">多设备访问，随时随地管理</p>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM14.25 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM3.75 14.25c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 18.75v-4.5zM14.25 14.25c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /></svg>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700">二维码标签</span>
                <p class="text-xs text-gray-400 mt-0.5">打印专属二维码贴在包装上</p>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700">临期提醒</span>
                <p class="text-xs text-gray-400 mt-0.5">不再浪费食物</p>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700">珍惜每一份食材</span>
                <p class="text-xs text-gray-400 mt-0.5">记录保质期，减少浪费</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- 已登录状态 -->
      <div v-else class="space-y-4 pt-2">
        <!-- 用户信息行 -->
        <button @click="startEdit"
          class="w-full bg-white rounded-2xl shadow-md border border-gray-100/80 p-4 flex items-center gap-3.5 active:scale-[0.98] transition">
          <img :src="avatarUrl" alt="头像"
            class="w-14 h-14 rounded-full bg-primary-100 shadow-inner ring-2 ring-primary-100" />
          <div class="flex-1 min-w-0 text-left">
            <h2 class="font-semibold text-gray-800 text-base truncate flex items-center gap-1.5">
              {{ user.nickname }}
              <span v-if="badge" :class="badge.style">{{ badge.label }}</span>
            </h2>
            <p class="text-xs text-gray-400 mt-0.5 truncate">{{ user.email }}</p>
          </div>
          <svg class="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- 品牌横幅卡 -->
        <div class="bg-gradient-to-br from-primary-500 via-primary-600 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-primary-200/50 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4"></div>
          <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
          <div class="relative z-10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">🍱</span>
              <span class="font-brand text-xl font-bold">Datelife</span>
            </div>
            <p class="text-white/90 text-sm mt-3">
              已管理 <span class="font-bold text-white text-lg">{{ foodCount }}</span> 件食品
            </p>
            <p class="text-white/70 text-xs mt-1">让每一份食材都不被浪费</p>
          </div>
        </div>

        <!-- 个人资料 -->
        <div>
          <h3 class="text-sm font-semibold text-gray-400 px-1 mb-2">个人资料</h3>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <!-- 昵称行 -->
            <div v-if="!editing" @click="startEdit"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">昵称</span>
              <span class="text-sm text-gray-400 truncate max-w-[40%]">{{ user.nickname }}</span>
              <svg class="w-4 h-4 text-gray-300 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <!-- 个性签名行 -->
            <div v-if="!editing" @click="startEdit"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">个性签名</span>
              <span class="text-sm text-gray-400 truncate max-w-[40%]">{{ user.bio || '未设置' }}</span>
              <svg class="w-4 h-4 text-gray-300 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <!-- 编辑表单区域 -->
            <div v-if="editing" class="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4 mt-1">
              <div>
                <label class="block text-xs text-gray-400 mb-1">昵称</label>
                <input v-model="editNickname"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">个性签名</label>
                <input v-model="editBio" placeholder="写点什么..."
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
              </div>
              <div v-if="errMsg" class="text-red-500 text-xs">{{ errMsg }}</div>
              <div class="flex gap-2 pt-1">
                <button @click="saveProfile" :disabled="saving"
                  class="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-medium transition">
                  {{ saving ? '保存中...' : '保存' }}
                </button>
                <button @click="editing = false; errMsg = ''"
                  class="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition font-medium">
                  取消
                </button>
              </div>
            </div>

            <!-- 邮箱（只读） -->
            <div class="border-t border-gray-100 mx-4"></div>
            <div class="flex items-center gap-3 px-4 py-3.5">
              <div class="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">邮箱</span>
              <span class="text-sm text-gray-400 truncate max-w-[45%]">{{ user.email }}</span>
            </div>

            <!-- UID（只读） -->
            <div class="border-t border-gray-100 mx-4"></div>
            <div class="flex items-center gap-3 px-4 py-3.5">
              <div class="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">UID</span>
              <span class="text-sm text-gray-400 font-mono">{{ user.uid }}</span>
            </div>
          </div>
        </div>

        <!-- 关于 -->
        <div>
          <h3 class="text-sm font-semibold text-gray-400 px-1 mb-2">关于</h3>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <!-- 当前版本（置顶） -->
            <div class="flex items-center gap-3 px-4 py-3.5">
              <div class="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4 16.5" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">当前版本</span>
              <span class="text-sm text-gray-400">v2.1.2-alpha</span>
            </div>

            <div class="border-t border-gray-100 mx-4"></div>

            <div @click="openAgreement('agreement')"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">用户协议</span>
              <svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div class="border-t border-gray-100 mx-4"></div>

            <div @click="openAgreement('privacy')"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.214088 15 15 10.5m2.25 4.5H6.75A2.25 2.25 0 014.5 12.75V6A2.25 2.25 0 016.75 3.75h10.5A2.25 2.25 0 0119.5 6v6.75a2.25 2.25 0 01-2.25 2.25z" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">隐私政策</span>
              <svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 数据管理 -->
        <div>
          <h3 class="text-sm font-semibold text-gray-400 px-1 mb-2">数据管理</h3>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <div @click="exportData"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">导出数据</span>
              <span class="text-xs text-gray-400">JSON 备份</span>
              <svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div class="border-t border-gray-100 mx-4"></div>

            <div @click="triggerImport"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5l-4.5-4.5M12 16.5V3" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">导入数据</span>
              <span class="text-xs text-gray-400">从备份恢复</span>
              <svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <!-- 隐藏文件选择器 -->
          <input ref="fileInput" type="file" accept=".json" @change="handleImport" class="hidden" />
        </div>

        <!-- 账号与安全（退出登录放最后） -->
        <div>
          <h3 class="text-sm font-semibold text-gray-400 px-1 mb-2">账号与安全</h3>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <div @click="handleLogout"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-red-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-red-500">退出登录</span>
            </div>
          </div>
        </div>

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
