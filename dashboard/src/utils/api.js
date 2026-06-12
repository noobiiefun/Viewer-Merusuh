// dashboard/src/utils/api.js
// Saat dev: proxy ke server via vite (port otomatis dari .env)
// Saat production: pakai origin yang sama (server serve dashboard)
const BASE = import.meta.env.DEV ? '' : ''

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || 'Request gagal')
  return data
}

export const api = {
  getEffects:    ()       => request('GET',    '/api/effects'),
  getEffect:     (id)     => request('GET',    `/api/effects/${id}`),
  createEffect:  (body)   => request('POST',   '/api/effects', body),
  updateEffect:  (id, b)  => request('PUT',    `/api/effects/${id}`, b),
  deleteEffect:  (id)     => request('DELETE', `/api/effects/${id}`),
  toggleEffect:  (id)     => request('POST',   `/api/effects/${id}/toggle`),

  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/api/logs${q ? '?' + q : ''}`)
  },

  getConfig:     ()      => request('GET', '/api/config'),
  saveConfig:    (cfg)   => request('PUT', '/api/config', cfg),
  getAhkActions: ()      => request('GET', '/api/ahk/actions'),
  getStatus:     ()      => request('GET', '/api/status'),
  getQueue:      ()      => request('GET', '/api/queue'),
  testDonation:  (body)  => request('POST', '/api/test/donation', body),
}
