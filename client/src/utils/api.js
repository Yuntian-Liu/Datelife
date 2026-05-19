const BASE = '/api'

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const savedToken = localStorage.getItem('token')
  if (savedToken) headers['Authorization'] = `Bearer ${savedToken}`

  const res = await fetch(BASE + url, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.__auth_expired = true
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error)
  }
  return res.json()
}

export const foods = {
  getAll: () => request('/foods'),
  getById: (id) => request(`/foods/${id}`),
  create: (data) => request('/foods', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/foods/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/foods/${id}`, { method: 'DELETE' })
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
  register: (email, code, nickname, password) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, code, nickname, password })
  }),
  getProfile: () => request('/auth/profile'),
  updateProfile: (data) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}
