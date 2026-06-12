<div align="center">

# 🎮 Viewer Merusuh

**Platform interaktif open-source untuk livestreamer — biarkan viewer "merusuh" saat kamu main game melalui donasi.**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

[Demo](#demo) · [Fitur](#fitur) · [Instalasi](#instalasi) · [Konfigurasi](#konfigurasi) · [API](#api-reference) · [Kontribusi](#kontribusi)

</div>

---

## Apa itu Viewer Merusuh?

Viewer Merusuh adalah alternatif open-source dari Crowd Control yang **bebas platform donasi dan bebas platform streaming**. Viewer bisa mengirim donasi (lewat Saweria, Trakteer, dan platform lainnya) untuk memicu aksi dalam game yang sedang dimainkan streamer secara real-time.

Contoh skenario:
- Viewer donasi **Rp 5.000** → karakter/kendaraan **rem mendadak** selama 3 detik
- Viewer donasi **Rp 10.000** → **spam klakson** 5 detik
- Viewer donasi **Rp 50.000** → **Chaos Mode** — semua efek sekaligus selama 15 detik

> Berbeda dari Crowd Control yang terbatas di Twitch, Viewer Merusuh berjalan di PC streamer sendiri dan support **semua platform donasi** yang punya fitur webhook.

---

## Fitur

- ✅ **Multi-platform donasi** — Saweria, Trakteer, dan mudah ditambah adapter baru
- ✅ **Multi-platform streaming** — YouTube, TikTok, Twitch, Facebook — bebas pilih
- ✅ **Effect engine** — mapping nominal donasi ke aksi game yang fleksibel
- ✅ **Game adapter** — support AutoHotkey (Windows), vJoy/ViGEm (virtual gamepad), xdotool (Linux)
- ✅ **OBS Overlay** — notifikasi real-time via browser source
- ✅ **Dashboard web** — konfigurasi efek lewat browser, no coding
- ✅ **Queue system** — efek antri atau paralel, bisa diatur
- ✅ **Cooldown per efek** — cegah spam efek yang sama
- ✅ **Test mode** — simulasi donasi tanpa perlu donasi sungguhan
- ✅ **REST API** — integrasi dengan tool lain via API

---

## Arsitektur

```
Viewer → [Platform Donasi] → Webhook → [Viewer Merusuh Server]
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                        Effect Engine    Dashboard Web    OBS Overlay
                              │
                              ▼
                        Game Adapter (AHK / vJoy)
                              │
                              ▼
                           🎮 Game
```

---

## Struktur Proyek

```
viewer-merusuh/
├── server/                  # Backend Node.js
│   ├── index.js             # Entry point server
│   ├── adapters/            # Adapter platform donasi
│   │   ├── saweria.js       # Saweria webhook handler
│   │   └── trakteer.js      # Trakteer webhook handler
│   ├── core/
│   │   ├── effectEngine.js  # Logic mapping donasi → efek
│   │   └── eventBus.js      # Internal event system
│   ├── db/
│   │   ├── database.js      # SQLite connection
│   │   └── setup.js         # Database initializer
│   └── routes/
│       └── api.js           # REST API endpoints
├── dashboard/               # [Phase 3] React dashboard
├── overlay/
│   └── index.html           # OBS Browser Source overlay
├── adapters/
│   └── ahk/                 # [Phase 2] AutoHotkey scripts
├── .env.example
├── package.json
└── README.md
```

---

## Instalasi

### Prasyarat

- [Node.js](https://nodejs.org) versi 18 atau lebih baru
- Windows (untuk AutoHotkey adapter) / Linux / macOS
- Akun Saweria atau Trakteer dengan fitur webhook aktif

### Langkah Instalasi

**1. Clone repository**

```bash
git clone https://github.com/username/viewer-merusuh.git
cd viewer-merusuh
```

**2. Install dependencies**

```bash
npm install
```

**3. Setup environment**

```bash
cp .env.example .env
```

Buka file `.env` dan isi sesuai kebutuhan:

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

Perintah ini membuat file `viewer-merusuh.db` dengan tabel dan efek default.

**5. Jalankan server**

```bash
# Development (auto-restart saat file berubah)
npm run dev

# Production
npm start
```

Server berjalan di `http://localhost:3000`.

---

## Konfigurasi

### Saweria

1. Login ke [saweria.co](https://saweria.co) → **Dashboard** → **Webhook**
2. Set Webhook URL ke: `http://IP_LOKAL_KAMU:3000/webhook/saweria`
3. Copy **Stream Key** dan paste ke file `.env` sebagai `SAWERIA_STREAM_KEY`

> Jika server berjalan lokal dan tidak punya IP publik, gunakan [ngrok](https://ngrok.com) atau [localtunnel](https://localtunnel.me) untuk expose port lokal ke internet.

```bash
# Contoh dengan ngrok
ngrok http 3000

# Gunakan URL yang diberikan ngrok sebagai webhook URL
# Contoh: https://abc123.ngrok.io/webhook/saweria
```

### Trakteer

1. Login ke [trakteer.id](https://trakteer.id) → **Manage** → **Integration** → **Webhook**
2. Set Webhook URL ke: `http://IP_LOKAL_KAMU:3000/webhook/trakteer`
3. Copy **API Key** dan paste ke `.env` sebagai `TRAKTEER_API_KEY`

### OBS Overlay

1. Di OBS, tambahkan source baru: **Browser Source**
2. Set URL ke: `http://localhost:3000/overlay`
3. Width: `400`, Height: `600`, background transparan ✓
4. Letakkan di pojok layar sesuai selera

---

## Manajemen Efek

Efek dikonfigurasi lewat **REST API** atau nantinya lewat **Dashboard Web** (Phase 3).

### Efek Default

| Nama | Min Donasi | Max Donasi | Target | Durasi |
|------|------------|------------|--------|--------|
| Rem Mendadak | Rp 5.000 | Rp 9.999 | Racing | 3 detik |
| Klakson Spam | Rp 10.000 | Rp 19.999 | GTA 5 | 5 detik |
| Hujan Bom | Rp 20.000 | Rp 49.999 | GTA 5 | 8 detik |
| Chaos Ultimate | Rp 50.000 | ∞ | Global | 15 detik |

### Tambah Efek Baru via API

```bash
curl -X POST http://localhost:3000/api/effects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Balik Kamera",
    "description": "Membalik perspektif kamera selama 5 detik",
    "min_amount": 15000,
    "max_amount": 24999,
    "game_target": "global",
    "adapter": "ahk",
    "action_key": "flip_camera",
    "duration_ms": 5000,
    "cooldown_ms": 10000
  }'
```

### Test Donasi (Development)

Tanpa perlu donasi sungguhan, simulasikan via API:

```bash
curl -X POST http://localhost:3000/api/test/donation \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "donatorName": "Test Viewer",
    "message": "merusuh!",
    "platform": "test"
  }'
```

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
| GET | `/api/effects/:id` | Detail satu efek |
| POST | `/api/effects` | Buat efek baru |
| PUT | `/api/effects/:id` | Update efek |
| DELETE | `/api/effects/:id` | Hapus efek |
| POST | `/api/effects/:id/toggle` | Toggle aktif/nonaktif |

### Logs & Config

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/logs` | Log donasi (query: `?platform=saweria&limit=50`) |
| GET | `/api/config` | Baca konfigurasi global |
| PUT | `/api/config` | Update konfigurasi global |
| GET | `/api/status` | Status server & statistik |

### Development

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/test/donation` | Simulasi donasi (dev mode only) |

### Socket.io Events

Client (dashboard/overlay) bisa subscribe ke event berikut:

```javascript
const socket = io('http://localhost:3000')

// Event: donasi masuk
socket.on('donation', (data) => {
  // { platform, donatorName, amount, message }
})

// Event: efek aktif
socket.on('effect', (data) => {
  // { id, name, actionKey, durationMs, donation: {...} }
})
```

---

## Roadmap

- [x] **Phase 1** — Core server, donation adapters (Saweria & Trakteer), effect engine, OBS overlay
- [x] **Phase 2** — Game adapters AutoHotkey (Racing, Action/GTA5, FPS, Survival) + sistem grup modular
- [ ] **Phase 3** — Dashboard web React (manajemen efek via UI)
- [ ] **Phase 4** — vJoy/ViGEm virtual gamepad adapter (untuk racing game dengan controller)
- [ ] **Phase 5** — Plugin native GTA 5 & BeamNG.drive
- [ ] **Phase 6** — Adapter tambahan: Streamlabs, Ko-fi, Donorbox
- [ ] **Phase 7** — Installer/exe untuk non-developer

---

## Game Adapters (AutoHotkey)

### Prasyarat

- [AutoHotkey v2](https://www.autohotkey.com/download/) terinstall di Windows
- Set path AHK di `.env`:

```env
AHK_EXE_PATH=C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe
```

### Efek Bawaan per Grup

**🏎️ Racing** — BeamNG.drive, NFS, Forza, GTA 5 racing

| action_key | Efek | Default Key |
|------------|------|-------------|
| `brake_force` | Rem mendadak | Space |
| `handbrake` | Rem tangan | X |
| `full_throttle` | Gas penuh paksa | W |
| `flip_car` | Balik mobil | - |
| `slow_motion` | Slow motion | F9 |

**💥 Action / Open World** — GTA 5, RDR2

| action_key | Efek | Metode |
|------------|------|--------|
| `horn_spam` | Spam klakson | Key E |
| `explosion_rain` | Hujan bom | Cheat HIGHEX |
| `wanted_level_up` | +3 bintang wanted | Cheat FUGITIVE |
| `ragdoll` | Karakter jatuh | Jump + Crouch |
| `super_jump` | Super jump | Cheat HOPTOIT |
| `chaos_mode` | Semua efek sekaligus | Multi-cheat |

**🔫 FPS** — CS2, Valorant, COD

| action_key | Efek | Metode |
|------------|------|--------|
| `no_ammo` | Paksa reload terus | Spam R |
| `invert_mouse` | Kamera chaos | Mouse shake |
| `random_weapon` | Ganti senjata acak | Random 1-9 |

**🌲 Survival** — Minecraft, Rust, DayZ

| action_key | Efek | Default Key |
|------------|------|-------------|
| `drop_item` | Drop item berulang | G |
| `camera_shake` | Kamera goyang | Mouse chaos |

### Menambah Game Baru

Lihat panduan lengkap di [`docs/ADDING_GAMES.md`](docs/ADDING_GAMES.md).

Singkatnya:
1. Buat script AHK di `adapters/ahk/games/[grup]/[efek].ahk`
2. Daftar `action_key` di `server/adapters/ahk.js` → `ACTION_REGISTRY`
3. Tambah efek ke DB via `POST /api/effects`



Buat file baru di `server/adapters/nama_platform.js`:

```javascript
const eventBus = require('../core/eventBus')

function namaWebhookHandler(req, res) {
  const body = req.body

  // Parse payload sesuai format platform
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

Kemudian daftarkan di `server/index.js`:

```javascript
const { namaWebhookHandler } = require('./adapters/nama_platform')
app.post('/webhook/nama_platform', namaWebhookHandler)
```

---

## Kontribusi

Pull request sangat disambut! Beberapa area yang butuh kontribusi:

1. **Adapter platform** — Ko-fi, Donorbox, StreamElements, Streamlabs
2. **Game adapter** — script AutoHotkey untuk game populer
3. **Dashboard React** — UI untuk manajemen efek
4. **Dokumentasi** — tutorial setup per game

Cara berkontribusi:

```bash
# Fork repo, lalu:
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
