const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
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
