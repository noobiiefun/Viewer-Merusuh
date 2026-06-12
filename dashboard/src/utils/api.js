// dashboard/src/utils/api.js
const BASE = import.meta.env.DEV ? 'http://localhost:3000' : ''

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
  // Effects
  getEffects:      ()       => request('GET',    '/api/effects'),
  getEffect:       (id)     => request('GET',    `/api/effects/${id}`),
  createEffect:    (body)   => request('POST',   '/api/effects', body),
  updateEffect:    (id, b)  => request('PUT',    `/api/effects/${id}`, b),
  deleteEffect:    (id)     => request('DELETE', `/api/effects/${id}`),
  toggleEffect:    (id)     => request('POST',   `/api/effects/${id}/toggle`),

  // Logs
  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/api/logs${q ? '?' + q : ''}`)
  },

  // Config
  getConfig:  ()    => request('GET', '/api/config'),
  saveConfig: (cfg) => request('PUT', '/api/config', cfg),

  // AHK actions list
  getAhkActions: () => request('GET', '/api/ahk/actions'),

  // Status
  getStatus: () => request('GET', '/api/status'),

  // Test
  testDonation: (body) => request('POST', '/api/test/donation', body),
}
