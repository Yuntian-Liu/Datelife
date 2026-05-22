<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { foods, auth } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { useConfirm } from '../composables/useConfirm'
import { USER_AGREEMENT_HTML, PRIVACY_POLICY_HTML } from '../utils/agreement'
import { getBadge } from '../utils/badges'
import { logger } from '../utils/logger'

const appVersion = __APP_VERSION__
const router = useRouter()
const { user, isAuthenticated, setAuth, logout } = useAuth()
const showConfirm = useConfirm()

// 食品统计
const foodCount = ref(0)

// 数据管理
const MAX_TAGS = 8
const importing = ref(false)
const pendingImportFoods = ref([])
const showTagConflict = ref(false)
const conflictExistingTags = ref([])
const conflictImportTags = ref([])
const conflictSelected = ref({})
const fileInput = ref(null)

async function exportData() {
  logger.info('export', '开始导出数据')
  const list = await foods.getAll()
  const tagCount = [...new Set(list.flatMap(f => { try { return JSON.parse(f.tags || '[]') } catch { return [] } }))].length
  logger.info('export', `导出 ${list.length} 条食品`, { tagCount })
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    app: 'Datelife',
    foods: list.map(({ name, barcode, produce_date, shelf_life_days, expire_date, category, tags }) => ({
      name, barcode, produce_date, shelf_life_days, expire_date, category, tags
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

function exportDiagnosticLogs() {
  const logData = {
    system: logger.getSystemInfo(),
    logs: logger.getLogs()
  }
  const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `datelife-debug-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return
  event.target.value = ''

  importing.value = true
  try {
    logger.info('import', '开始导入数据', { fileName: file.name, fileSize: file.size })
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsText(file)
    })

    let data
    try { data = JSON.parse(text) } catch {
      logger.error('import', 'JSON 解析失败')
      alert('文件格式错误，请选择有效的 Datelife 备份文件')
      return
    }

    if (!data.version || !Array.isArray(data.foods)) {
      logger.error('import', '无效的备份格式', { hasVersion: !!data.version, hasFoods: !!data.foods })
      alert('不是有效的 Datelife 备份文件')
      return
    }

    if (data.foods.length === 0) {
      logger.warn('import', '备份文件为空')
      alert('备份文件中没有食品数据')
      return
    }

    logger.info('import', `准备导入 ${data.foods.length} 条食品`)

    // 标签冲突检测
    const existingTags = await foods.getTags()
    const importTagSet = new Set()
    for (const item of data.foods) {
      try {
        JSON.parse(item.tags || '[]').forEach(t => { if (t) importTagSet.add(t) })
      } catch {}
    }
    const allTagSet = new Set([...existingTags, ...importTagSet])

    if (allTagSet.size > MAX_TAGS && importTagSet.size > 0) {
      pendingImportFoods.value = data.foods
      conflictExistingTags.value = existingTags
      conflictImportTags.value = [...importTagSet]
      // 默认：已有标签全选 + 导入标签按顺序填充剩余空位
      const defaultSelected = {}
      for (const t of existingTags) defaultSelected[t] = true
      let slots = Math.max(0, MAX_TAGS - existingTags.length)
      for (const t of importTagSet) {
        if (defaultSelected[t]) continue
        if (slots > 0) { defaultSelected[t] = true; slots-- }
        else defaultSelected[t] = false
      }
      conflictSelected.value = defaultSelected
      showTagConflict.value = true
      logger.info('import', '标签超限，弹出冲突弹窗', { existing: existingTags.length, importNew: importTagSet.size, total: allTagSet.size })
      return
    }

    await executeImport(data.foods)
  } catch (e) {
    logger.error('import', '导入异常', e.message)
    alert('导入失败：' + e.message)
  } finally {
    importing.value = false
  }
}

async function executeImport(foodsToImport) {
  const confirmed = await showConfirm({
    title: '导入数据',
    message: `将导入 ${foodsToImport.length} 条食品数据，是否继续？`,
    confirmText: '导入',
    cancelText: '取消'
  })
  if (!confirmed) { logger.info('import', '用户取消导入'); return }

  const existing = await foods.getAll()
  logger.info('import', `当前已有 ${existing.length} 条食品，进行去重检查`)
  const existingKeys = new Set(existing.map(f => f.name + '|' + f.produce_date))

  let success = 0, fail = 0, skipped = 0
  for (const item of foodsToImport) {
    if (!item.name || !item.produce_date || !item.shelf_life_days) {
      logger.warn('import', '跳过无效条目', item)
      fail++; continue
    }
    const key = item.name + '|' + item.produce_date
    if (existingKeys.has(key)) { skipped++; continue }
    try {
      await foods.create({
        name: item.name,
        barcode: item.barcode || null,
        produce_date: item.produce_date,
        shelf_life_days: item.shelf_life_days,
        category: item.category || null,
        tags: item.tags || '[]'
      })
      success++
      existingKeys.add(key)
    } catch (e) {
      logger.error('import', `创建食品失败: ${item.name}`, e.message)
      fail++
      if (e.message === '请先登录' || e.message.includes('登录已过期')) {
        alert('登录已过期，请重新登录后再导入')
        break
      }
    }
  }

  const list = await foods.getAll()
  foodCount.value = list.length

  logger.info('import', `导入完成: 成功${success}, 跳过${skipped}, 失败${fail}`)
  const parts = [`成功 ${success} 条`]
  if (skipped > 0) parts.push(`跳过 ${skipped} 条重复`)
  if (fail > 0) parts.push(`失败 ${fail} 条`)
  alert(`导入完成：${parts.join('，')}`)
}

const selectedCount = computed(() => Object.values(conflictSelected.value).filter(Boolean).length)

function toggleTag(name) {
  const cur = conflictSelected.value[name]
  if (cur) {
    conflictSelected.value = { ...conflictSelected.value, [name]: false }
  } else if (selectedCount.value < MAX_TAGS) {
    conflictSelected.value = { ...conflictSelected.value, [name]: true }
  }
}

function allConflictTags() {
  const all = []
  for (const t of conflictExistingTags.value) {
    all.push({ name: t, source: '已有' })
  }
  for (const t of conflictImportTags.value) {
    if (!conflictExistingTags.value.includes(t)) {
      all.push({ name: t, source: '导入' })
    }
  }
  return all
}

async function resolveConflict(action) {
  showTagConflict.value = false
  importing.value = true
  try {
    if (action === 'cancel') {
      logger.info('import', '用户放弃导入（标签冲突）')
      pendingImportFoods.value = []
      return
    }

    if (action === 'strip') {
      logger.info('import', '用户选择导入但不带标签')
      const stripped = pendingImportFoods.value.map(f => ({ ...f, tags: '[]' }))
      await executeImport(stripped)
      return
    }

    if (action === 'selected') {
      const keep = new Set(Object.entries(conflictSelected.value).filter(([, v]) => v).map(([k]) => k))
      logger.info('import', '用户选择保留部分标签导入', { keep: [...keep], count: keep.size })
      const filtered = pendingImportFoods.value.map(f => {
        let itemTags = []
        try { itemTags = JSON.parse(f.tags || '[]') } catch {}
        const kept = itemTags.filter(t => keep.has(t))
        return { ...f, tags: JSON.stringify(kept) }
      })
      await executeImport(filtered)
      return
    }
  } catch (e) {
    logger.error('import', '导入异常', e.message)
    alert('导入失败：' + e.message)
  } finally {
    importing.value = false
    pendingImportFoods.value = []
  }
}

// 协议/政策弹窗
const showAgreement = ref(false)
const agreementType = ref('agreement')

// 关于详情弹窗
const showAbout = ref(false)
const showChangelog = ref(false)
const showOpenSource = ref(false)
const selectedChangelog = ref('v2.9.0-alpha')
const showVersionDropdown = ref(false)

import { changelogData, getGroupedVersions } from '../utils/changelog.js'

const groupedVersions = getGroupedVersions()
const currentChangelog = computed(() => changelogData[selectedChangelog.value])
const collapsedGroups = ref(Object.fromEntries(Object.keys(groupedVersions).map(g => [g, g !== '2.9.x'])))

const avatarUrl = computed(() => {
  if (!user.value?.avatar_seed) return ''
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${user.value.avatar_seed}`
})

const badge = computed(() => getBadge(user.value?.badge))

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
async function mockLogin() {
  try {
    const { token, user } = await auth.devLogin(100000)
    setAuth(token, user)
    const list = await foods.getAll()
    foodCount.value = list.length
  } catch (e) {
    logger.error('settings', '模拟登录失败', { error: e.message })
    alert('模拟登录失败：' + e.message)
  }
}

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      const list = await foods.getAll()
      foodCount.value = list.length
    } catch (e) {
      logger.error('settings', '设置页加载食品数量失败', { error: e.message })
      foodCount.value = 0
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-bg">
    <main class="max-w-lg mx-auto px-4 py-8 pb-28 md:pb-8 space-y-4">
      <!-- PC端返回按钮 -->
      <button @click="router.push('/')"
        class="hidden md:inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-500 transition font-medium mb-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        返回首页
      </button>


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
            <button @click="router.push('/login?mode=password')"
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
                <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h3a2 2 0 012 2v3m0 5a2 2 0 002 2H7V7zm0 10h10M7 17h10a2 2 0 002-2V7"/>
                  <circle cx="18" cy="11" r="1" fill="currentColor"/>
                </svg>
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
        <div class="bg-white rounded-2xl shadow-md border border-gray-100/80 p-4 flex items-center gap-3.5">
          <template v-if="badge">
            <div class="rounded-full p-[2.5px] bg-gradient-to-r shadow-sm" :class="badge.ringColor">
              <img :src="avatarUrl" alt="头像"
                class="w-14 h-14 rounded-full bg-white shadow-inner" />
            </div>
          </template>
          <img v-else :src="avatarUrl" alt="头像"
            class="w-14 h-14 rounded-full bg-primary-100 shadow-inner ring-2 ring-primary-100" />
          <div class="flex-1 min-w-0">
            <h2 class="font-semibold text-gray-800 text-base truncate flex items-center gap-1.5">
              {{ user.nickname }}
              <span v-if="badge" :class="badge.style">{{ badge.label }}</span>
            </h2>
            <p class="text-xs text-gray-400 mt-0.5 truncate">{{ user.email }}</p>
          </div>
        </div>

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
          <div class="flex items-center justify-between px-1 mb-2">
            <h3 class="text-sm font-semibold text-gray-400">个人资料</h3>
            <button @click="router.push('/settings/edit')"
              class="text-xs text-primary-500 hover:text-primary-600 font-medium transition">编辑</button>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <!-- 头像行 -->
            <div class="flex items-center gap-3 px-4 py-3.5">
              <div class="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">头像</span>
              <img v-if="avatarUrl" :src="avatarUrl" class="w-7 h-7 rounded-full bg-primary-100" alt="头像" />
            </div>

            <div class="border-t border-gray-100 mx-4"></div>

            <!-- 昵称行 -->
            <div class="flex items-center gap-3 px-4 py-3.5">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">昵称</span>
              <span class="text-sm text-gray-400 truncate max-w-[40%]">{{ user.nickname }}</span>
            </div>

            <div class="border-t border-gray-100 mx-4"></div>

            <!-- 个性签名行 -->
            <div class="flex items-center gap-3 px-4 py-3.5">
              <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">个性签名</span>
              <span class="text-sm text-gray-400 truncate max-w-[40%]">{{ user.bio || '未设置' }}</span>
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

        <!-- 数据管理 -->
        <div>
          <h3 class="text-sm font-semibold text-gray-400 px-1 mb-2">数据管理</h3>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <router-link to="/tags"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.659A2.25 2.25 0 009.568 3z" />
                  <circle cx="16" cy="11" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">标签管理</span>
              <span class="text-xs text-gray-400">管理所有食品的标签</span>
              <svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </router-link>

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

        <!-- 关于 -->
        <div>
          <h3 class="text-sm font-semibold text-gray-400 px-1 mb-2">关于</h3>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
            <!-- 当前版本 -->
            <div @click="showAbout = true"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4 16.5" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">当前版本</span>
              <span class="text-sm text-gray-400">v{{ appVersion }}</span>
              <svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
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

            <div class="border-t border-gray-100 mx-4"></div>

            <div @click="exportDiagnosticLogs"
              class="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition cursor-pointer">
              <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">导出诊断日志</span>
              <span class="text-xs text-gray-400">用于排查问题</span>
              <svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
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

    <!-- 关于详情弹窗 -->
    <teleport to="body">
      <div v-if="showAbout" class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @click.self="showAbout = false">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col m-4">
          <h2 class="text-lg font-semibold p-5 pb-0 font-brand shrink-0">关于 Datelife</h2>
          <div class="p-5 overflow-y-auto text-sm text-gray-600 space-y-3">
            <!-- 1. 开发者 -->
            <div class="flex items-center gap-3 py-1">
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span class="text-gray-400 text-xs w-14 shrink-0">开发者</span>
              <span class="text-gray-700 font-medium">碳碳四键</span>
            </div>

            <!-- 2. 开源声明 -->
            <div @click="showOpenSource = true"
              class="flex items-center gap-3 py-1 -mx-1 px-1 rounded-lg hover:bg-gray-50 transition cursor-pointer group">
              <div class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <span class="text-gray-400 text-xs w-14 shrink-0">开源</span>
              <span class="text-gray-700 font-medium group-hover:text-primary-500 transition">MIT 开源项目</span>
              <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400 transition shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <!-- 3. 反馈 -->
            <a href="mailto:it@ytunx.com"
              class="flex items-center gap-3 py-1 -mx-1 px-1 rounded-lg hover:bg-gray-50 transition group">
              <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <span class="text-gray-400 text-xs w-14 shrink-0">反馈</span>
              <span class="text-gray-700 font-medium group-hover:text-primary-500 transition">it@ytunx.com</span>
            </a>

            <!-- 4. 版本日志 -->
            <div @click="showChangelog = true"
              class="flex items-center gap-3 py-1 -mx-1 px-1 rounded-lg hover:bg-gray-50 transition cursor-pointer group">
              <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <span class="text-gray-400 text-xs w-14 shrink-0">日志</span>
              <span class="text-gray-700 font-medium">版本日志</span>
              <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400 transition shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <!-- 5. 开发声明 -->
            <div class="bg-gray-50 rounded-xl p-4 text-xs text-gray-400 leading-relaxed space-y-2">
              <p>Datelife 仍处于早期开发阶段，现有功能可能随时修改、调整或移除，不保证长期兼容。</p>
              <p>如果你有任何想法或建议，欢迎通过 GitHub Issue 或邮件反馈。也欢迎提交 PR 参与共建，一起让 Datelife 变得更好！</p>
            </div>

          </div>
          <div class="p-4 border-t border-gray-100 shrink-0">
            <button @click="showAbout = false"
              class="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition">
              关闭
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 版本日志弹窗（三级） -->
    <teleport to="body">
      <div v-if="showChangelog" class="fixed inset-0 z-[110] flex items-center justify-center p-4"
        @click.self="showChangelog = false">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col m-4">
          <div class="flex items-center justify-between p-5 pb-0 shrink-0">
            <div class="flex items-center gap-2">
              <button @click="showChangelog = false" class="p-1 -ml-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 class="text-lg font-semibold font-brand">版本日志</h2>
            </div>
            <div class="relative">
              <button @click.stop="showVersionDropdown = !showVersionDropdown"
                class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition px-2 py-1 rounded-lg hover:bg-gray-100">
                <span>{{ selectedChangelog }}</span>
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-cap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <div v-if="showVersionDropdown"
                class="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[200px] z-50 max-h-[300px] overflow-y-auto">
                <template v-for="(versions, group) in groupedVersions" :key="group">
                  <button @click.stop="collapsedGroups[group] = !collapsedGroups[group]"
                    class="w-full text-left px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 hover:bg-gray-50 transition sticky top-0 bg-white z-10"
                    :class="collapsedGroups[group] ? 'text-gray-400' : 'text-gray-600'">
                    <svg class="w-2.5 h-2.5 transition-transform duration-150" :class="collapsedGroups[group] ? '' : 'rotate-90'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    {{ group }}
                  </button>
                  <div v-show="!collapsedGroups[group]">
                    <button v-for="v in versions" :key="v.version"
                      @click.stop="selectedChangelog = v.version; showVersionDropdown = false"
                      class="w-full text-left px-4 py-1.5 text-xs hover:bg-gray-50 transition flex items-center justify-between"
                      :class="selectedChangelog === v.version ? 'text-green-600 font-medium' : 'text-gray-600'">
                      <span>{{ v.version }}</span>
                      <span class="text-gray-400 text-[10px]">{{ v.date.slice(5) }}</span>
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <div class="p-5 overflow-y-auto text-sm text-gray-500 leading-relaxed" @click="showVersionDropdown = false">
            <template v-if="currentChangelog">
              <h3 class="text-xs font-semibold text-gray-700 mb-2">{{ selectedChangelog }} · {{ currentChangelog.date }}</h3>
              <div class="space-y-3">
                <div v-for="(section, idx) in currentChangelog.sections" :key="idx">
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
              </div>
            </template>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 开源声明弹窗（三级） -->
    <teleport to="body">
      <div v-if="showOpenSource" class="fixed inset-0 z-[110] flex items-center justify-center p-4"
        @click.self="showOpenSource = false">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col m-4">
          <div class="flex items-center gap-2 p-5 pb-0 shrink-0">
            <button @click="showOpenSource = false" class="p-1 -ml-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 class="text-lg font-semibold font-brand">开源声明</h2>
          </div>
          <div class="p-5 overflow-y-auto text-sm text-gray-500 leading-relaxed space-y-4">
            <!-- MIT 声明 -->
            <div class="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 leading-relaxed space-y-2">
              <p>Datelife 是一款基于 <strong class="text-gray-700">MIT 许可证</strong> 的开源项目，任何人都可以自由使用、修改和分发本项目的源代码。</p>
              <p>我们相信开放透明的代码能让软件变得更好，也欢迎你通过 GitHub 参与共建。</p>
              <a href="https://github.com/Yuntian-Liu/Datelife" target="_blank"
                class="inline-flex items-center gap-1.5 text-primary-500 hover:text-primary-600 font-medium transition mt-1">
                查看 GitHub 仓库
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <!-- 开源资源致谢 -->
            <div>
              <p class="text-xs font-semibold text-gray-600 mb-3">开源资源致谢</p>
              <p class="text-xs text-gray-400 mb-3">Datelife 的开发离不开开源社区的支持，在此特别感谢以下开源资源：</p>
              <div class="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 border border-gray-100">
                  <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12,23a10.927,10.927,0,0,0,7.778-3.222,1,1,0,0,0,0-1.414L13.414,12l6.364-6.364a1,1,0,0,0,0-1.414A11,11,0,1,0,12,23ZM12,3a8.933,8.933,0,0,1,5.618,1.967l-6.325,6.326a1,1,0,0,0,0,1.414l6.325,6.326A9,9,0,1,1,12,3Z"/>
                    <circle cx="21" cy="12" r="2"/>
                    <circle cx="10" cy="7" r="2"/>
                  </svg>
                </div>
                  <div class="text-xs text-gray-400 leading-relaxed space-y-1">
                    <p class="text-gray-500 font-medium">「吃掉一件」图标</p>
                    <p>源自 <strong class="text-gray-500">比赛 游戏 吃豆子冒险</strong></p>
                    <p>作者 <a href="https://icon-icons.com/zh/authors/544-royyan-wijaya" target="_blank" class="text-primary-500 hover:text-primary-600 underline transition">Royyan Wijaya</a> · 来自 <a href="https://icon-icons.com/zh/authors/544-royyan-wijaya" target="_blank" class="text-primary-500 hover:text-primary-600 underline transition">Icon-Icons.com</a></p>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 标签冲突弹窗 -->
    <teleport to="body">
      <div v-if="showTagConflict" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="resolveConflict('cancel')">
        <div class="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-md max-h-[80vh] flex flex-col mx-4">
          <div class="px-5 py-4 border-b border-gray-100 shrink-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">&#x26A0;&#xFE0F;</span>
              <span class="text-base font-semibold text-gray-800">标签数量超限</span>
            </div>
            <p class="text-sm text-gray-500">
              导入数据包含 {{ conflictImportTags.length }} 个新标签，加上已有 {{ conflictExistingTags.length }} 个标签，共 {{ allConflictTags().length }} 个，超过 {{ MAX_TAGS }} 个标签的限制。请选择保留的标签（最多 {{ MAX_TAGS }} 个）。
            </p>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-3 space-y-1">
            <div v-for="tag in allConflictTags()" :key="tag.name"
              @click="toggleTag(tag.name)"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition border',
                conflictSelected[tag.name] ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
              ]">
              <div :class="[
                'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition',
                conflictSelected[tag.name] ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
              ]">
                <svg v-if="conflictSelected[tag.name]" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span class="flex-1 text-sm font-medium text-gray-700">{{ tag.name }}</span>
              <span :class="tag.source === '已有' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-500'" class="text-xs px-2 py-0.5 rounded-full font-medium">{{ tag.source }}</span>
            </div>
          </div>

          <div class="px-5 py-3 border-t border-gray-100 shrink-0 space-y-2">
            <div class="text-xs text-gray-400 text-center">已选 {{ selectedCount }} / {{ MAX_TAGS }}</div>
            <div class="flex gap-2">
              <button @click="resolveConflict('cancel')"
                class="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                放弃导入
              </button>
              <button @click="resolveConflict('strip')"
                class="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
                导入但不带标签
              </button>
              <button @click="resolveConflict('selected')"
                :disabled="selectedCount === 0"
                class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition">
                保留所选并导入
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
