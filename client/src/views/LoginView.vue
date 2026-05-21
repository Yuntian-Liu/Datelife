<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import { logger } from '../utils/logger'
import TurnstileWidget from '../components/TurnstileWidget.vue'
import { USER_AGREEMENT_HTML, PRIVACY_POLICY_HTML } from '../utils/agreement'
import { BETA_AGREEMENT_HTML } from '../utils/betaAgreement'

const router = useRouter()
const route = useRoute()
const { setAuth } = useAuth()

const isDev = import.meta.env.DEV
const mode = ref(route.query.mode === 'password' ? 'password' : 'code')

onMounted(() => {
  if (route.query.mode === 'password') mode.value = 'password'
})
const step = ref(1)
const email = ref('')
const code = ref(['', '', '', '', '', ''])
const nickname = ref('')
const password = ref('')
const bio = ref('')
const needInvite = ref(false)
const inviteCode = ref('')
const inviteVerified = ref(false)
const agreedBeta = ref(false)
const inviteError = ref('')
const turnstileToken = ref(isDev ? 'dev-bypass' : '')
const loading = ref(false)
const errMsg = ref('')
const agreed = ref(false)
const showAgreement = ref(false)
const agreementType = ref('agreement')
const countdown = ref(0)
let timer = null

// 头像选择
const avatarPool = ref([])
const selectedAvatarIndex = ref(-1)
const avatarSeed = ref('')

// 注册成功结果（Step 5 展示用）
const registerResult = ref(null)

// 验证码输入框 refs
const codeInputs = ref([])

function generateRandomSeed() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

