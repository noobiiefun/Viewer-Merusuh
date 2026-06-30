/**
 * Tambahkan fungsi-fungsi berikut ke dashboard/src/utils/api.js
 * (sesuaikan dengan helper fetch/base URL yang sudah ada di file itu,
 * di sini saya asumsikan ada helper `apiFetch(path, options)` yang sudah handle base URL + JSON parsing.
 * Kalau belum ada, ganti `apiFetch` dengan `fetch('/api' + path, ...)` biasa.)
 */

export async function getNgrokStatus() {
  const res = await apiFetch('/ngrok/status');
  return res.json();
}

export async function saveNgrokToken(authtoken, autostart) {
  const res = await apiFetch('/ngrok/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authtoken, autostart }),
  });
  return res.json();
}

export async function startNgrokTunnel() {
  const res = await apiFetch('/ngrok/start', { method: 'POST' });
  return res.json();
}

export async function stopNgrokTunnel() {
  const res = await apiFetch('/ngrok/stop', { method: 'POST' });
  return res.json();
}

export async function testNgrokTunnel() {
  const res = await apiFetch('/ngrok/test', { method: 'POST' });
  return res.json();
}
