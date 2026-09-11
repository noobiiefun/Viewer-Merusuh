# Viewer Merusuh v1.0.1 — Release Notes

> **Penonton Bayar, Game Kacau.**
> Patch release — Ngrok built-in + fix critical bug better-sqlite3 binding.

---

## 📦 Download

| File | Untuk Siapa | Ukuran |
|------|-------------|--------|
| **`viewer-merusuh-setup-1.0.1.exe`** | User biasa (recommended) — installer dengan wizard | ~75 MB |
| **`viewer-merusuh-1.0.1-portable.exe`** | User yang mau tanpa install — langsung jalankan | ~75 MB |

### Cara Install

1. Download `viewer-merusuh-setup-1.0.1.exe`
2. Jalankan, klik Next → Next → Install → Finish
3. Aplikasi otomatis terbuka, Setup Wizard akan memandu konfigurasi awal
4. Lihat panduan lengkap di [`README_INSTALL.txt`](README_INSTALL.txt) yang disertakan

> ⚠️ Windows mungkin menampilkan peringatan SmartScreen karena aplikasi belum disertifikasi (code signing certificate berbayar). Klik **"More info" → "Run anyway"** untuk lanjut. Source code 100% terbuka di repo ini, bisa diaudit siapa saja.

---

## 🆕 Apa yang Baru di v1.0.1

### 🌐 Ngrok Built-in
Tidak perlu lagi install ngrok manual atau setting port forwarding router. Buka **Konfigurasi → Ngrok Tunnel**, paste authtoken (gratis dari ngrok.com), klik Hubungkan — server kamu langsung punya URL publik untuk dipasang di webhook Saweria/Trakteer. Bisa diset auto-connect setiap kali app dibuka.

### 🐛 Fix Critical: `better-sqlite3` Binding Error
v1.0.0 punya bug di mana setelah proses build `.exe`, menjalankan ulang server dari source (`npm start`) bisa gagal dengan error "Could not locate the bindings file". Ini sudah diperbaiki — versi `better-sqlite3` dikunci exact dan ada pesan error jelas kalau masalah serupa terjadi lagi.

> ⚠️ Jika upgrade dari v1.0.0 dan masih mengalami error binding, jalankan:
> ```
> rd /s /q node_modules\better-sqlite3
> npm install better-sqlite3@12.11.1
> ```

---

## ✨ Fitur Utama di v1.0.0

### Core Platform
- **Webhook donasi** — Saweria & Trakteer terintegrasi langsung
- **Effect Engine** — mapping nominal donasi ke aksi game, dengan queue sequential/parallel dan cooldown
- **Dashboard React** — kelola semua dari satu tempat: efek, log, testing, overlay, config
- **OBS Overlay** — notifikasi donasi + price list otomatis yang bisa di-rotate dan dikustomisasi penuh (warna, posisi, durasi)
- **Setup Wizard** — onboarding 7 langkah untuk user baru, tidak perlu baca dokumentasi teknis

### Game Adapters
- **AutoHotkey (AHK)** — kontrol keyboard/mouse, dengan 15+ script siap pakai (racing, action, FPS, survival) + sistem **Custom Key** untuk tombol apapun tanpa coding
- **AHK Controller** — Game Groups, Presets (simpan setting per game), dan Custom Keys dengan key picker visual
- **vJoy/ViGEm** — virtual gamepad untuk racing game, 10 aksi siap pakai (brake, throttle, steer chaos, dll)
- **Plugin Native** — GTA 5 (ScriptHookV .NET, 23 efek) dan BeamNG.drive (Lua, 10 efek) untuk kontrol langsung di dalam game

### Developer Experience
- **Testing Area** — simulasi donasi, trigger efek langsung, preview efek sebelum donasi sungguhan
- **Secrets & Config** — UI editor `.env` tanpa perlu buka file manual, dengan masking otomatis
- **Electron Desktop App** — system tray, auto-restart server, single instance lock

### Build & Distribution
- Installer Windows (.exe) dengan NSIS — wizard install, shortcut otomatis, uninstaller
- Portable .exe — tanpa install, langsung jalan
- `better-sqlite3` v12 — prebuilt binary, tidak perlu Visual Studio untuk build

---

## 🧩 Ekosistem Viewer Merusuh

v1.0.0 ini adalah **core platform** plus satu modul ekstensi yang sudah selesai:

| Modul | Status | Fungsi |
|-------|--------|--------|
| **Client Module** | ✅ Selesai (Phase 1-5) | Jalankan adapter game (AHK/vJoy/plugin) di PC Gaming terpisah dari PC Stream/OBS — cocok untuk setup 2 PC |
| **RC Module** | 🔄 Phase 1-2 (fondasi & simulator) | Viewer sewa & kontrol RC/drone fisik secara real-time via donasi |
| **Avatar Overlay** | 🔄 Dalam pengembangan | Avatar pixel 2D muncul di overlay saat viewer chat YouTube Live — eksklusif untuk yang sudah donasi/sewa RC |

Dokumentasi teknis lengkap masing-masing modul tersedia di repo (`DEVELOPER_GUIDE.md` bagian 11-12, `client/README.md`, `AVATAR_OVERLAY.md`, `rc-module/README.md`).

---

## 🐛 Known Issues

- Avatar module (`avatar/`) belum lengkap — jika muncul warning `Cannot find module 'youtube-chat'` di console, ini aman diabaikan untuk v1.0.0. Tidak mempengaruhi fungsi utama.
- Build .exe membutuhkan Node.js v20+ di mesin developer (bukan untuk end-user, hanya untuk yang mau build sendiri dari source)
- `vigemclient` (untuk vJoy) bersifat optional dependency — jika gagal install, vJoy adapter otomatis jalan di mode simulasi tanpa mengganggu fitur lain

---

## 🔧 Untuk Developer — Build dari Source

```bash
git clone https://github.com/noobiiefun/Viewer-Merusuh.git
cd Viewer-Merusuh
npm install
node server/db/setup.js
node build-electron.js
```

Output di `dist-electron/`. Detail lengkap di [`docs/BUILD_ELECTRON.md`](docs/BUILD_ELECTRON.md).

---

## 🙏 Terima Kasih

Dibangun untuk komunitas streamer Indonesia. Open source, MIT License — bebas digunakan, dimodifikasi, dan dikembangkan lebih lanjut.

**Laporkan bug atau request fitur:** [GitHub Issues](https://github.com/noobiiefun/Viewer-Merusuh/issues)

---

*Full Changelog: initial release*
