# Changelog

Semua perubahan signifikan pada proyek ini dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/), dan proyek ini mengikuti [Semantic Versioning](https://semver.org/).

---

## [1.0.1] — 2026-06-30

### Added
- **Ngrok built-in** — tunnel ke internet langsung dari dashboard tanpa install ngrok manual (`@ngrok/ngrok` auto-download binary)
  - Section baru "🌐 Ngrok Tunnel" di halaman Konfigurasi
  - Input authtoken, tombol Hubungkan/Putuskan, copy URL publik sekali klik
  - Test koneksi round-trip via URL publik (`GET /api/ngrok/ping-target`)
  - Toggle auto-connect saat aplikasi dibuka — tidak perlu connect ulang tiap buka app
  - Authtoken disimpan di `.env` (bukan database), input dikosongkan otomatis setelah tersimpan

### Fixed
- **`better-sqlite3` binding error setelah build .exe** — regresi dari proses `electron-rebuild` yang meninggalkan binary versi tidak cocok di `node_modules` root. Sekarang versi dikunci exact ke `12.11.1` di `package.json`, plus pesan error yang jelas di `database.js` kalau binding mismatch terjadi lagi
- Server crash diam-diam saat database gagal load — sekarang error ditangkap dan dicetak dengan instruksi fix yang jelas alih-alih spam error berulang

---

## [1.0.0] — 2026-06-30

### Added — Core Platform
- Webhook handler Saweria dan Trakteer dengan validasi signature
- Effect Engine dengan queue sequential/parallel dan cooldown per efek
- Dashboard React lengkap: Dashboard, Efek, Testing Area, Overlay Editor, Log Donasi, AHK Controller, vJoy Controller, Secrets & Config, Konfigurasi
- OBS Overlay dengan notifikasi donasi dan price list auto-rotate, posisi & warna fully customizable
- Setup Wizard 7 langkah untuk onboarding user baru
- Sistem testing area — simulasi donasi, direct trigger efek, preview tanpa eksekusi

### Added — Game Adapters
- AutoHotkey adapter dengan 15+ script preset (racing, action, FPS, survival)
- Sistem Custom Key — tambah tombol keyboard apapun via UI tanpa coding (mode tap/hold/combo)
- AHK Controller — Game Groups dan Presets untuk organisasi setting per game
- vJoy/ViGEm adapter — 10 aksi virtual gamepad untuk racing game
- Plugin native GTA 5 (ScriptHookV .NET, C#) — 23 efek termasuk wanted level, ledakan, cuaca, NPC
- Plugin native BeamNG.drive (Lua) — 10 efek termasuk brake, throttle, slow motion, random damage

### Added — Desktop App
- Electron wrapper dengan system tray, single instance lock
- Auto-restart server dari tray menu
- Data user tersimpan di `%AppData%\Viewer Merusuh\` (terpisah dari instalasi)
- Installer NSIS Windows (.exe) dengan wizard install dan uninstaller
- Build portable .exe tanpa instalasi

### Fixed
- `better-sqlite3` upgrade dari v9 ke v12.11.1 — resolve masalah compile native module di Node.js v24 tanpa perlu Visual Studio Build Tools
- Path resolution Electron — `ROOT` menggunakan `path.join(__dirname, '..')` konsisten untuk dev dan packaged mode
- Server dijalankan via `require()` langsung di Electron main process, bukan spawn child process — fix server tidak start saat packaged
- `NODE_ENV` tidak lagi di-hardcode ke production di Electron — testing endpoint tetap aktif
- `.env` path menggunakan `process.env.ENV_PATH` agar tidak mencoba menulis ke dalam `app.asar` (read-only)
- Overlay OBS load `socket.io.js` dari server lokal terlebih dahulu, fallback ke CDN — lebih reliable untuk OBS Browser Source
- `electron-builder` config — `npmRebuild: false` untuk skip native module rebuild yang membutuhkan Visual Studio
- Icon `.ico` dibuat dengan format ICO valid multi-size (16/32/48/256px), bukan PNG yang di-rename
- Database setup — urutan `CREATE TABLE` sebelum seed data, fix error `no such table`

### Known Issues
- Avatar module (`avatar/`) belum terintegrasi penuh — dependency `youtube-chat` belum diinstall, warning aman diabaikan
- vigemclient bersifat optional — fallback otomatis ke mode simulasi jika gagal install

---

## [Unreleased] — Dalam Pengembangan

### Planned — Client Module
- Server pusat (PC OBS) bisa kirim perintah efek ke PC client terpisah (PC gaming)
- Use case: streamer main game di PC berbeda dari PC yang menjalankan OBS
- Autentikasi via `CLIENT_SECRET`, koneksi via LAN atau ngrok

### Planned — RC Module
- Viewer sewa & kontrol RC/drone fisik via donasi atau sistem sewa
- Web controller (WASD/joystick) untuk viewer
- Adapter hardware ESP32 dan Raspberry Pi
- Kamera FPV streaming ke browser
- Queue system untuk multi-viewer

### Planned — Avatar Overlay
- Avatar pixel 2D muncul di overlay saat viewer chat YouTube Live
- Sistem tier — hak avatar dari donasi atau sewa RC
- Halaman pilih avatar untuk viewer
- Dashboard streamer untuk kelola tier dan avatar
- Speech bubble dengan teks chat real-time

---

[1.0.0]: https://github.com/noobiiefun/Viewer-Merusuh/releases/tag/v1.0.0
