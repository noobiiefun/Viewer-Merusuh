# Integrasi Ngrok Built-in — Panduan Pasang

## 1. Install dependency
```bash
cd server   # atau root project, sesuaikan lokasi node_modules backend kamu
npm install @ngrok/ngrok
```
Package ini auto-download binary ngrok ke cache lokal saat pertama kali dipakai —
user gak perlu install ngrok manual. Untuk build Electron, tambahkan
`@ngrok/ngrok` ke `node_modules/**/*` yang sudah di-bundle ke asar (sudah otomatis
ter-include karena electron-builder config kamu sudah bundle semua `node_modules`).

> ⚠️ Cek juga `asarUnpack` di `electron-builder.config.js` — sama seperti
> `better-sqlite3`, binary native ngrok kemungkinan perlu di-unpack dari asar juga.
> Tambahkan pattern: `"**/@ngrok/ngrok/**/*"` ke `asarUnpack` kalau nanti muncul
> error "cannot find binary" pas di-package.

## 2. Copy file baru
- `server/core/ngrokManager.js` → copy ke `server/core/`
- `server/routes/ngrok.js` → copy ke `server/routes/`

## 3. Patch `server/index.js`
Tambahkan dekat route lain:
```javascript
app.use('/api/ngrok', require('./routes/ngrok'));
```

Tambahkan autostart setelah server listen (opsional tapi sesuai request kamu —
biar gak perlu setting ulang tiap buka app):
```javascript
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

## 4. Patch `server/routes/env.js`
Tambahkan ke `ENV_SCHEMA` (mengikuti pola field lain yang sudah ada):
```javascript
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
(Field ini dikelola juga lewat `/api/ngrok/token`, jadi munculnya di Env Editor
cuma buat visibility — gak wajib dipakai dari sana.)

## 5. Frontend
- Copy isi `NgrokSection.jsx` ke `dashboard/src/components/NgrokSection.jsx`
- Tambahkan 5 fungsi dari `api-additions.js` ke `dashboard/src/utils/api.js`
- Di `dashboard/src/pages/ConfigPage.jsx`, import dan render:
  ```jsx
  import NgrokSection from '../components/NgrokSection';
  // ...taruh <NgrokSection /> di antara section "Webhook URLs" dan "General"
  ```
- Sesuaikan className (`config-section`, `config-field`, `btn btn-primary`, dll)
  dengan class yang sudah dipakai section lain di ConfigPage kamu biar konsisten
  stylenya — saya pakai nama class generik karena saya gak punya akses ke CSS-nya.

## Alur pakainya nanti
1. Buka tab **Konfigurasi** → section baru **🌐 Ngrok Tunnel** muncul di bawah Webhook URLs
2. Paste authtoken dari https://dashboard.ngrok.com/get-started/your-authtoken
3. Klik **Simpan & Hubungkan** → token tersimpan ke `.env`, tunnel langsung jalan
4. URL publik (`https://xxx.ngrok-free.app`) muncul, tinggal copy buat dipasang
   di Saweria/Trakteer webhook atau `SERVER_URL` Client Module
5. Klik **Test Koneksi** → server hit `GET /api/ngrok/ping-target` LEWAT url publik
   itu sendiri (round-trip via internet), jadi beneran ngetes apakah reachable,
   bukan cuma cek status lokal
6. Centang "Otomatis konek ngrok saat aplikasi dibuka" → besok-besok buka app,
   ngrok auto-connect tanpa perlu klik apapun lagi

## Catatan keamanan
- Authtoken disimpan di `.env` (path sama dengan secret lain — `%AppData%\Viewer Merusuh\.env`
  saat production), bukan di database, jadi gak ke-include di backup DB.
- Input token di UI pakai `type="password"` dan otomatis dikosongkan setelah
  tersimpan supaya gak nongol di screen recording streaming.
