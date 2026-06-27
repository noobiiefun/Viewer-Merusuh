<div align="center">

# 🎮 Viewer Merusuh

**Platform interaktif open-source untuk livestreamer — biarkan viewer "merusuh" saat kamu main game melalui donasi.**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20%20LTS-green.svg)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Platform-Windows-blue.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

[Fitur](#fitur) · [Instalasi](#instalasi) · [Konfigurasi](#konfigurasi) · [Client Module](#client-module--setup-2-pc) · [API](#api-reference) · [Kontribusi](#kontribusi)

</div>

---

## Apa itu Viewer Merusuh?

Viewer Merusuh adalah alternatif open-source dari **Crowd Control** yang bebas platform donasi dan bebas platform streaming. Viewer bisa mengirim donasi (lewat Saweria, Trakteer, dan platform lainnya) untuk memicu aksi dalam game yang sedang dimainkan streamer secara real-time.

Contoh skenario:
- Viewer donasi **Rp 5.000** → karakter/kendaraan **rem mendadak** selama 3 detik
- Viewer donasi **Rp 10.000** → **spam klakson** 5 detik
- Viewer donasi **Rp 50.000** → **Chaos Mode** — semua efek sekaligus selama 15 detik

> Berbeda dari Crowd Control yang terbatas di Twitch, Viewer Merusuh berjalan di PC streamer sendiri dan support **semua platform donasi** yang punya fitur webhook.

---

## Fitur

- ✅ **Multi-platform donasi** — Saweria, Trakteer, mudah tambah adapter baru
- ✅ **Multi-platform streaming** — YouTube, TikTok, Twitch, Facebook — bebas pilih
- ✅ **Effect engine** — mapping nominal donasi ke aksi game yang fleksibel, queue sequential atau paralel
- ✅ **AutoHotkey adapter** — inject keyboard/mouse untuk Racing, Action, FPS, Survival
- ✅ **vJoy / ViGEmBus adapter** — virtual Xbox 360 controller untuk game racing yang pakai controller
- ✅ **Plugin native** — GTA 5 (SHVDN C#, 23 efek) & BeamNG.drive (Lua, 10 efek)
- ✅ **OBS Overlay** — notifikasi real-time + price list via browser source
- ✅ **Dashboard web React** — manajemen efek, log donasi, konfigurasi, AHK presets, test donasi
- ✅ **Setup Wizard** — panduan konfigurasi awal 7 langkah, otomatis muncul pertama kali
- ✅ **Electron app** — bisa di-build jadi `.exe` installer atau portable untuk distribusi
- ✅ **Client Module** — agent untuk setup 2 PC (PC Gaming terpisah dari PC OBS)

---

## Arsitektur

```
Viewer → [Saweria / Trakteer] → Webhook → [Viewer Merusuh Server — Port 3000]
                                                        │
                              ┌─────────────────────────┼──────────────────────┐
                              ▼                         ▼                      ▼
                        Effect Engine           Dashboard Web            OBS Overlay
                         (queue + match)         (React, /dashboard)    (/overlay)
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
              AHK / vJoy          Plugin Native
              (keyboard +         (GTA5 / BeamNG
               controller)         polling API)
                    │                    │
                    └──────┬─────────────┘
                           ▼
                        🎮 Game
                           │
                   (via LAN / Socket.IO)
                           │
                           ▼
                   [CLIENT MODULE — Port 3002]
                   PC Gaming Terpisah
                   (AHK + vJoy + Plugin lokal)
```

---

## Struktur Proyek

```
viewer-merusuh/
│
├── electron/                    # Electron desktop app (main process, tray, IPC)
│   └── main.js
│
├── server/                      # Backend Node.js — core server
│   ├── index.js                 # Entry point Express + Socket.IO — Port 3000
│   ├── core/
│   │   ├── effectEngine.js      # Queue efek, matching donasi → efek
│   │   └── eventBus.js          # EventEmitter singleton
│   ├── adapters/
│   │   ├── saweria.js           # Webhook handler Saweria
│   │   ├── trakteer.js          # Webhook handler Trakteer
│   │   ├── ahk.js               # AutoHotkey adapter
│   │   └── vjoy.js              # ViGEm virtual gamepad adapter
│   ├── db/
│   │   ├── database.js          # SQLite singleton
│   │   └── setup.js             # Init schema + seed data
│   └── routes/
│       ├── api.js               # REST API utama
│       ├── plugin.js            # Plugin game polling endpoint
│       ├── env.js               # .env editor dari dashboard
│       └── testing.js           # Testing area endpoint
│
├── dashboard/                   # Frontend React (Vite)
│   └── src/
│       ├── App.jsx
│       └── pages/               # DashboardPage, EffectsPage, AhkPage, VjoyPage, ...
│
├── overlay/
│   └── index.html               # OBS Browser Source overlay (standalone HTML)
│
├── adapters/
│   └── ahk/                     # AutoHotkey scripts
│       ├── lib/                 # VM_Lib.ahk, generic_key.ahk, generic_combo.ahk
│       └── games/               # racing/, action/, fps/, survival/
│
├── plugins/
│   ├── gta5/ViewerMerusuh.cs   # ScriptHookV .NET plugin
│   └── beamng/viewermerusuh/   # BeamNG Lua extension
│
├── client/                      # Client Module — PC Gaming terpisah
│   ├── src/
│   │   ├── index.js
│   │   ├── core/
│   │   │   ├── connection.js    # Socket.IO ke server + auto-reconnect
│   │   │   ├── adapterManager.js
│   │   │   ├── dashboard.js     # Web UI Port 3002
│   │   │   └── discovery.js     # UDP LAN scan
│   │   └── adapters/
│   │       ├── ahk.js
│   │       ├── vjoy.js
│   │       └── plugin.js
│   └── dashboard/
│       └── connection.html      # Dashboard 4-tab (koneksi, adapter, log, console)
│
├── installer/                   # Script distribusi non-developer
│   ├── SETUP.bat
│   ├── START.bat
│   ├── STOP.bat
│   └── UPDATE.bat
│
├── docs/
│   ├── ADDING_GAMES.md
│   ├── VJOY_GUIDE.md
│   └── BUILD_ELECTRON.md
│
├── electron-builder.config.js
├── build-electron.js
├── .env.example
└── package.json
```

---

## Download & Install

### Opsi A — Installer .exe (Recommended untuk user)

1. Download `viewer-merusuh-setup-x.x.x.exe` dari [GitHub Releases](https://github.com/noobiiefun/Viewer-Merusuh/releases)
2. Jalankan installer → Next → Next → Install → Finish
3. Viewer Merusuh otomatis terbuka, Setup Wizard muncul untuk panduan konfigurasi

### Opsi B — Portable .exe

1. Download `viewer-merusuh-x.x.x-portable.exe` dari Releases
2. Letakkan di folder mana saja, double-click untuk jalankan

### Opsi C — Dari Source (untuk developer)

Lihat bagian [Instalasi](#instalasi) di bawah.

---

## Instalasi

### Prasyarat

- [Node.js v20 LTS](https://nodejs.org) — **wajib v20**, bukan v18 atau v22+ (kompatibilitas `better-sqlite3`)
- Windows (wajib untuk AutoHotkey dan ViGEmBus)
- Akun Saweria atau Trakteer dengan fitur webhook aktif

### Langkah Instalasi

**1. Clone repository**

```bash
git clone https://github.com/noobiiefun/Viewer-Merusuh.git
cd Viewer-Merusuh
```

**2. Install dependencies**

```bash
npm install
```

**3. Setup environment**

```bash
cp .env.example .env
```

Buka `.env` dan isi minimal:

```env
PORT=3000
SAWERIA_STREAM_KEY=stream_key_kamu_dari_saweria
TRAKTEER_API_KEY=api_key_kamu_dari_trakteer
NODE_ENV=development
```

**4. Inisialisasi database**

```bash
npm run setup
```

**5. Jalankan server**

```bash
# Development (auto-restart saat file berubah)
npm run dev

# Production
npm start
```

Server berjalan di `http://localhost:3000`. Dashboard di `http://localhost:3000/dashboard`.

### Cara Non-Developer (script .bat)

```
Double-click: SETUP.bat   ← jalankan sekali saat pertama kali
Double-click: START.bat   ← jalankan setiap mau streaming
Double-click: STOP.bat    ← matikan server
```

---

## Konfigurasi

### Saweria

1. Login ke [saweria.co](https://saweria.co) → **Dashboard** → **Webhook**
2. Set Webhook URL: `http://IP_LOKAL_KAMU:3000/webhook/saweria`
3. Copy **Stream Key** → paste ke `.env` sebagai `SAWERIA_STREAM_KEY`

### Trakteer

1. Login ke [trakteer.id](https://trakteer.id) → **Manage** → **Integration** → **Webhook**
2. Set Webhook URL: `http://IP_LOKAL_KAMU:3000/webhook/trakteer`
3. Copy **API Key** → paste ke `.env` sebagai `TRAKTEER_API_KEY`

> Jika server di lokal tanpa IP publik, gunakan [ngrok](https://ngrok.com) atau [Cloudflare Tunnel](https://cloudflare.com/products/tunnel/) untuk expose ke internet:
> ```bash
> ngrok http 3000
> # Pakai URL ngrok sebagai webhook URL
> ```

### OBS Overlay

1. Di OBS tambahkan source: **Browser Source**
2. URL: `http://localhost:3000/overlay`
3. Width: `400`, Height: `600`, centang **Transparent background**
4. Overlay otomatis menampilkan notifikasi donasi + price list efek aktif

### Dashboard Web

Buka `http://localhost:3000/dashboard` di browser setelah server jalan.

**Halaman yang tersedia:**
- **Dashboard** — stat card + live feed efek real-time + panel test donasi
- **Manajemen Efek** — tambah/edit/hapus/toggle efek, filter per grup game
- **AHK** — game groups, presets tombol, custom keys
- **vJoy** — status ViGEmBus + test aksi controller
- **Log Donasi** — riwayat semua donasi masuk
- **Konfigurasi** — webhook URL, overlay, queue mode
- **Testing Area** — simulasi donasi + direct trigger efek
- **Secrets** — edit `.env` langsung dari UI

### Port yang Digunakan

| Service | Port |
|---------|------|
| Server utama (Viewer Merusuh) | 3000 |
| Client Module web dashboard | 3002 |
| Vite dev server (saat `npm run dev:dashboard`) | 5173 |
| Plugin game polling lokal (di PC Gaming) | 3001 |

---

## Manajemen Efek

Efek dikonfigurasi dari halaman **Manajemen Efek** di dashboard.

### Efek Default

| Nama | Min Donasi | Max Donasi | Target | Durasi |
|------|------------|------------|--------|--------|
| Rem Mendadak | Rp 5.000 | Rp 9.999 | Racing | 3 detik |
| Klakson Spam | Rp 10.000 | Rp 19.999 | GTA 5 | 5 detik |
| Hujan Bom | Rp 20.000 | Rp 49.999 | GTA 5 | 8 detik |
| Chaos Ultimate | Rp 50.000 | ∞ | Global | 15 detik |

### Tambah Efek via API

```bash
curl -X POST http://localhost:3000/api/effects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Balik Kamera",
    "min_amount": 15000,
    "max_amount": 24999,
    "game_target": "global",
    "adapter": "ahk",
    "action_key": "flip_camera",
    "duration_ms": 5000
  }'
```

---

## AutoHotkey Adapter

### Prasyarat

- [AutoHotkey v2](https://www.autohotkey.com/download/) terinstall di Windows
- Set path di `.env`: `AHK_EXE_PATH=C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe`

### Efek per Grup

**🏎️ Racing** — BeamNG.drive, NFS, Forza, GTA 5 racing

| action_key | Efek |
|------------|------|
| `brake_force` | Rem mendadak |
| `handbrake` | Rem tangan |
| `full_throttle` | Gas penuh paksa |
| `flip_car` | Balik mobil |
| `slow_motion` | Slow motion |

**💥 Action / Open World** — GTA 5, RDR2

| action_key | Efek |
|------------|------|
| `horn_spam` | Spam klakson |
| `explosion_rain` | Hujan bom |
| `wanted_level_up` | +3 bintang wanted |
| `ragdoll` | Karakter jatuh |
| `chaos_mode` | Semua efek sekaligus |

**🔫 FPS** — CS2, Valorant, COD

| action_key | Efek |
|------------|------|
| `no_ammo` | Paksa reload terus |
| `invert_mouse` | Kamera chaos |
| `random_weapon` | Ganti senjata acak |

**🌲 Survival** — Minecraft, Rust, DayZ

| action_key | Efek |
|------------|------|
| `drop_item` | Drop item berulang |
| `camera_shake` | Kamera goyang |

Panduan menambah script untuk game baru: [`docs/ADDING_GAMES.md`](docs/ADDING_GAMES.md)

---

## vJoy / ViGEm Virtual Gamepad

Untuk racing game yang pakai controller — Viewer Merusuh bisa mengendalikan axis dan tombol via **ViGEmBus** (virtual Xbox 360 controller).

### Prasyarat

1. Install [ViGEmBus driver](https://github.com/nefarius/ViGEmBus/releases) → restart PC
2. `npm install` (vigemclient sudah di package.json)

### Aksi yang Tersedia (`adapter: "vjoy"`)

| action_key | Efek | Input |
|------------|------|-------|
| `vjoy_brake` | Rem penuh | Left Trigger 100% |
| `vjoy_throttle` | Gas penuh | Right Trigger 100% |
| `vjoy_steer_left` | Steer kiri | Left Stick ← max |
| `vjoy_steer_right` | Steer kanan | Left Stick → max |
| `vjoy_random_steer` | Steer chaos | Left Stick oscillate |
| `vjoy_handbrake` | Handbrake | Button X |
| `vjoy_drift_chaos` | Gas + steer chaos | RT 100% + oscillate |
| `vjoy_reverse` | Mundur paksa | LT 100% + stick down |
| `vjoy_rumble` | Getarkan controller | Steer chaos ringan |
| `vjoy_disconnect` | Cabut-colok controller | Disconnect/reconnect |

Panduan lengkap: [`docs/VJOY_GUIDE.md`](docs/VJOY_GUIDE.md)

---

## Plugin Native Game

Plugin berjalan **di dalam game** untuk kontrol yang lebih presisi dibanding keyboard inject.

```
Server ←── Plugin polling GET /api/plugin/pending?game=gta5
       ──► Plugin eksekusi native API game
       ──► Plugin lapor POST /api/plugin/done
```

### GTA 5 — ScriptHookV .NET (C#)

23 efek native: wanted level, ledakan, cuaca, kendaraan, NPC, dan lainnya.

Instalasi: copy `plugins/gta5/ViewerMerusuh.cs` ke `Grand Theft Auto V/scripts/`

> ⚠️ **Hanya Story Mode.** Jangan digunakan di GTA Online.

### BeamNG.drive — Lua Extension

10 efek native: rem, gas, steer, slow motion, kerusakan acak, dan lainnya.

Instalasi: copy folder `plugins/beamng/viewermerusuh/` ke `Documents/BeamNG.drive/mods/unpacked/`

---

## Client Module — Setup 2 PC

Untuk streamer dengan setup **2 PC** (PC OBS terpisah dari PC Gaming). Client Module adalah agent Node.js yang berjalan di PC Gaming dan menerima perintah efek dari server via Socket.IO.

```
PC OBS / Stream          PC Gaming
──────────────    LAN    ──────────────────
Viewer Merusuh  ──────►  Client Module
Server :3000             :3002 (dashboard)
                          ├── AHK adapter
                          ├── vJoy adapter
                          └── Plugin proxy
```

### Instalasi Client

```bash
cd client
npm install
npm run setup   # buat .env dari template
npm start
```

Buka `http://localhost:3002` — dashboard 4-tab untuk mengatur koneksi, adapter, dan melihat log efek real-time.

### Konfigurasi Client (`client/.env`)

```env
SERVER_URL=http://192.168.1.10:3000   # IP PC OBS / Stream
CLIENT_SECRET=secret_yang_sama_dengan_server
CLIENT_NAME=GamePC
ADAPTER_AHK=true
ADAPTER_VJOY=false
ADAPTER_PLUGIN=false
```

### Auth di Server

Tambahkan ke `server/index.js` dan `.env` server:

```env
# server/.env
CLIENT_SECRET=rahasia_yang_panjang_dan_unik
```

```javascript
// server/index.js
io.use((socket, next) => {
  const { secret, role } = socket.handshake.auth;
  if (role === 'game-client') {
    if (secret !== process.env.CLIENT_SECRET) return next(new Error('auth_error'));
    socket.clientName = socket.handshake.auth.clientName || 'unknown';
  }
  next();
});
```

Dokumentasi lengkap client: [`client/docs/readme.md`](client/docs/readme.md)

---

## API Reference

Base URL: `http://localhost:3000`

### Webhook (Incoming)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/webhook/saweria` | Terima donasi dari Saweria |
| POST | `/webhook/trakteer` | Terima donasi dari Trakteer |

### Effects

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/effects` | Daftar semua efek |
| POST | `/api/effects` | Buat efek baru |
| PUT | `/api/effects/:id` | Update efek |
| DELETE | `/api/effects/:id` | Hapus efek |
| POST | `/api/effects/:id/toggle` | Toggle aktif/nonaktif |

### Logs & Config

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/logs` | Log donasi (`?platform=saweria&limit=50`) |
| GET | `/api/config` | Baca konfigurasi global |
| PUT | `/api/config` | Update konfigurasi global |
| GET | `/api/status` | Status server & statistik |

### Plugin Game

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/plugin/pending` | Ambil efek antrian (polling dari game) |
| POST | `/api/plugin/complete/:id` | Konfirmasi efek selesai |
| GET | `/api/plugin/status` | Status server plugin |

### Testing

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/testing/donate` | Simulasi donasi |
| POST | `/api/testing/trigger` | Direct trigger efek |

### Socket.IO Events

```javascript
const socket = io('http://localhost:3000')

socket.on('donation', (data) => { /* { platform, donatorName, amount, message } */ })
socket.on('effect',   (data) => { /* { id, name, adapter, action, duration_ms, donation } */ })
```

---

## Build .exe

```bash
# Build installer + portable .exe sekaligus
node build-electron.js

# Output:
# dist-electron/viewer-merusuh-setup-1.0.0.exe     ← installer
# dist-electron/viewer-merusuh-1.0.0-portable.exe  ← portable
```

Panduan lengkap: [`docs/BUILD_ELECTRON.md`](docs/BUILD_ELECTRON.md)

---

## Roadmap

- [x] **Phase 1** — Core server, donation adapters (Saweria & Trakteer), effect engine, OBS overlay
- [x] **Phase 2** — AutoHotkey adapter (Racing, Action/GTA5, FPS, Survival) + sistem grup modular
- [x] **Phase 3** — Dashboard web React (manajemen efek, log donasi, konfigurasi, test donasi)
- [x] **Phase 4** — vJoy/ViGEm virtual gamepad adapter (Xbox 360 virtual, 10 aksi racing)
- [x] **Phase 5** — Plugin native GTA 5 (23 efek via SHVDN C#) & BeamNG.drive (10 efek via Lua)
- [x] **Phase 6** — Testing Area + Secrets Editor (UI edit .env) + AHK presets & custom keys
- [x] **Phase 7** — Electron .exe installer & portable + Setup Wizard + tray icon
- [x] **Client Module** — Agent PC Gaming 2-PC: AHK + vJoy + Plugin proxy + Web Dashboard 4-tab

**Yang sedang/akan dikerjakan:**
- [ ] RC Module — kontrol RC fisik via donasi (Phase 1–2 selesai, Phase 3+ hardware)
- [ ] Cooldown per efek yang berfungsi di effectEngine
- [ ] Auto-update Electron via electron-updater
- [ ] Statistik donasi (grafik per hari/minggu)
- [ ] Adapter platform tambahan: Streamlabs, Ko-fi, TikTok Live

---

## Menambah Adapter Platform Donasi Baru

Buat file `server/adapters/nama_platform.js`:

```javascript
const eventBus = require('../core/eventBus')

function namaWebhookHandler(req, res) {
  const body = req.body
  const donation = {
    platform:    'nama_platform',
    donatorName: body.nama_donatur,
    amount:      parseInt(body.nominal),
    message:     body.pesan || '',
    rawPayload:  body,
  }
  eventBus.emit('donation', donation)
  return res.json({ status: 'ok' })
}

module.exports = { namaWebhookHandler }
```

Daftarkan di `server/index.js`:

```javascript
const { namaWebhookHandler } = require('./adapters/nama_platform')
app.post('/webhook/nama_platform', namaWebhookHandler)
```

---

## Kontribusi

Pull request sangat disambut! Area yang butuh kontribusi:

1. **Adapter platform** — Ko-fi, Donorbox, StreamElements, Streamlabs, TikTok Live
2. **Script AHK** — efek untuk game populer yang belum ada
3. **Dokumentasi** — tutorial setup per game
4. **Bug fix** — lihat [Issues](https://github.com/noobiiefun/Viewer-Merusuh/issues)

```bash
git checkout -b fitur/nama-fitur
git commit -m "feat: deskripsi singkat perubahan"
git push origin fitur/nama-fitur
# Buka Pull Request
```

---

## Lisensi

[MIT License](LICENSE) — bebas digunakan, dimodifikasi, dan didistribusikan.

---

<div align="center">

Dibuat dengan ☕ untuk komunitas streamer Indonesia

**[⬆ Kembali ke atas](#-viewer-merusuh)**

</div>
