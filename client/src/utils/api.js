import { logger } from './logger'

const BASE = '/api'

async function request(url, options = {}) {
  const method = options.method || 'GET'
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const savedToken = localStorage.getItem('token')
  if (savedToken) headers['Authorization'] = `Bearer ${savedToken}`

  const res = await fetch(BASE + url, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.__auth_expired = true
    logger.warn('api', `401 Unauthorized: ${method} ${url}`)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    logger.error('api', `失败: ${method} ${url} (${res.status})`, err.error)
    throw new Error(err.error)
  }

  logger.info('api', `${method} ${url} → ${res.status}`)
  return res.json()
}

export const foods = {
  getAll: () => request('/foods'),
  getById: (id) => request(`/foods/${id}`),
  create: (data) => request('/foods', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/foods/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/foods/${id}`, { method: 'DELETE' }),
  getTags: () => request('/foods/tags'),
  deleteTag: (name) => request(`/foods/tags/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

export const barcode = {
  lookup: (code) => request(`/barcode/${code}`)
}

export const auth = {
  sendCode: (email, turnstileToken) => request('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'cf-turnstile-response': turnstileToken }
  }),
  loginCode: (email, code) => request('/auth/login-code', {
    method: 'POST',
    body: JSON.stringify({ email, code })
  }),
  loginPassword: (email, password) => request('/auth/login-password', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: (email, code, nickname, password, avatarSeed, bio) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, code, nickname, password, avatar_seed: avatarSeed, bio })
  }),
  getProfile: () => request('/auth/profile'),
  updateProfile: (data) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  devLogin: (uid) => request('/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ uid })
  })
}
