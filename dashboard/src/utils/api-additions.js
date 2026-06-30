// dashboard/src/utils/api-additions.js
// ════════════════════════════════════════════════════════════════
// TAMBAHKAN 5 FUNGSI INI KE OBJECT `api` YANG SUDAH ADA
// di file: dashboard/src/utils/api.js
//
// Cara pasang: buka api.js, cari baris `export const api = {`
// lalu tempel 5 method di bawah ini ke dalam object tersebut
// (sebelum tanda kurung tutup `}`), pakai instance axios/fetch
// yang sama dengan method lain di file itu.
// ════════════════════════════════════════════════════════════════

/*
  getNgrokStatus() {
    return request('GET', '/api/ngrok/status')
  },

  startNgrok(body = {}) {
    return request('POST', '/api/ngrok/start', body)
  },

  stopNgrok() {
    return request('POST', '/api/ngrok/stop')
  },

  setNgrokAutostart(enabled) {
    return request('POST', '/api/ngrok/autostart', { enabled })
  },

  pingNgrokTarget() {
    return request('GET', '/api/ngrok/ping-target')
  },
*/

// ── Jika api.js kamu pakai pola berbeda (axios instance, dll), ──────
// ── ini versi standalone yang bisa langsung dipakai tanpa edit: ─────

const BASE = '' // sesuaikan base URL kalau api.js kamu pakai prefix

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Request gagal')
  return data
}

export const ngrokApi = {
  getNgrokStatus:    ()       => request('GET',  '/api/ngrok/status'),
  startNgrok:        (body)   => request('POST', '/api/ngrok/start', body),
  stopNgrok:         ()       => request('POST', '/api/ngrok/stop'),
  setNgrokAutostart: (enabled) => request('POST', '/api/ngrok/autostart', { enabled }),
  pingNgrokTarget:   ()       => request('GET',  '/api/ngrok/ping-target'),
}
