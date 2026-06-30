# Patch Manual yang Harus Dilakukan

File-file siap pakai sudah ada di folder ini, tinggal copy. Tapi ada beberapa
file YANG SUDAH ADA di project kamu yang perlu di-patch manual (saya tidak
punya isi lengkapnya untuk auto-edit).

---

## 1. `package.json` (root)

Tambahkan dependency:
```json
"@ngrok/ngrok": "^1.4.1"
```

Lalu jalankan:
```bash
npm install @ngrok/ngrok
```

---

## 2. `electron-builder.config.js`

Cari array `asarUnpack`, tambahkan baris ini ke dalamnya:
```js
asarUnpack: [
  // ... yang sudah ada (better-sqlite3, dll)
  "**/@ngrok/ngrok/**/*",
],
```

---

## 3. `server/index.js`

**A. Tambahkan route** (dekat route lain seperti `/api/effects`, dll):
```js
app.use('/api/ngrok', require('./routes/ngrok'));
```

**B. Tambahkan autostart** — cari bagian `server.listen(PORT, ...)`, ubah jadi:
```js
const ngrokManager = require('./core/ngrokManager');

server.listen(PORT, async () => {
  console.log(`Server jalan di port ${PORT}`);

  if (process.env.NGROK_AUTOSTART === 'true' && process.env.NGROK_AUTHTOKEN) {
    try {
      const { url } = await ngrokManager.start({
        authtoken: process.env.NGROK_AUTHTOKEN,
        port: PORT,
      });
      console.log(`[Ngrok] Tunnel aktif: ${url}`);
    } catch (err) {
      console.error('[Ngrok] Gagal autostart:', err.message);
    }
  }
});
```

> ⚠️ JANGAN bikin `server.listen` dipanggil dua kali — edit bagian yang sudah
> ada, jangan tambah blok baru.

---

## 4. `server/routes/env.js`

Tambahkan ke `ENV_SCHEMA` (array yang berisi daftar field secret):
```js
{
  key: 'NGROK_AUTHTOKEN',
  label: 'Ngrok Authtoken',
  secret: true,
  group: 'ngrok',
},
{
  key: 'NGROK_AUTOSTART',
  label: 'Auto-connect Ngrok saat start',
  type: 'boolean',
  group: 'ngrok',
},
```

---

## 5. `dashboard/src/utils/api.js`

Buka file, cari `export const api = {`, tempel 5 method ini DI DALAM object
(sebelum kurung tutup), ganti `request(...)` sesuai helper yang sudah dipakai
fungsi lain di file itu:

```js
getNgrokStatus:    ()        => request('GET',  '/api/ngrok/status'),
startNgrok:        (body)    => request('POST', '/api/ngrok/start', body || {}),
stopNgrok:         ()        => request('POST', '/api/ngrok/stop'),
setNgrokAutostart: (enabled) => request('POST', '/api/ngrok/autostart', { enabled }),
pingNgrokTarget:   ()        => request('GET',  '/api/ngrok/ping-target'),
```

Setelah ini, file `dashboard/src/utils/api-additions.js` yang saya buat
**bisa dihapus** — isinya sudah masuk ke `api.js` asli.

---

## 6. `dashboard/src/pages/ConfigPage.jsx`

Dari screenshot kamu, halaman ini punya section "Webhook URLs" lalu "General"
lalu "OBS Overlay". Tambahkan import di atas:
```jsx
import NgrokSection from '../components/NgrokSection';
```

Lalu render `<NgrokSection />` di antara section Webhook URLs dan General
(cari di JSX bagian setelah div "Webhook URLs" selesai, sebelum div "General"
mulai).

---

## 7. Sesuaikan className di `NgrokSection.jsx`

Saya pakai nama generik (`config-field`, `hint`, `btn-secondary`,
`text-error`, `text-success`) karena tidak punya akses CSS project kamu.
Cek `ConfigPage.jsx` dan ganti className di `NgrokSection.jsx` supaya
konsisten dengan section lain — kemungkinan besar sudah ada `.card`,
`.btn.btn-primary`, dll yang sudah dipakai (terlihat dari screenshot).

---

## Setelah Semua Patch Selesai

```bash
# Test dulu di dev mode
npm run dev

# Buka dashboard, masuk ke Konfigurasi, cek section Ngrok Tunnel muncul
# Test connect dengan authtoken asli

# Kalau sudah OK, build ulang exe
node build-electron.js
```
