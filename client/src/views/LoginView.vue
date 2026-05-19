<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../utils/api'
import { useAuth } from '../composables/useAuth'
import TurnstileWidget from '../components/TurnstileWidget.vue'
import { USER_AGREEMENT_HTML, PRIVACY_POLICY_HTML } from '../utils/agreement'

const router = useRouter()
const { setAuth } = useAuth()

const mode = ref('code') // 'code' | 'password'
const step = ref(1)       // 1: email, 2: code, 3: register
const email = ref('')
const code = ref(['', '', '', '', '', ''])
const nickname = ref('')
const password = ref('')
const turnstileToken = ref('')
const loading = ref(false)
const errMsg = ref('')
const agreed = ref(false)
const showAgreement = ref(false)
const agreementType = ref('agreement')
const countdown = ref(0)
let timer = null

// 验证码输入框 refs
const codeInputs = ref([])

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

async function sendCode() {
  errMsg.value = ''
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errMsg.value = '请输入有效的邮箱地址'
    return
  }
  if (!turnstileToken.value) {
    errMsg.value = '请完成人机验证'
    return
  }

  loading.value = true
  try {
    await auth.sendCode(email.value, turnstileToken.value)
    step.value = 2
    startCountdown()
  } catch (e) {
    errMsg.value = e.message
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
      step.value = 3
    } else {
      setAuth(result.token, result.user)
      router.push('/')
    }
  } catch (e) {
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
    setAuth(result.token, result.user)
    router.push('/')
  } catch (e) {
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

  loading.value = true
  try {
    const fullCode = code.value.join('')
    const result = await auth.register(email.value, fullCode, nickname.value, password.value)
    setAuth(result.token, result.user)
    router.push('/')
  } catch (e) {
    errMsg.value = e.message
  } finally {
    loading.value = false
  }
}

function resetForm() {
  email.value = ''
  code.value = ['', '', '', '', '', '']
  nickname.value = ''
  password.value = ''
  turnstileToken.value = ''
  errMsg.value = ''
  step.value = 1
  mode.value = 'code'
}

function switchMode(m) {
  mode.value = m
  step.value = 1
  errMsg.value = ''
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
  <div class="min-h-screen bg-bg flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
      <!-- Logo -->
      <div class="text-center mb-8">
        <span class="font-brand text-2xl font-bold text-gray-800">Datelife</span>
        <p class="text-xs text-gray-400 mt-1">食品日期管理</p>
      </div>

      <!-- Step 1: 输入邮箱 -->
      <div v-if="step === 1">
        <!-- 验证码模式 -->
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

            <TurnstileWidget :siteKey="'0x4AAAAAADSIuSAx9Uo_yjIY'" @verify="turnstileToken = $event" />

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

            <button @click="sendCode" :disabled="loading || !turnstileToken || !agreed"
              class="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition">
              {{ loading ? '发送中...' : '发送验证码' }}
            </button>
          </div>

          <div class="text-center mt-4">
            <button @click="switchMode('password')" class="text-sm text-gray-400 hover:text-primary-500 transition">
              用密码登录 →
            </button>
          </div>
        </template>

        <!-- 密码模式 -->
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

          <div class="text-center mt-4">
            <button @click="switchMode('code')" class="text-sm text-gray-400 hover:text-primary-500 transition">
              ← 返回验证码登录
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

      <!-- Step 3: 新用户注册 -->
      <div v-if="step === 3">
        <div class="text-center mb-6">
          <div class="text-2xl mb-2">🎉</div>
          <p class="font-medium text-gray-800">欢迎加入 Datelife！</p>
          <p class="text-xs text-gray-400 mt-1">设置你的账号信息</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-500 mb-1.5">昵称</label>
            <input v-model="nickname" placeholder="取个好听的名字"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-1.5">密码</label>
            <input v-model="password" type="password" placeholder="至少 6 位"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
              @keyup.enter="register" />
          </div>

          <button @click="register" :disabled="loading"
            class="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-medium transition">
            {{ loading ? '注册中...' : '注册并开始使用' }}
          </button>
        </div>

        <div class="text-center mt-4">
          <button @click="resetForm()" class="text-sm text-gray-400 hover:text-gray-600 transition">
            ← 重新开始
          </button>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="errMsg" class="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
        {{ errMsg }}
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