function generateAvatarPool() {
  avatarPool.value = Array.from({ length: 9 }, () => ({
    seed: generateRandomSeed(),
    url: `https://api.dicebear.com/7.x/lorelei/svg?seed=${generateRandomSeed()}`
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
}

function focusNext(idx) {
  if (idx < 5 && code.value[idx]) {
    nextTick(() => codeInputs.value[idx + 1]?.focus())
  }
}

function handleCodeInput(idx, e) {
  const val = e.target.value
  if (val && idx < 5) {
    code.value[idx] = val.slice(-1)
    nextTick(() => codeInputs.value[idx + 1]?.focus())
  } else if (!val && idx > 0) {
    code.value[idx] = ''
    nextTick(() => codeInputs.value[idx - 1]?.focus())
  } else {
    code.value[idx] = val.slice(-1)
  }
}

function handleCodePaste(e) {
  const paste = e.clipboardData.getData('text').slice(0, 6).split('')
  paste.forEach((ch, i) => { if (i < 6) code.value[i] = ch })
  const lastFilled = Math.min(paste.length - 1, 5)
  nextTick(() => codeInputs.value[lastFilled]?.focus())
}

function startCountdown() {
  countdown.value = 60
  clearInterval(timer)
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function sendCode(skipInviteCheck) {
  errMsg.value = ''
  inviteError.value = ''
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errMsg.value = '请输入有效的邮箱地址'
    return
  }
  if (!turnstileToken.value) {
    errMsg.value = '请完成人机验证'
    return
  }

  // 邀请码模式：检查邮箱是否需要邀请码（仅未注册且 INVITE_MODE=true 时需要）
  if (!skipInviteCheck && !inviteVerified.value) {
    loading.value = true
    try {
      const check = await auth.checkEmail(email.value)
      if (check.needInvite) {
        needInvite.value = true
        loading.value = false
        return
      }
    } catch (e) {
      logger.error('auth', '邮箱检查失败', { email: email.value, error: e.message })
      // 检查失败时放行，继续发验证码（可能是网络问题）
    }
  }

  loading.value = true
  try {
    const body = { email: email.value, turnstileToken: turnstileToken.value }
    if (inviteVerified.value && inviteCode.value) body.invite_code = inviteCode.value
    await auth.sendCode(email.value, turnstileToken.value)
    logger.info('auth', '验证码已发送', { email: email.value })
    step.value = 2
    startCountdown()
  } catch (e) {
    logger.error('auth', '验证码发送失败', { email: email.value, error: e.message })
    errMsg.value = e.message
  } finally {
    loading.value = false
  }
}

async function verifyInvite() {
  inviteError.value = ''
  if (!inviteCode.value) {
    inviteError.value = '请输入邀请码'
    return
  }
  if (!agreedBeta.value) {
    inviteError.value = '请先同意内测协议'
    return
  }

  loading.value = true
  try {
    await auth.verifyInvite(inviteCode.value)
    inviteVerified.value = true
    needInvite.value = false
    logger.info('auth', '邀请码验证通过', { code: inviteCode.value })
    // 自动触发真正的发送验证码
    await sendCode(true)
  } catch (e) {
    logger.error('auth', '邀请码验证失败', { code: inviteCode.value, error: e.message })
    inviteError.value = e.message
  } finally {
    loading.value = false
  }
}

async function verifyCode() {
  errMsg.value = ''
  const fullCode = code.value.join('')
  if (fullCode.length !== 6) {
    errMsg.value = '请输入完整的 6 位验证码'
    return
  }

  loading.value = true
  try {
    const result = await auth.loginCode(email.value, fullCode)

    if (result.needRegister) {
      generateAvatarPool()
      step.value = 3
    } else {
      logger.info('auth', '验证码登录成功', { email: email.value })
      setAuth(result.token, result.user)
      router.push('/')
    }
  } catch (e) {
    logger.error('auth', '登录失败', { email: email.value, error: e.message })
    errMsg.value = e.message
  } finally {
    loading.value = false
  }
}

async function passwordLogin() {
  errMsg.value = ''
  if (!email.value || !password.value) {
    errMsg.value = '邮箱和密码不能为空'
    return
  }

  loading.value = true
  try {
    const result = await auth.loginPassword(email.value, password.value)
    logger.info('auth', '密码登录成功', { email: email.value })
    setAuth(result.token, result.user)
    router.push('/')
  } catch (e) {
    logger.error('auth', '登录失败', { email: email.value, error: e.message })
    errMsg.value = e.message
  } finally {
    loading.value = false
  }
}

async function register() {
  errMsg.value = ''
  if (!nickname.value || !password.value || password.value.length < 6) {
    errMsg.value = '昵称不能为空，密码至少 6 位'
    return
  }
  if (!avatarSeed.value) {
    errMsg.value = '请先选择一个头像'
    return
  }

  loading.value = true
  try {
    const fullCode = code.value.join('')
    const result = await auth.register(
      email.value, fullCode, nickname.value, password.value,
      avatarSeed.value, bio.value || '',
      inviteVerified.value ? inviteCode.value : undefined
    )
    logger.info('auth', '注册成功', { uid: result.user.uid, email: email.value })
    registerResult.value = result
    step.value = 5
  } catch (e) {
    logger.error('auth', '注册失败', { email: email.value, error: e.message })
    errMsg.value = e.message
  } finally {
    loading.value = false
  }
}

function goHome() {
  if (registerResult.value) {
    setAuth(registerResult.value.token, registerResult.value.user)
  }
  router.push('/')
}

function resetForm() {
  email.value = ''
  code.value = ['', '', '', '', '', '']
  nickname.value = ''
  password.value = ''
  bio.value = ''
  turnstileToken.value = ''
  errMsg.value = ''
  step.value = 1
  mode.value = 'code'
  avatarSeed.value = ''
  selectedAvatarIndex.value = -1
  registerResult.value = null
}

function switchMode(m) {
  mode.value = m
  step.value = 1
  errMsg.value = ''
  const query = { ...route.query }
  if (m === 'password') query.mode = 'password'
  else delete query.mode
  router.replace({ query })
}

function openAgreement(type) {
  agreementType.value = type
  showAgreement.value = true
}

const agreementContent = computed(() => {
  if (agreementType.value === 'privacy') return PRIVACY_POLICY_HTML
  if (agreementType.value === 'beta') return BETA_AGREEMENT_HTML
  return USER_AGREEMENT_HTML
})
</script>

<template>
  <div class="min-h-screen bg-bg flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
      <!-- Logo（Step 5 成功页隐藏，品牌名在绿色区域内展示） -->
      <div v-if="step !== 5" class="text-center pt-8 pb-2 px-8">
        <span class="font-brand text-2xl font-bold text-gray-800">Datelife</span>
        <p class="text-xs text-gray-400 mt-1">食品日期管理</p>
      </div>

      <!-- 步骤指示器（仅验证码模式显示） -->
      <div v-if="mode === 'code' && step <= 4" class="flex items-center justify-center gap-1 px-8 pb-4">
        <template v-for="s in 5" :key="s">
          <div v-if="s > 1"
            class="w-7 h-0.5 rounded-full transition-colors duration-300"
            :class="s <= step ? 'bg-primary-500' : 'bg-gray-200'"></div>
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-300"
            :class="[
              s < step ? 'bg-primary-500 text-white' :
              s === step ? 'bg-white border-2 border-primary-500 text-primary-600 ring-2 ring-primary-200' :
              'bg-white border-2 border-gray-200 text-gray-300'
            ]">
            {{ s }}
          </div>
        </template>
      </div>

      <div class="px-8 pb-8">
        <!-- Step 1: 输入邮箱 -->
        <div v-if="step === 1">
          <!-- 模式切换 Tab -->
          <div class="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button @click="switchMode('code')"
              class="flex-1 py-2 text-sm font-medium rounded-lg transition"
              :class="mode === 'code' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
              验证码登录
            </button>
            <button @click="switchMode('password')"
              class="flex-1 py-2 text-sm font-medium rounded-lg transition"
              :class="mode === 'password' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
              密码登录
            </button>
          </div>

          <template v-if="mode === 'code'">
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-500 mb-1.5">邮箱地址</label>
                <input v-model="email" type="email" placeholder="your@email.com"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  @keyup.enter="sendCode" />
              </div>

              <p class="text-xs text-gray-400 mt-3 leading-relaxed">
                我们将向此邮箱发送验证码。<br>
                若该邮箱尚未注册，验证通过后将<span class="text-primary-600 font-medium">自动为您创建账号</span>。
              </p>

              <TurnstileWidget v-if="!isDev" :siteKey="'0x4AAAAAADSIuSAx9Uo_yjIY'" @verify="turnstileToken = $event" />

              <label class="flex items-start gap-2.5 mt-4 cursor-pointer group select-none">
                <input type="checkbox" v-model="agreed"
                  class="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-400 cursor-pointer transition">
                <span class="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition">
                  我已阅读并同意
                  <a @click.prevent="openAgreement('agreement')" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">《用户协议》</a>
                  和
                  <a @click.prevent="openAgreement('privacy')" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">《隐私政策》</a>
                </span>
              </label>

              <button @click="sendCode()" :disabled="loading || !turnstileToken || !agreed"
                class="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition">
                {{ loading ? '发送中...' : '发送验证码' }}
              </button>
            </div>

            <div v-if="needInvite" class="mt-4 p-4 bg-amber-50/30 rounded-2xl border border-amber-200/50 space-y-3">
              <div class="flex items-center gap-1.5 mb-2">
                <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span class="text-xs font-semibold text-amber-700">内测专属</span>
              </div>

              <p class="text-xs text-amber-600/80 leading-relaxed">Datelife 目前处于开发阶段，尚未开启公测。使用邀请码即表示您同意我们的《内测协议》。</p>

              <div>
                <input v-model="inviteCode" type="text" placeholder="请输入邀请码"
                  class="w-full border border-amber-300/50 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent bg-white/80"
                  :disabled="inviteVerified" />
              </div>

              <div v-if="inviteError" class="text-xs text-red-500 mt-1">{{ inviteError }}</div>

              <label class="flex items-start gap-2 mt-2.5 cursor-pointer group select-none">
                <input type="checkbox" v-model="agreedBeta"
                  class="mt-0.5 w-4 h-4 rounded border-amber-300/50 text-amber-500 focus:ring-amber-400/40 cursor-pointer transition" />
                <span class="text-xs text-amber-700/80 leading-relaxed group-hover:text-amber-800 transition">
                  我已阅读并同意
                  <a @click.prevent="openAgreement('beta')" class="text-amber-600 hover:text-amber-700 underline underline-offset-2 font-medium">《内测协议》</a>
                </span>
              </label>

              <button @click="verifyInvite" :disabled="loading || !inviteCode || !agreedBeta"
                class="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition shadow-sm mt-1">
                {{ loading ? '验证中...' : (inviteVerified ? '✓ 已验证 — 继续发送' : '验证邀请码并继续 →') }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-500 mb-1.5">邮箱地址</label>
                <input v-model="email" type="email" placeholder="your@email.com"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm text-gray-500 mb-1.5">密码</label>
                <input v-model="password" type="password" placeholder="输入密码"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                  @keyup.enter="passwordLogin" />
              </div>

              <button @click="passwordLogin" :disabled="loading"
                class="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-medium transition">
                {{ loading ? '登录中...' : '登录' }}
              </button>
            </div>
          </template>
        </div>

        <!-- Step 2: 输入验证码 -->
        <div v-if="step === 2">
          <p class="text-sm text-gray-500 text-center mb-1">验证码已发送至</p>
          <p class="text-sm font-medium text-gray-700 text-center mb-6">{{ email }}</p>

          <div class="flex gap-2 justify-center mb-6">
            <input v-for="(c, i) in code" :key="i" :ref="el => codeInputs[i] = el"
              v-model="code[i]" maxlength="1"
              type="text" inputmode="numeric"
              class="w-11 h-12 border border-gray-200 rounded-xl text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition"
              @input="handleCodeInput(i, $event)"
              @paste="handleCodePaste($event)"
              @keyup.enter="verifyCode" />
          </div>

          <button @click="verifyCode" :disabled="loading"
            class="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-medium transition mb-3">
            {{ loading ? '验证中...' : '验证' }}
          </button>

          <div class="text-center space-y-2">
            <button v-if="countdown > 0" disabled class="text-sm text-gray-300 cursor-default">
              {{ countdown }}秒后可重发
            </button>
            <button v-else @click="sendCode" :disabled="!turnstileToken"
              class="text-sm text-primary-500 hover:text-primary-600 transition">
              重新发送验证码
            </button>
            <br>
            <button @click="step = 1; errMsg = ''" class="text-sm text-gray-400 hover:text-gray-600 transition">
              ← 返回修改邮箱
            </button>
          </div>
        </div>

        <!-- Step 3: 选择头像 -->
        <div v-if="step === 3">
          <div class="text-center mb-5">
            <p class="font-semibold text-gray-800">选择你的头像</p>
            <p class="text-xs text-gray-400 mt-1">点击选中一个喜欢的风格</p>
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
            class="mx-auto flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium transition mb-5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            换一批
          </button>

          <button @click="step = 4" :disabled="selectedAvatarIndex === -1"
            class="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:text-gray-500 text-white py-2.5 rounded-xl text-sm font-medium transition shadow-md">
            继续下一步 →
          </button>

          <div class="text-center mt-3">
            <button @click="step = 2; errMsg = ''" class="text-sm text-gray-400 hover:text-gray-600 transition">
              ← 返回上一步
            </button>
          </div>
        </div>

        <!-- Step 4: 昵称 + 签名 + 密码 -->
        <div v-if="step === 4">
          <!-- 预览卡 -->
          <div class="bg-gradient-to-r from-primary-50 to-emerald-50 rounded-2xl p-4 mb-5 flex items-center gap-3 border border-primary-100/50">
            <img :src="`https://api.dicebear.com/7.x/lorelei/svg?seed=${avatarSeed}`"
              alt="头像预览" class="w-12 h-12 rounded-full bg-white shadow-sm ring-2 ring-white" />
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-800 text-sm truncate">{{ nickname || '你的昵称' }}</p>
              <p v-if="bio" class="text-xs text-gray-500 truncate mt-0.5">{{ bio }}</p>
              <p v-else class="text-xs text-gray-400 italic mt-0.5">添加一句个性签名...</p>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-500 mb-1.5">昵称</label>
              <input v-model="nickname" placeholder="取个好听的名字"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm text-gray-500 mb-1.5">个性签名 <span class="text-gray-300">(可选)</span></label>
              <input v-model="bio" placeholder="写点什么介绍自己..." maxlength="50"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm text-gray-500 mb-1.5">密码</label>
              <input v-model="password" type="password" placeholder="至少 6 位"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                @keyup.enter="register" />
            </div>

            <button @click="register" :disabled="loading || !nickname || !password || password.length < 6"
              class="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition shadow-md">
              {{ loading ? '注册中...' : '注册并开始使用' }}
            </button>
          </div>

          <div class="text-center mt-4">
            <button @click="step = 3; errMsg = ''" class="text-sm text-gray-400 hover:text-gray-600 transition">
              ← 返回上一步
            </button>
          </div>
        </div>

        <!-- Step 5: 注册成功页 -->
        <div v-if="step === 5" class="text-center relative">
          <!-- 撒花动画容器 -->
          <div class="confetti-container absolute inset-0 pointer-events-none overflow-hidden rounded-3xl" aria-hidden="true">
            <span class="confetti c1"></span><span class="confetti c2"></span><span class="confetti c3"></span>
            <span class="confetti c4"></span><span class="confetti c5"></span><span class="confetti c6"></span>
            <span class="confetti c7"></span><span class="confetti c8"></span><span class="confetti c9"></span>
            <span class="confetti c10"></span><span class="confetti c11"></span><span class="confetti c12"></span>
          </div>

          <div class="pt-6 pb-2">
            <h2 class="text-xl font-bold text-gray-800 font-brand">欢迎加入 🍱 Datelife</h2>
            <p class="text-sm text-gray-400 mt-1">让每一份食材都不被浪费</p>
          </div>

          <!-- 用户信息卡 -->
          <div class="bg-gradient-to-r from-primary-50 via-emerald-50 to-primary-50 rounded-2xl p-4 mt-4 mb-5 inline-flex items-center gap-3 mx-auto border border-primary-100/50 shadow-sm">
            <img
              :src="`https://api.dicebear.com/7.x/lorelei/svg?seed=${registerResult?.user?.avatar_seed}`"
              alt="头像"
              class="w-14 h-14 rounded-full bg-white shadow-sm ring-2 ring-white" />
            <div class="text-left">
              <p class="font-semibold text-gray-800 text-sm">{{ registerResult?.user?.nickname }}</p>
              <p v-if="registerResult?.user?.bio" class="text-xs text-gray-500 mt-0.5 max-w-[180px] truncate">{{ registerResult.user.bio }}</p>
            </div>
          </div>

          <!-- 分割线 -->
          <div class="flex items-center gap-3 mb-5 px-2">
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="text-xs text-gray-400 font-medium">你的身份标识</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>

          <!-- UID 大字展示 -->
          <div class="mb-1">
            <p class="text-xs text-gray-400 uppercase tracking-widest font-medium mb-2">UID</p>
            <p class="text-4xl font-black font-mono tracking-wider bg-gradient-to-r from-primary-500 via-emerald-500 to-primary-600 bg-clip-text text-transparent"
              style="filter: drop-shadow(0 2px 8px rgba(34,197,94,0.25))">
              # {{ registerResult?.user?.uid }}
            </p>
          </div>

          <p class="text-xs text-gray-400 mb-7">
            你是 Datelife 的第 <span class="font-semibold text-primary-500">{{ Number(registerResult?.user?.uid) - 99999 }}</span> 位用户
          </p>

          <button @click="goHome"
            class="w-full bg-gradient-to-r from-primary-500 to-emerald-500 hover:from-primary-600 hover:to-emerald-600 text-white py-3 rounded-xl text-sm font-semibold transition shadow-lg hover:shadow-xl active:scale-[0.98]">
            开始使用 →
          </button>
        </div>

        <!-- 错误提示（Step 1-4 显示） -->
        <div v-if="errMsg && step < 5" class="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
          {{ errMsg }}
        </div>
      </div>
    </div>

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

<style scoped>
.confetti {
  position: absolute;
  width: 8px;
  height: 16px;
  top: -20px;
  opacity: 0;
  animation: confetti-fall 3s ease-in-out infinite;
}
.c1 { left: 10%; background: #22c55e; animation-delay: 0s; }
.c2 { left: 20%; background: #f59e0b; animation-delay: 0.2s; }
.c3 { left: 30%; background: #ef4444; animation-delay: 0.4s; }
.c4 { left: 40%; background: #3b82f6; animation-delay: 0.1s; }
.c5 { left: 50%; background: #a855f7; animation-delay: 0.5s; }
.c6 { left: 60%; background: #ec4899; animation-delay: 0.3s; }
.c7 { left: 70%; background: #14b8a6; animation-delay: 0.6s; }
.c8 { left: 80%; background: #f97316; animation-delay: 0.15s; }
.c9 { left: 90%; background: #6366f1; animation-delay: 0.45s; }
.c10 { left: 15%; background: #84cc16; animation-delay: 0.35s; width: 6px; height: 12px; }
.c11 { left: 75%; background: #06b6d4; animation-delay: 0.55s; width: 10px; height: 18px; }
.c12 { left: 45%; background: #eab308; animation-delay: 0.25s; width: 5px; height: 10px; }

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(500px) rotate(720deg);
    opacity: 0;
  }
}
</style>
