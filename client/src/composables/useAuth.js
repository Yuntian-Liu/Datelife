import { ref, computed } from 'vue'
import { logger } from '../utils/logger'

const token = ref(localStorage.getItem('token') || '')
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)

  function setAuth(tokenVal, userVal) {
    token.value = tokenVal
    user.value = userVal
    localStorage.setItem('token', tokenVal)
    localStorage.setItem('user', JSON.stringify(userVal))
    logger.info('auth', '登录成功', { uid: userVal?.uid, email: userVal?.email })
  }

  function logout() {
    logger.info('auth', '退出登录')
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAuthenticated, setAuth, logout }
}
