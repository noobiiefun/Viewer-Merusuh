# 🎮 RC Module — Viewer Merusuh Extension

> **Tagline:** Penonton bayar, RC merusuh di dunia nyata.

Modul ekstensi untuk **Viewer Merusuh** yang memungkinkan viewer menyewa dan mengontrol RC / drone secara real-time via donasi atau sistem sewa berbayar.

---

## 📋 Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Roadmap Pengembangan](#2-roadmap-pengembangan)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Struktur Folder](#4-struktur-folder)
5. [Cara Integrasi ke Viewer Merusuh](#5-cara-integrasi-ke-viewer-merusuh)
6. [Flow Sewa RC](#6-flow-sewa-rc)
7. [Hardware yang Didukung](#7-hardware-yang-didukung)
8. [Langkah Memulai](#8-langkah-memulai)

> 📌 Lihat juga [`docs/HARDENING_NOTES.md`](docs/HARDENING_NOTES.md) — catatan
> tentang penguatan fondasi software (persistence, validasi, test) yang
> dilakukan sebelum lanjut ke hardware.

---

## 1. Gambaran Umum

RC Module adalah **modul terpisah** yang bisa berdiri sendiri atau diintegrasikan ke Viewer Merusuh. Konsepnya terinspirasi dari streamer China di Douyin/Taobao Live yang menyewakan RC berkamera kepada viewer secara real-time.

### Alur Utama (Target Akhir)

```
Viewer memilih RC di website/overlay
    ↓
Viewer bayar (donasi Saweria/Trakteer ATAU sistem sewa)
    ↓
Server assign RC ke viewer + mulai timer sewa
    ↓
Viewer dapat akses web controller (WASD / joystick on-screen)
    ↓
Perintah kontrol dikirim ke hardware RC via WiFi / WebSocket
    ↓
Kamera RC (FPV) distream ke browser viewer
    ↓
Timer habis → kontrol dicabut → RC kembali ke "Available"
```

### Skenario Penggunaan

| Skenario | Deskripsi |
|----------|-----------|
| **Viewer Merusuh Integration** | Donasi senilai X = kontrol RC Y menit selama live |
| **Standalone Rental** | Website sewa RC mandiri dengan payment gateway |
| **Event/Exhibition** | RC arena di event, pengunjung scan QR → kontrol HP |
| **Drone Photography** | Viewer sewa drone untuk foto udara custom |

---

## 2. Roadmap Pengembangan

Pengembangan dibagi dalam **6 Phase**. Saat ini fokus membangun fondasi (Phase 1-2).

```
Phase 1 ✅  Fondasi & Dokumentasi
Phase 1.5 ✅ Pondasi Software Diperkuat (persistence, validasi, test, admin UI)
Phase 2 🔄  Simulator (tanpa hardware nyata) — sudah jalan, terus disempurnakan
Phase 3 ⏳  Hardware Integration (ESP32/Raspberry Pi)
Phase 4 ⏳  Kamera Streaming (FPV)
Phase 5 ⏳  Multi-RC & Queue System
Phase 6 ⏳  Integrasi penuh ke Viewer Merusuh
```

### Detail per Phase

#### Phase 1 — Fondasi & Dokumentasi (SELESAI)
- [x] Struktur folder & arsitektur
- [x] Dokumentasi lengkap
- [x] Simulator RC (tanpa hardware)
- [x] Core logic: session manager, queue, timer

#### Phase 1.5 — Pondasi Software Diperkuat (SELESAI)
> Ini ditambahkan sebelum lanjut ke hardware, supaya fondasinya benar-benar kokoh.

- [x] Database SQLite untuk fleet + session history (persist antar restart server)
- [x] `commandSanitizer.js` — gerbang validasi tunggal untuk SEMUA command kontrol sebelum sampai ke adapter manapun (penting untuk keselamatan saat hardware fisik masuk)
- [x] Rate limiter command per-RC (cegah flood/spam command)
- [x] Validasi input ketat di semua method core (`sessionManager`, `queueManager`, `fleetManager`) — menolak input aneh sebelum jadi bug
- [x] Try/catch konsisten di semua REST endpoint — tidak ada lagi uncaught exception ke client
- [x] Admin dashboard (`web-client/admin/admin.html`) — monitoring fleet, sesi aktif, queue secara real-time
- [x] Unit test (`core/__tests__/`) untuk sanitizer, session manager, queue manager, fleet manager
- [x] Endpoint `/api/session/history` yang sudah didokumentasikan tapi belum diimplementasi

#### Phase 2 — Simulator & Web Controller
- [x] Web controller UI (D-pad + keyboard)
- [x] Simulasi RC di browser (kotak bergerak di canvas)
- [x] Session timer real-time
- [x] Queue list viewer (di admin dashboard)
- [ ] Joystick on-screen (saat ini masih D-pad diskrit)

#### Phase 3 — Hardware Real (ESP32)
- [x] Firmware ESP32 (`hardware/esp32/firmware.ino`) — siap upload, sudah ada safety timeout
- [ ] Adapter `rc-esp32.js` di server — skeleton sudah ada, WebSocket client-nya belum diisi
- [ ] Test kontrol RC nyata via browser

#### Phase 4 — Kamera FPV
- [ ] Stream kamera RC ke browser (WebRTC / HLS)
- [ ] Overlay kamera di web controller
- [ ] Integrasi ke OBS sebagai scene

#### Phase 5 — Multi-RC & Fleet Management
- [x] Support banyak RC sekaligus (sudah jalan di simulator)
- [x] Dashboard admin fleet RC
- [x] Queue otomatis (viewer berikutnya) — sudah jalan

#### Phase 6 — Integrasi Viewer Merusuh
- [ ] Donasi Saweria/Trakteer → trigger sewa RC (kode contoh sudah ada di INTEGRATION_GUIDE.md, belum dites end-to-end)
- [ ] Overlay OBS menampilkan siapa yang kontrol RC
- [x] eventBus integration (skeleton sudah ada di `api/server.js` → `init()`)
- [ ] Dashboard tab baru di Viewer Merusuh (React)

---

## 3. Arsitektur Sistem

### Arsitektur Lengkap (Target Akhir)

```
┌─────────────────────────────────────────────────────────┐
│                 VIEWER MERUSUH (existing)                │
│  eventBus.emit('donation', data)                         │
└─────────────────┬───────────────────────────────────────┘
                  │ (Phase 6)
┌─────────────────▼───────────────────────────────────────┐
│                RC MODULE SERVER                          │
│  rc-module/api/server.js — Express + Socket.IO           │
│  PORT: 3001 (terpisah dari Viewer Merusuh port 3000)     │
│                                                          │
│  Routes:                                                 │
│  • /api/rc/*          → REST API fleet RC                │
│  • /api/session/*     → Manajemen sesi sewa              │
│  • /api/queue/*       → Antrian viewer                   │
│  • /webhook/donation  → Terima event dari Viewer Merusuh │
│  • /controller        → Web controller untuk viewer      │
│  • /admin             → Dashboard admin RC               │
└──────────┬──────────────────────────┬────────────────────┘
           │                          │
┌──────────▼──────────┐    ┌──────────▼──────────────────┐
│   SESSION MANAGER   │    │      SOCKET.IO EVENTS        │
│  core/sessionMgr.js │    │  • rc_status → semua client  │
│  • Assign RC        │    │  • control_cmd → hardware    │
│  • Timer countdown  │    │  • session_start → viewer    │
│  • Release RC       │    │  • session_end → viewer      │
│  • Queue management │    │  • queue_update → semua      │
└──────────┬──────────┘    └─────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│                   ADAPTER LAYER                          │
│  ┌─────────────────┐   ┌─────────────────┐              │
│  │  rc-esp32.js    │   │  rc-raspi.js    │              │
│  │  (WiFi UDP/WS)  │   │  (SSH / GPIO)   │              │
│  └────────┬────────┘   └────────┬────────┘              │
│           │                     │                        │
│  ┌────────▼────────┐   ┌────────▼────────┐              │
│  │  drone-esp32.js │   │  rc-simulator.js│              │
│  │  (MAVLink/UDP)  │   │  (dev only)     │              │
│  └─────────────────┘   └─────────────────┘              │
└─────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│                 HARDWARE LAYER                           │
│  ┌───────────────┐   ┌───────────────┐                  │
│  │   ESP32 RC    │   │  Drone (FPV)  │                  │
│  │  + FPV cam   │   │  + MAVLink    │                  │
│  └───────────────┘   └───────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

### Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Server RC | Node.js + Express + Socket.IO |
| Database | SQLite (sama seperti Viewer Merusuh) |
| Web Controller | React (atau vanilla HTML/JS) |
| Hardware RC | ESP32 + WebSocket firmware |
| Hardware Drone | Raspberry Pi + MAVLink / ArduPilot |
| Kamera Stream | WebRTC (via mediasoup) atau HLS (via ffmpeg) |
| Integrasi VM | eventBus (shared) atau HTTP POST |

---

## 4. Struktur Folder

```
rc-module/
│
├── README.md                    # ← File ini
├── docs/
│   ├── ARCHITECTURE.md          # Arsitektur detail
│   ├── HARDWARE_GUIDE.md        # Panduan hardware ESP32 & drone
│   ├── API_REFERENCE.md         # Dokumentasi REST API & Socket events
│   ├── INTEGRATION_GUIDE.md     # Cara gabung ke Viewer Merusuh
│   └── SIMULATOR_GUIDE.md       # Cara run simulator tanpa hardware
│
├── core/
│   ├── sessionManager.js        # Logic sewa: assign, timer, release, history
│   ├── queueManager.js          # Antrian viewer
│   ├── fleetManager.js          # Manajemen armada RC/drone (persisted ke DB)
│   ├── commandSanitizer.js      # ⚠️ Gerbang validasi SEMUA command sebelum ke hardware
│   └── __tests__/               # Unit test (jest)
│       ├── commandSanitizer.test.js
│       ├── sessionManager.test.js
│       ├── queueManager.test.js
│       ├── fleetManager.test.js
│       └── testSetup.js         # Helper in-memory DB untuk testing
│
├── adapters/
│   ├── rc/
│   │   ├── rc-esp32.js          # Adapter RC berbasis ESP32 (skeleton, Phase 3)
│   │   ├── rc-raspi.js          # Adapter RC berbasis Raspberry Pi (belum ada)
│   │   └── rc-simulator.js      # Simulator (dev/testing)
│   └── drone/
│       ├── drone-mavlink.js     # Adapter drone via MAVLink (belum ada)
│       └── drone-simulator.js   # Simulator drone (belum ada)
│
├── hardware/
│   ├── esp32/
│   │   ├── firmware.ino         # Kode Arduino/ESP32
│   │   └── WIRING_GUIDE.md      # Panduan wiring ESP32 ke RC (belum ada, ada di HARDWARE_GUIDE.md)
│   └── raspi/
│       ├── setup.sh             # Script setup Raspberry Pi (belum ada)
│       └── RASPI_GUIDE.md       # Panduan Raspberry Pi (belum ada)
│
├── api/
│   ├── server.js                # Entry point server RC Module
│   └── db/
│       ├── database.js          # SQLite singleton getDB()
│       └── setup.js             # Schema + migration check + seed config
│
├── web-client/
│   ├── controller.html          # Web controller untuk viewer
│   └── admin/
│       └── admin.html           # Dashboard admin (monitoring fleet real-time)
│
├── data/                        # (auto-generated) lokasi file rc-module.db
│
└── simulator/
    └── README.md                # Panduan simulator
```

---

## 5. Cara Integrasi ke Viewer Merusuh

> Integrasi penuh dilakukan di **Phase 6**. Dokumen ini mencatat rencana integrasi.

### Opsi A — eventBus Shared (Rekomendasi)

RC Module berjalan dalam proses yang sama dengan Viewer Merusuh:

```js
// Di server/index.js Viewer Merusuh — tambahkan:
const rcModule = require('../rc-module/api/server');
rcModule.init({ eventBus, db, io });

// Di rc-module/api/server.js:
module.exports = {
  init({ eventBus, db, io }) {
    eventBus.on('donation', (data) => {
      // cek apakah donasi memenuhi syarat sewa RC
      sessionManager.handleDonation(data);
    });
  }
};
```

### Opsi B — HTTP POST (Loosely Coupled)

RC Module berjalan sebagai server terpisah (port 3001):

```js
// Di server/adapters/saweria.js Viewer Merusuh — tambahkan:
await fetch('http://localhost:3001/webhook/donation', {
  method: 'POST',
  body: JSON.stringify(donationData)
});
```

### Opsi C — Standalone (Tanpa Viewer Merusuh)

RC Module berdiri sendiri sebagai website sewa RC independent.

---

## 6. Flow Sewa RC

### Flow Donasi (Integrasi Viewer Merusuh)

```
1. Viewer donasi Rp X di Saweria/Trakteer
2. Viewer Merusuh terima webhook → emit 'donation'
3. RC Module cek: apakah nominal memenuhi minimum sewa?
4. Jika ya → cek fleet: ada RC available?
   ├── Ada → assign RC ke viewer, mulai timer
   └── Tidak ada → masukkan ke queue, notify viewer
5. Viewer dapat link controller: http://localhost:3001/controller?token=XXX
6. Timer countdown berjalan (misal: 5 menit)
7. Viewer kontrol RC via web
8. Timer habis → kontrol dicabut → RC status = Available
9. Queue diproses → viewer berikutnya dapat giliran
```

### Flow Sewa Mandiri (Standalone)

```
1. Viewer buka website RC
2. Pilih RC yang tersedia (lihat live feed kamera)
3. Pilih durasi sewa (1 menit, 5 menit, 10 menit)
4. Bayar via payment gateway
5. Dapat token akses → redirect ke web controller
6. Timer berjalan selama durasi yang dibeli
```

---

## 7. Hardware yang Didukung

### RC Darat

| Hardware | Protokol | Status |
|----------|----------|--------|
| ESP32 + L298N motor driver | WebSocket (WiFi) | 🔄 Phase 3 |
| Raspberry Pi + motor HAT | SSH / GPIO | ⏳ Phase 3 |
| RC komersial (dengan modifikasi) | UART/PWM | ⏳ Future |

### Drone

| Hardware | Protokol | Status |
|----------|----------|--------|
| Drone DIY + Raspberry Pi | MAVLink / UDP | ⏳ Phase 4 |
| Drone komersial (Tello) | SDK HTTP | ⏳ Future |
| DJI (third-party SDK) | Mobile SDK | ⏳ Future |

### Kamera FPV

| Hardware | Metode Stream | Status |
|----------|--------------|--------|
| ESP32-CAM | MJPEG over HTTP | ⏳ Phase 4 |
| USB Webcam | WebRTC via mediasoup | ⏳ Phase 4 |
| IP Camera | HLS/RTSP via ffmpeg | ⏳ Phase 4 |

---

## 8. Langkah Memulai

### Sekarang (Phase 1-2) — Tanpa Hardware

```bash
# 1. Masuk folder rc-module
cd rc-module

# 2. Install dependencies
npm install

# 3. Jalankan test (memastikan fondasi software aman sebelum lanjut)
npm test

# 4. Jalankan simulator
npm run simulator

# 5. Buka di browser
# Admin dashboard → http://localhost:3001/rc/admin/admin.html
# Web controller  → didapat dari response saat mulai sesi (lihat docs/SIMULATOR_GUIDE.md)
```

> 💾 **Catatan database:** Saat pertama kali dijalankan, RC Module otomatis membuat
> folder `data/` berisi `rc-module.db` (SQLite). File ini menyimpan fleet RC dan
> riwayat sesi secara permanen — aman untuk di-`.gitignore`-kan, atau backup kalau perlu.

> ⚠️ **Catatan instalasi:** `better-sqlite3` adalah native module yang perlu dikompilasi
> saat instalasi. Jika `npm install` gagal karena native build, pastikan sudah ada
> Node.js LTS + (Windows) Visual C++ Build Tools — pola masalah yang sama seperti
> pernah terjadi di Viewer Merusuh (lihat `DEVELOPER_GUIDE.md` bagian "better-sqlite3 error").

### Nanti (Phase 3) — Dengan Hardware ESP32

Lihat: [`docs/HARDWARE_GUIDE.md`](docs/HARDWARE_GUIDE.md)

---

*Modul ini adalah ekstensi dari Viewer Merusuh*
*GitHub: https://github.com/noobiiefun/Viewer-Merusuh*
*Versi dokumen: 0.1.0 — Phase 1*
