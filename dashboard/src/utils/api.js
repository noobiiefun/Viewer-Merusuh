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
  getAhkActions:  ()      => request('GET', '/api/ahk/actions'),
  getVjoyActions: ()      => request('GET', '/api/vjoy/actions'),
  getActions:      ()      => request('GET', '/api/actions'),   // semua adapter

  // AHK Game Groups
  getGroups:       ()      => request('GET',    '/api/ahk/groups'),
  createGroup:     (body)  => request('POST',   '/api/ahk/groups', body),
  updateGroup:     (id, b) => request('PUT',    `/api/ahk/groups/${id}`, b),
  deleteGroup:     (id)    => request('DELETE', `/api/ahk/groups/${id}`),

  // AHK Presets
  getPresets:      ()      => request('GET',    '/api/ahk/presets'),
  createPreset:    (body)  => request('POST',   '/api/ahk/presets', body),
  updatePreset:    (id, b) => request('PUT',    `/api/ahk/presets/${id}`, b),
  deletePreset:    (id)    => request('DELETE', `/api/ahk/presets/${id}`),
  activatePreset:  (id)    => request('POST',   `/api/ahk/presets/${id}/activate`),

  // AHK Custom Keys
  getCustomKeys:   ()      => request('GET',    '/api/ahk/custom-keys'),
  createCustomKey: (body)  => request('POST',   '/api/ahk/custom-keys', body),
  updateCustomKey: (id, b) => request('PUT',    `/api/ahk/custom-keys/${id}`, b),
  deleteCustomKey: (id)    => request('DELETE', `/api/ahk/custom-keys/${id}`),
  testKey:         (body)  => request('POST',   '/api/ahk/test-key', body),
  getStatus:     ()      => request('GET', '/api/status'),
  getQueue:      ()      => request('GET', '/api/queue'),
  testDonation:  (body)  => request('POST', '/api/test/donation', body),

  // Testing area
  testingDonate:    (body) => request('POST',   '/api/testing/donate', body),
  testingTrigger:   (body) => request('POST',   '/api/testing/trigger', body),
  testingPreview:   (amt)  => request('GET',    `/api/testing/preview?amount=${amt}`),
  testingLogs:      ()     => request('GET',    '/api/testing/logs'),
  testingClearLogs: ()     => request('DELETE', '/api/testing/logs'),
  testingPlatforms: ()     => request('GET',    '/api/testing/platforms'),

  // Env editor
  getEnv:             ()      => request('GET', '/api/env'),
  saveEnv:            (body)  => request('PUT', '/api/env', body),
  getEnvStatus:       ()      => request('GET', '/api/env/status'),
  generateSecret:     ()      => request('POST', '/api/env/generate-secret'),
}
