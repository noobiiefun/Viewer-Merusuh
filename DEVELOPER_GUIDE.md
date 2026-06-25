# Viewer Merusuh — Dokumentasi Developer

> **Tagline:** Penonton Bayar, Game Kacau. Bahkan RC-nya juga kacau.
> Platform interaktif open-source untuk livestreamer — viewer bisa merusuh saat streaming game via donasi, dan bahkan mengontrol RC fisik di IRL.

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Struktur Folder](#3-struktur-folder)
4. [Database Schema](#4-database-schema)
5. [Backend — Server Node.js](#5-backend--server-nodejs)
6. [Frontend — Dashboard React](#6-frontend--dashboard-react)
7. [Overlay OBS](#7-overlay-obs)
8. [Adapter Layer](#8-adapter-layer)
9. [Plugin Native Game](#9-plugin-native-game)
10. [Electron App](#10-electron-app)
11. [Client Module — PC Gaming Terpisah](#11-client-module--pc-gaming-terpisah)
12. [RC Module — Kontrol RC via Donasi](#12-rc-module--kontrol-rc-via-donasi)
13. [REST API Reference](#13-rest-api-reference)
14. [Socket.io Events](#14-socketio-events)
15. [Config Keys](#15-config-keys)
16. [Panduan Menambah Fitur](#16-panduan-menambah-fitur)
17. [Panduan Fix Bug](#17-panduan-fix-bug)
18. [Roadmap & Ide Pengembangan](#18-roadmap--ide-pengembangan)

---

## 1. Gambaran Umum

Viewer Merusuh adalah alternatif open-source dari **Crowd Control** yang bebas platform donasi dan bebas platform streaming. Saat viewer mengirim donasi melalui Saweria atau Trakteer, server mendeteksi donasi tersebut, mencocokkan nominalnya dengan efek yang telah dikonfigurasi, lalu mengeksekusi efek di dalam game yang sedang dimainkan streamer secara real-time.

Ekosistem Viewer Merusuh terdiri dari **tiga komponen utama:**

| Komponen | Deskripsi | Status |
|----------|-----------|--------|
| **Server / Electron App** | Core engine — menerima donasi, trigger efek game | Aktif (ada bug) |
| **Client Module** | Agent di PC Gaming terpisah — eksekusi efek AHK/vJoy | Phase 1–2 |
| **RC Module** | Server kontrol RC fisik — viewer sewa RC via donasi | Phase 1–2 |

### Alur Utama (Core)

```
Viewer donasi di Saweria/Trakteer
    ↓
Webhook POST diterima server Express
    ↓
Adapter (saweria.js / trakteer.js) parsing & validasi
    ↓
eventBus.emit('donation', data)
    ↓
effectEngine.js mencocokkan nominal → efek
    ↓
effectEngine.emit('effect', data) → antrian diproses
    ↓
Adapter game dieksekusi:
  • ahk.js     → spawn AutoHotkey script
  • vjoy.js    → virtual gamepad via ViGEmBus
  • plugin     → game plugin polling /api/plugin/pending
  • rc         → (future) trigger RC Module via HTTP/eventBus
    ↓
Socket.io broadcast ke Dashboard + OBS Overlay + Client Agent
    ↓
Notifikasi muncul di OBS, efek aktif di game
```

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Runtime | Node.js v18+ |
| Backend | Express.js + Socket.io |
| Database | SQLite via better-sqlite3 |
| Frontend | React 18 + Vite |
| Desktop | Electron v28 |
| Build | electron-builder v26 |
| Game AHK | AutoHotkey v2 |
| Game Controller | ViGEmBus + vigemclient |
| Game Plugin GTA5 | ScriptHookV .NET (C#) |
| Game Plugin BeamNG | Lua Extension |
| RC Hardware | ESP32 + WebSocket firmware |
| RC Drone | Raspberry Pi + MAVLink / ArduPilot |
| RC Stream | WebRTC (mediasoup) atau HLS (ffmpeg) |

---

## 2. Arsitektur Sistem

### Gambaran Ekosistem Lengkap

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PC STREAM / OBS                             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                ELECTRON APP (main.js)                        │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │           SERVER (server/index.js) — Port 3000        │   │   │
│  │  │  Express + Socket.io                                  │   │   │
│  │  │  effectEngine → eventBus → adapters                  │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  OBS Browser Source — http://localhost:3000/overlay           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────┬─────────────────────────────────────────────────────────┘
          │ LAN / Internet (Socket.io)        │ HTTP / eventBus (Phase 6)
          ▼                                   ▼
┌─────────────────────┐            ┌──────────────────────────────────┐
│     PC GAMING        │            │  RC MODULE SERVER — Port 3001    │
│                     │            │  rc-module/api/server.js         │
│  CLIENT MODULE      │            │  sessionManager, queueManager    │
│  client/src/index.js│            │  adapter (ESP32 / simulator)     │
│  • AHK adapter      │            └──────────────┬───────────────────┘
│  • vJoy adapter     │                           │ WebSocket / WiFi
│  • Plugin proxy     │            ┌──────────────▼───────────────────┐
└─────────────────────┘            │         HARDWARE LAYER           │
                                   │  ESP32 RC + FPV Camera           │
                                   │  Raspberry Pi Drone              │
                                   └──────────────────────────────────┘
```

### Komponen Utama (Core Server)

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON APP (main.js)                   │
│  • Spawn/require server/index.js di main process            │
│  • BrowserWindow menampilkan dashboard (localhost/dashboard) │
│  • Tray icon dengan menu kontekstual                        │
│  • Single instance lock                                     │
│  • Data user di %AppData%\Viewer Merusuh\                   │
└─────────────────┬───────────────────────────────────────────┘
                  │ require()
┌─────────────────▼───────────────────────────────────────────┐
│              SERVER (server/index.js)                       │
│  Express + Socket.io berjalan di PORT (default 3000)        │
│                                                             │
│  Routes:                                                    │
│  • /api/*           → REST API (api.js)                     │
│  • /api/plugin/*    → Plugin game endpoint (plugin.js)      │
│  • /api/env/*       → Env editor (env.js)                   │
│  • /api/testing/*   → Testing area (testing.js)             │
│  • /webhook/saweria → Saweria webhook (saweria.js)          │
│  • /webhook/trakteer→ Trakteer webhook (trakteer.js)        │
│  • /overlay         → Static HTML overlay OBS               │
│  • /dashboard       → Static React build                    │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
┌──────────▼──────────┐  ┌────────▼────────────────────────┐
│   EFFECT ENGINE      │  │      SOCKET.IO EVENTS           │
│  (core/effectEngine) │  │  • donation → semua client      │
│  • Queue sequential  │  │  • effect   → semua client      │
│  • Cooldown tracking │  │  • test_log → dashboard         │
│  • Emit effect event │  │  • config_updated → overlay     │
└──────────┬──────────┘  │  • preset_changed → dashboard   │
           │              └─────────────────────────────────┘
┌──────────▼──────────────────────────────────────────────────┐
│              ADAPTER LAYER                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────────┐ │
│  │  ahk.js  │  │ vjoy.js  │  │  plugin.js (queue)         │ │
│  │ AHK v2   │  │ ViGEmBus │  │  ← polling by game plugin  │ │
│  └──────────┘  └──────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Event Bus

`server/core/eventBus.js` adalah EventEmitter singleton yang menjadi backbone komunikasi internal:

| Event | Dikirim oleh | Diterima oleh |
|-------|-------------|---------------|
| `donation` | saweria.js, trakteer.js, testing.js | effectEngine.js, index.js (→ socket) |
| `effect` | effectEngine.js | ahk.js, vjoy.js, plugin.js, index.js (→ socket) |
| `test_log` | testing.js | index.js (→ socket) |
| `config_updated` | api.js | index.js (→ socket) |
| `preset_changed` | api.js | index.js (→ socket) |

---

## 3. Struktur Folder

```
viewer-merusuh/                      # Root monorepo
│
├── electron/                        # Electron desktop app
│   ├── main.js                      # Main process — server + window + tray
│   ├── preload.js                   # Context bridge (IPC)
│   ├── loading.html                 # Splash screen saat booting
│   └── assets/
│       ├── icon.png                 # App icon 1024x1024
│       ├── icon.ico                 # App icon Windows (multi-size)
│       └── tray-icon.png            # Tray icon 32x32
│
├── server/                          # Backend Node.js — core server
│   ├── index.js                     # Entry point Express + Socket.io
│   ├── core/
│   │   ├── effectEngine.js          # Queue efek, matching donasi → efek
│   │   └── eventBus.js              # EventEmitter singleton
│   ├── adapters/
│   │   ├── saweria.js               # Webhook handler Saweria
│   │   ├── trakteer.js              # Webhook handler Trakteer
│   │   ├── ahk.js                   # AutoHotkey adapter
│   │   └── vjoy.js                  # ViGEm virtual gamepad adapter
│   ├── db/
│   │   ├── database.js              # SQLite singleton getDB()
│   │   └── setup.js                 # Init schema + seed data
│   └── routes/
│       ├── api.js                   # REST API utama (effects, logs, config, ahk)
│       ├── plugin.js                # Plugin game polling endpoint
│       ├── env.js                   # .env editor dari dashboard
│       └── testing.js               # Testing area endpoint
│
├── dashboard/                       # Frontend React (Vite)
│   ├── src/
│   │   ├── main.jsx                 # Entry point React
│   │   ├── App.jsx                  # Root: routing + socket + toast
│   │   ├── index.css                # Design system (CSS vars, utility classes)
│   │   ├── hooks/
│   │   │   ├── useSocket.js         # Socket.io client hook
│   │   │   └── useToast.js          # Toast notification state
│   │   ├── utils/
│   │   │   └── api.js               # Semua fungsi fetch ke server
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Navigasi sidebar dengan logo
│   │   │   ├── SetupWizard.jsx      # Wizard 7 langkah first-time setup
│   │   │   └── ToastContainer.jsx
│   │   └── pages/
│   │       ├── DashboardPage.jsx    # Stat cards + live feed + test panel
│   │       ├── EffectsPage.jsx      # CRUD efek dengan modal form
│   │       ├── TestingPage.jsx      # Simulasi donasi + direct trigger
│   │       ├── OverlayPage.jsx      # Overlay editor + live preview
│   │       ├── LogsPage.jsx         # Log donasi masuk
│   │       ├── AhkPage.jsx          # AHK: game groups, presets, custom keys
│   │       ├── VjoyPage.jsx         # Status ViGEm + test actions
│   │       ├── SecretsPage.jsx      # .env editor UI
│   │       └── ConfigPage.jsx       # General config (overlay, queue, dll)
│   └── vite.config.js
│
├── overlay/
│   └── index.html                   # OBS Browser Source overlay (standalone HTML)
│
├── adapters/
│   └── ahk/
│       ├── lib/
│       │   ├── VM_Lib.ahk           # Shared library (helper functions)
│       │   ├── generic_key.ahk      # Script universal 1 tombol
│       │   ├── generic_combo.ahk    # Script universal kombinasi tombol
│       │   └── global/
│       │       └── volume_mute.ahk
│       └── games/
│           ├── racing/              # brake_force, handbrake, full_throttle, flip_car, slow_motion
│           ├── action/              # horn_spam, explosion_rain, wanted_level_up, ragdoll, super_jump, chaos_mode
│           ├── fps/                 # no_ammo, invert_mouse, random_weapon
│           └── survival/            # drop_item, camera_shake
│
├── plugins/
│   ├── gta5/
│   │   └── ViewerMerusuh.cs         # ScriptHookV .NET plugin (C#)
│   └── beamng/
│       └── viewermerusuh/
│           └── main.lua             # BeamNG Lua extension
│
├── client/                          # ← CLIENT MODULE (terpisah, lihat Bab 11)
│   ├── src/
│   │   ├── index.js                 # Entry point — connect ke server
│   │   ├── core/
│   │   │   ├── connection.js        # Socket.IO ke server + auto-reconnect
│   │   │   └── adapterManager.js    # Router efek ke adapter
│   │   ├── adapters/
│   │   │   ├── ahk.js               # AHK adapter (Step 1 ✅)
│   │   │   ├── vjoy.js              # vJoy adapter (Step 3 🔜)
│   │   │   └── plugin.js            # Plugin proxy (Step 4 🔜)
│   │   └── utils/
│   │       ├── logger.js
│   │       └── config.js
│   ├── adapters/
│   │   └── ahk/                     # Salin dari root adapters/ahk/
│   ├── .env.example
│   └── package.json
│
├── rc-module/                       # ← RC MODULE (terpisah, lihat Bab 12)
│   ├── api/
│   │   ├── server.js                # Entry point — Port 3001
│   │   ├── routes/
│   │   │   ├── rc.js                # CRUD fleet RC
│   │   │   ├── session.js           # Manajemen sesi sewa
│   │   │   └── queue.js             # Antrian viewer
│   │   └── db/
│   │       ├── database.js
│   │       └── setup.js
│   ├── core/
│   │   ├── sessionManager.js        # Assign, timer, release RC
│   │   ├── queueManager.js          # Antrian viewer
│   │   ├── fleetManager.js          # Manajemen armada RC
│   │   └── eventBridge.js           # Jembatan ke Viewer Merusuh
│   ├── adapters/
│   │   ├── rc/
│   │   │   ├── rc-esp32.js          # Adapter RC ESP32
│   │   │   ├── rc-raspi.js          # Adapter RC Raspberry Pi
│   │   │   └── rc-simulator.js      # Simulator dev
│   │   └── drone/
│   │       ├── drone-mavlink.js
│   │       └── drone-simulator.js
│   ├── hardware/
│   │   ├── esp32/
│   │   │   ├── firmware.ino
│   │   │   └── WIRING_GUIDE.md
│   │   └── raspi/
│   │       └── setup.sh
│   ├── web-client/
│   │   ├── controller.html          # Web controller untuk viewer
│   │   └── admin.html               # Dashboard admin fleet
│   └── simulator/
│       └── rc-sim.js
│
├── installer/
│   ├── SETUP.bat
│   ├── START.bat
│   ├── STOP.bat
│   ├── UPDATE.bat
│   ├── README_INSTALL.txt
│   ├── setup.js
│   ├── postinstall.js
│   └── make-release.js
│
├── docs/
│   ├── ADDING_GAMES.md
│   ├── VJOY_GUIDE.md
│   └── BUILD_ELECTRON.md
│
├── electron-builder.config.js
├── build-electron.js
├── package.json
└── .env.example
```

---

## 4. Database Schema

Database: SQLite, file di `viewer-merusuh.db` (dev) atau `%AppData%\Viewer Merusuh\viewer-merusuh.db` (Electron).

### Tabel `effects`

Mapping nominal donasi ke aksi game.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Nama tampil (contoh: "Rem Mendadak") |
| description | TEXT | Deskripsi singkat |
| min_amount | INTEGER | Nominal minimum (Rupiah) |
| max_amount | INTEGER NULL | Nominal maksimum (NULL = tak terbatas) |
| game_target | TEXT | Target game: racing, action, fps, gta5, beamng, dll |
| adapter | TEXT | Adapter: `ahk`, `vjoy`, `plugin` |
| action_key | TEXT | Key yang dikirim ke adapter (contoh: `brake_force`, `custom_key_1`) |
| duration_ms | INTEGER | Durasi efek dalam milidetik |
| is_active | INTEGER | 0/1 — aktif atau tidak |
| cooldown_ms | INTEGER | Cooldown antar trigger (ms) |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |

### Tabel `donation_logs`

Riwayat semua donasi masuk.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | |
| platform | TEXT | saweria, trakteer, test |
| donator_name | TEXT | Nama donatur |
| amount | INTEGER | Nominal dalam Rupiah |
| message | TEXT NULL | Pesan donasi |
| effect_id | INTEGER NULL | FK ke effects.id |
| effect_name | TEXT NULL | Nama efek yang dieksekusi |
| status | TEXT | processed, queued, no_effect, cooldown |
| raw_payload | TEXT | JSON payload asli dari webhook |
| created_at | TEXT | Timestamp |

### Tabel `config`

Key-value store untuk semua konfigurasi app.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| key | TEXT PK | Nama config |
| value | TEXT | Nilai config |
| updated_at | TEXT | Timestamp |

Lihat [Config Keys](#15-config-keys) untuk daftar lengkap.

### Tabel `ahk_game_groups`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | |
| name | TEXT | Kategori: FPS, Racing, Action, dll |
| game_name | TEXT | Nama game spesifik: Valorant, BeamNG, dll |
| icon | TEXT | Emoji icon |
| is_active | INTEGER | 0/1 |
| created_at | TEXT | |

### Tabel `ahk_presets`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | |
| name | TEXT | Nama preset: "Setting Valorant" |
| group_id | INTEGER NULL | FK ke ahk_game_groups.id |
| description | TEXT NULL | |
| is_active | INTEGER | 0/1 — hanya satu yang aktif sekaligus |
| created_at | TEXT | |

### Tabel `ahk_custom_keys`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | |
| name | TEXT | Nama tampil: "Buang Senjata (G)" |
| description | TEXT NULL | |
| key | TEXT | Nama tombol AHK: g, Space, F1, LCtrl, dll |
| modifier | TEXT | Modifier: LCtrl, LShift, LAlt (kosong = tanpa) |
| mode | TEXT | tap, hold, combo |
| repeat | INTEGER | Berapa kali ditekan (mode tap/combo) |
| interval_ms | INTEGER | Jeda antar repeat dalam ms |
| hold_ms | INTEGER | Durasi hold dalam ms (mode hold, 0 = pakai dari efek) |
| category | TEXT | fps, racing, action, survival, mmo, custom |
| is_active | INTEGER | 0/1 |
| created_at | TEXT | |

---

## 5. Backend — Server Node.js

### `server/index.js`

Entry point. Menginisialisasi Express, Socket.io, semua middleware, route, dan adapter.

**Yang dilakukan:**
- Load `.env` via dotenv
- Require `effectEngine.js` dan semua adapter (ahk, vjoy) — ini side-effect yang attach listener ke eventBus
- Mount semua router di path masing-masing
- Serve static files untuk dashboard dan overlay
- Setup Socket.io dan forward event dari eventBus ke semua client
- Start `server.listen()` di PORT yang dikonfigurasi

**Cara server dijalankan dari Electron:**
Saat packaged, `electron/main.js` memanggil `require(server/index.js)` langsung di main process Electron — bukan spawn child process — karena Electron sudah embed Node.js.

### `server/core/effectEngine.js`

Jantung sistem. Menerima event `donation`, mencari efek yang cocok berdasarkan nominal, memasukkan ke antrian, dan memprosesnya.

**Cara kerja queue:**
- Mode **sequential** (default): efek antri satu per satu. 3 donasi dengan efek yang sama = 3 kali efek berjalan berurutan. Tidak ada yang dilewati.
- Mode **parallel**: efek langsung dieksekusi tanpa antrian.

**Matching logic:** Cari efek dengan `is_active=1` dan `min_amount <= nominal <= max_amount`, ambil yang `min_amount` paling besar (efek termahal yang cocok).

### `server/core/eventBus.js`

EventEmitter singleton. Semua modul import ini, tidak ada yang buat instance baru.

### `server/adapters/saweria.js`

Handler webhook Saweria. Validasi signature via HMAC-SHA256 menggunakan `SAWERIA_STREAM_KEY`. Skip validasi jika key tidak di-set (development mode).

**Format payload Saweria:**
```
{ type, donator_name, donator_email, amount_raw, message, ... }
```

### `server/adapters/trakteer.js`

Handler webhook Trakteer. Validasi via header `X-Api-Key` yang dibandingkan dengan `TRAKTEER_API_KEY`.

**Format payload Trakteer:**
```
{ supporter_name, supporter_email, unit_price, quantity, message, ... }
```
Amount dihitung: `unit_price × quantity`.

### `server/adapters/ahk.js`

Bridge antara effectEngine dan AutoHotkey scripts.

**Urutan lookup action_key:**
1. Cek `ACTION_REGISTRY` (script preset yang sudah ada)
2. Cek format `custom_key_{id}` → query DB `ahk_custom_keys`
3. Fallback: anggap action_key adalah nama tombol langsung (mis: `g`)

**Path AHK scripts:**
Saat packaged Electron, path dicari di `resources/app/adapters/ahk/`. Saat dev, di `project_root/adapters/ahk/`.

**Path AutoHotkey.exe:**
Dibaca dari DB config key `AHK_EXE_PATH`, fallback ke env `AHK_EXE_PATH`, fallback ke default install path.

### `server/adapters/vjoy.js`

Virtual gamepad adapter menggunakan `vigemclient` (binding Node.js ke ViGEmBus driver Windows).

**Init:** `initViGEm()` dipanggil saat module di-load. Jika ViGEmBus tidak terinstall atau bukan Windows, adapter berjalan di **simulasi mode** (log only).

**Action yang tersedia:** vjoy_brake, vjoy_throttle, vjoy_steer_left, vjoy_steer_right, vjoy_random_steer, vjoy_handbrake, vjoy_drift_chaos, vjoy_reverse, vjoy_rumble, vjoy_disconnect.

---

## 6. Frontend — Dashboard React

### Routing

Tidak menggunakan react-router. Routing dilakukan via state `page` di `App.jsx`. Navigasi melalui klik di `Sidebar.jsx`.

### `App.jsx`

Root component. Mengelola:
- State `page` (halaman aktif)
- `useSocket()` hook → shared ke semua page via props
- `useToast()` hook → shared ke semua page via props
- `SetupWizard` — muncul otomatis jika `.env` belum ada atau field wajib kosong

### `dashboard/src/utils/api.js`

Satu file berisi semua fungsi fetch ke server. Pattern: `request(method, path, body)`.

**Penting:** Saat development, `BASE = ''` (pakai Vite proxy). Saat production/Electron, URL diambil dari origin yang sama karena dashboard di-serve oleh Express.

### Design System (`index.css`)

CSS Variables yang digunakan:
- `--bg`, `--surface`, `--surface2` — latar belakang bertingkat
- `--primary`, `--primary-h` — warna ungu utama
- `--green`, `--red`, `--amber` — warna status
- `--text`, `--text-2`, `--text-3` — warna teks bertingkat
- `--border`, `--radius`, `--radius-sm` — border & radius

Class utility: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-success`, `.btn-sm`, `.card`, `.input`, `.select`, `.toggle`, `.table`, `.modal`, `.modal-overlay`, `.badge`, `.badge-*`

### `useSocket.js`

Hook yang mengelola koneksi Socket.io client. Expose: `connected`, `lastDonation`, `lastEffect`, `lastTestLog`.

Setiap kali event baru diterima, state di-update dengan tambahan field `_ts: Date.now()` agar komponen downstream bisa detect perubahan via `useEffect([lastEffect])`.

---

## 7. Overlay OBS

**File:** `overlay/index.html` — standalone HTML, tidak ada build step.

**Cara pakai:** Tambahkan sebagai Browser Source di OBS dengan URL `http://localhost:3000/overlay`.

### Dua Komponen Overlay

**1. Notifikasi Donasi**
- Muncul setiap ada event `effect` dari socket
- Posisi, warna, durasi dikonfigurasi dari database (`config` table)
- Auto-hide setelah `notification_duration_ms`
- Maksimal 6 notifikasi tampil bersamaan

**2. Price List**
- Menampilkan daftar efek aktif beserta nominalnya
- Auto-rotate halaman setiap `pricelist_rotate_sec` detik
- Durasi tampil = `halaman × rotate_sec + 20 detik`
- Setelah waktu tampil habis, sembunyi selama `pricelist_hide_after_min` menit
- Siklus tampil-sembunyi berjalan otomatis terus-menerus

**Load socket.io:**
Overlay mencoba load dari server lokal (`/socket.io/socket.io.js`) terlebih dahulu. Jika gagal, fallback ke CDN. Ini penting untuk OBS yang mungkin tidak bisa akses internet.

**Config reload:**
Overlay mendengarkan event `config_updated` dari socket dan melakukan reload config otomatis tanpa perlu refresh.

---

## 8. Adapter Layer

### Sistem AHK (AutoHotkey)

#### Script Preset (ACTION_REGISTRY)

File AHK di `adapters/ahk/games/` dan `adapters/ahk/lib/`. Setiap script menerima argumen:
- `A_Args[1]` = duration_ms
- `A_Args[2]` = extra parameter (opsional)

Helper di `VM_Lib.ahk`:
- `VM_GetDuration(default)` — baca durasi dari arg atau pakai default
- `VM_HoldKey(key, ms)` — tahan tombol selama X ms
- `VM_SpamKey(key, count, intervalMs)` — tekan berulang
- `VM_TypeCheat(string)` — ketik karakter per karakter (untuk cheat GTA)
- `VM_MouseMove(dx, dy)` — gerak mouse relatif
- `VM_Log(msg)` — log ke stdout

#### Script Generic

`lib/generic_key.ahk` — script universal yang menerima nama tombol, durasi hold, repeat, interval sebagai argumen. Satu script untuk semua tombol keyboard tanpa perlu buat file baru.

`lib/generic_combo.ahk` — untuk kombinasi tombol (Ctrl+Z, Shift+G, dll).

#### Custom Keys di Database

Tombol custom disimpan di tabel `ahk_custom_keys`. Action key format: `custom_key_{id}`. Saat efek di-trigger dengan action key ini, adapter membaca detail dari DB dan memanggil generic_key atau generic_combo dengan parameter yang sesuai.

### Plugin System

Plugin untuk game yang support scripting/modding. Cara kerjanya berbeda dari AHK/vJoy — plugin berjalan **di dalam game** dan polling server.

**Alur:**
1. Plugin di game polling `GET /api/plugin/pending?game=gta5` setiap beberapa detik
2. Server mengembalikan daftar efek yang perlu dieksekusi
3. Plugin eksekusi efek menggunakan native game API
4. Plugin lapor selesai ke `POST /api/plugin/done`

**In-memory queue:** `server/routes/plugin.js` mengelola queue per `gameId`. Efek masuk saat `eventBus.on('effect')` dengan `adapter='plugin'`.

**Auto-expire:** Efek yang sudah lebih dari 60 detik di queue (game mungkin crash) otomatis dihapus.

---

## 9. Plugin Native Game

### GTA 5 — `plugins/gta5/ViewerMerusuh.cs`

Framework: ScriptHookV .NET v3 (C#).

**Cara kerja:**
- Script di-load oleh SHVDN saat GTA 5 start
- `OnTick()` dipanggil setiap frame — polling server setiap `POLL_INTERVAL` ms
- Efek masuk ke queue internal, dieksekusi satu per satu
- Notifikasi muncul di HUD game via `GTA.UI.Notification.Show()`

**Konfigurasi di file:**
- `SERVER_URL` — URL server VM (default: `http://localhost:3000`)
- `GAME_ID` — selalu `"gta5"`
- `PLUGIN_SECRET` — harus sama dengan `PLUGIN_SECRET` di `.env`
- `POLL_INTERVAL` — ms antar polling (default: 2000)

**⚠️ Hanya Story Mode** — penggunaan di GTA Online bisa kena ban.

**Efek yang diimplementasi:** wanted level (up/max/clear), explosion (single/rain), vehicle (brake/boost/flip/horn/engine off), character (ragdoll/super jump/drunk/weapon), weather (rain/snow/thunder), time of day, NPC (attack/spawn cop/spawn enemy), chaos mode.

### BeamNG.drive — `plugins/beamng/viewermerusuh/main.lua`

Framework: BeamNG Lua Extension.

**Cara kerja:**
- Extension di-load oleh BeamNG saat game start (manual atau auto-load)
- `M.onUpdate(dt)` dipanggil setiap frame — akumulasi timer untuk polling
- HTTP polling menggunakan `Engine.net.httpGet/httpPost`
- Toast notification via `guihooks.trigger("toastrMsg", ...)`

**Konfigurasi di file:**
- `SERVER_URL` — URL server VM
- `GAME_ID` — selalu `"beamng"`
- `PLUGIN_SECRET` — harus sama dengan `.env`
- `POLL_INTERVAL` — detik antar polling (default: 3)

**Efek yang diimplementasi:** brake, throttle, random_steer, handbrake, engine_off, explosion, slow_motion, vehicle_reset, random_damage, chaos.

---

## 10. Electron App

### `electron/main.js`

**Lifecycle:**
1. `app.whenReady()` → `ensureUserData()` → `ensureDatabase()` → `setupIPC()` → `createWindow()` → `createTray()` → `startServer()`
2. Server di-require langsung (bukan spawn) → `loadDashboard()` setelah server siap
3. Window X button → hide ke tray (tidak quit)
4. Tray → Keluar → `isQuitting = true` → `app.quit()` → `before-quit` cleanup

**Path penting:**
- `ROOT` = `path.join(__dirname, '..')` — bekerja baik saat dev maupun packaged (karena `__dirname` di dalam asar selalu `resources/app/electron/`)
- `USER_DATA` = `app.getPath('userData')` = `%AppData%\Viewer Merusuh\`
- `.env` dan `.db` disimpan di `USER_DATA`, bukan di dalam asar

**IPC handlers:**
- `open-user-data` — buka folder userData di Explorer
- `restart-server` — restart server Express
- `get-app-info` — info versi, port, path

### `electron/preload.js`

Context bridge mengekspos `window.electronAPI` ke renderer (dashboard). Fungsi yang diekspos: `openUserData()`, `restartServer()`, `getAppInfo()`, `isElectron: true`.

### `electron-builder.config.js`

**Files yang di-bundle ke asar:**
- `electron/**/*` — main process files
- `server/**/*` — backend server
- `dashboard/dist/**/*` — React build
- `overlay/**/*` — OBS overlay
- `node_modules/**/*` — semua dependencies

**asarUnpack:** `better-sqlite3` dan bindings-nya di-unpack dari asar karena native `.node` file tidak bisa di-load dari dalam asar.

**extraResources:** Icon files di-copy ke `resources/` agar bisa diakses oleh `resolveIcon()` di main.js.

### `build-electron.js`

Script build satu perintah: `node build-electron.js`

Urutan:
1. Build dashboard React (`npm run build` di `dashboard/`)
2. Validasi `package.json "main" = "electron/main.js"`
3. Siapkan icon files (placeholder jika tidak ada)
4. Install electron devDeps di `electron/` dengan `--ignore-scripts`
5. Auto-detect versi Electron dari `node_modules` → patch `electronVersion` di config
6. Rebuild `better-sqlite3` untuk ABI Electron via `electron-rebuild`
7. Jalankan `electron-builder build --win`

---

## 11. Client Module — PC Gaming Terpisah

> **Lokasi:** `client/`
> **Status:** Step 1 ✅ — koneksi Socket.IO + AHK adapter dasar

### Masalah yang Dipecahkan

Banyak streamer menggunakan setup **2 PC**: PC Stream/OBS menjalankan server Viewer Merusuh, sementara PC Gaming yang menjalankan game perlu AutoHotkey / vJoy untuk efek chaos. Client Module adalah **agent Node.js** yang berjalan di PC Gaming dan menerima perintah efek dari server via Socket.IO.

### Arsitektur Client

```
Server (PC Stream) — emit event 'effect' via Socket.IO
    ↓
client/src/core/connection.js — menerima event
    ↓
client/src/core/adapterManager.js — routing berdasarkan payload.adapter
    ↓
  adapter: 'ahk'  → client/src/adapters/ahk.js → spawn AHK script
  adapter: 'vjoy' → client/src/adapters/vjoy.js → ViGEmBus
  adapter: 'plugin' → client/src/adapters/plugin.js → HTTP proxy lokal
    ↓
Efek berjalan di game di PC Gaming
```

### Cara Kerja Internal

**`connection.js`**

Mengelola koneksi Socket.IO ke server:
- **Auto-reconnect** — exponential backoff (1s → max 30s)
- **Auth payload** — kirim `clientSecret` dan `clientName` saat handshake
- Forward event `effect` ke adapterManager

```javascript
// Event yang didengarkan:
socket.on('connect', ...)
socket.on('disconnect', ...)
socket.on('effect', payload => adapterManager.execute(payload))
socket.on('auth_error', ...)
```

**`adapterManager.js`**

Router yang mendaftarkan adapter dan meneruskan efek berdasarkan `payload.adapter`:

```javascript
manager.register('ahk', ahkAdapter);
manager.register('vjoy', vjoyAdapter);
manager.execute({ adapter: 'ahk', action: 'brake_force', params: {} });
```

### Payload Efek (dari server)

```json
{
  "id": 42,
  "name": "Rem Mendadak",
  "adapter": "ahk",
  "action": "brake_force",
  "params": {},
  "duration_ms": 3000,
  "donation": {
    "amount": 5000,
    "username": "penonton123",
    "message": "gasss rusuh"
  }
}
```

### Konfigurasi Client (`.env`)

```env
# IP dan port PC Server (PC OBS)
# LAN    : http://192.168.1.10:3000
# Internet: https://xxx.ngrok-free.app
SERVER_URL=http://192.168.1.10:3000

# Secret yang sama dengan CLIENT_SECRET di .env server
CLIENT_SECRET=rahasia_yang_panjang_dan_unik

# Nama client (muncul di log server)
CLIENT_NAME=GamePC

# Aktifkan adapter sesuai kebutuhan
ADAPTER_AHK=true
ADAPTER_VJOY=false
ADAPTER_PLUGIN=false

# Path AutoHotkey v2
AHK_EXE_PATH=C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe
```

### Menambah Auth di Server untuk Client

Di `server/index.js`, tambahkan middleware Socket.IO:

```javascript
io.use((socket, next) => {
  const { secret, role } = socket.handshake.auth;
  if (role === 'game-client') {
    if (secret !== process.env.CLIENT_SECRET) {
      return next(new Error('auth_error'));
    }
    socket.clientName = socket.handshake.auth.clientName || 'unknown';
    console.log(`[Client] Game client terhubung: ${socket.clientName}`);
  }
  next();
});
```

Di `.env` server, tambahkan:
```env
CLIENT_SECRET=rahasia_yang_panjang_dan_unik
```

### Adapter Reference

**AHK Adapter (`adapter: "ahk"`)**

Resolusi path script AHK:
| Action | Path yang dicari |
|--------|-----------------|
| `brake_force` | `adapters/ahk/games/racing/brake_force.ahk` |
| `horn_spam` | `adapters/ahk/games/action/horn_spam.ahk` |
| `custom_key_1` | `adapters/ahk/lib/generic_key.ahk` (fallback) |

> **Tips:** Salin folder `adapters/ahk/` dari PC Server ke PC Client agar semua script sama.

**vJoy Adapter (`adapter: "vjoy"`)** — *Step 3 🔜*

Dependency: `npm install vigemclient`

**Plugin Proxy Adapter (`adapter: "plugin"`)** — *Step 4 🔜*

Membuka HTTP server lokal di `PLUGIN_LOCAL_PORT` (default: 3001) sehingga game plugin bisa polling efek langsung dari PC Gaming tanpa melalui jaringan ke PC Server.

### Roadmap Client

| Step | Fitur | Status |
|------|-------|--------|
| Step 1 | Scaffold, koneksi Socket.IO, AHK adapter dasar | ✅ Done |
| Step 2 | AHK adapter lengkap + sinkronisasi folder script dari server | 🔜 |
| Step 3 | vJoy / ViGEmBus adapter | 🔜 |
| Step 4 | Plugin adapter (HTTP proxy lokal untuk GTA5/BeamNG polling) | 🔜 |
| Step 5 | Config UI web lokal + auto-discovery server di LAN | 🔜 |

### Menjalankan Client

```bash
cd client
npm install
npm run setup   # buat .env dari template
# Edit .env: isi SERVER_URL dan CLIENT_SECRET
npm start
```

### Troubleshooting Client

| Masalah | Solusi |
|---------|--------|
| Tidak bisa konek ke server | Pastikan `SERVER_URL` pakai IP, bukan `localhost`. Cek firewall PC Server: `netsh advfirewall firewall add rule name="VM" dir=in action=allow protocol=TCP localport=3000` |
| AHK tidak jalan, tidak ada error | Verifikasi `AHK_EXE_PATH` ke AutoHotkey64.exe v2. Set `LOG_LEVEL=debug` untuk lihat path script yang dicoba |
| `CLIENT_SECRET` berbeda | Generate ulang: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — salin ke `.env` server **dan** client |

---

## 12. RC Module — Kontrol RC via Donasi

> **Lokasi:** `rc-module/`
> **Status:** Phase 1–2 — Fondasi & Simulator (tanpa hardware nyata)
> **Port:** 3001 (terpisah dari server utama di 3000)

### Konsep

RC Module memungkinkan viewer menyewa dan mengontrol RC / drone secara real-time via donasi. Konsep terinspirasi dari streamer China di Douyin/Taobao Live yang menyewakan RC berkamera kepada viewer. Ini menambah dimensi **IRL chaos** di atas chaos game yang sudah ada.

### Alur Sewa RC

```
Viewer donasi Rp X (via Saweria/Trakteer)
    ↓
Viewer Merusuh Server terima webhook → emit 'donation'
    ↓
RC Module cek: nominal memenuhi minimum sewa RC?
    ↓ Ya
Cek fleet: ada RC available?
  ├── Ada  → assign RC ke viewer, mulai timer countdown
  └── Tidak → masukkan ke queue, notify viewer
    ↓
Viewer dapat link controller: http://localhost:3001/controller?token=XXX
    ↓
Viewer kontrol RC via browser (WASD / on-screen joystick)
    ↓
Perintah kontrol → server → adapter → ESP32 via WebSocket / WiFi
    ↓
Kamera RC (FPV) distream ke browser viewer (Phase 4)
    ↓
Timer habis → kontrol dicabut → RC status = Available → queue diproses
```

### Arsitektur RC Module

```
┌─────────────────────────────────────────────────────────────┐
│                 VIEWER MERUSUH SERVER (port 3000)            │
│  eventBus.emit('donation', data)                             │
└─────────────────┬───────────────────────────────────────────┘
                  │ Opsi A: eventBus shared
                  │ Opsi B: HTTP POST ke /webhook/donation
┌─────────────────▼───────────────────────────────────────────┐
│                RC MODULE SERVER (port 3001)                  │
│  rc-module/api/server.js — Express + Socket.IO               │
│                                                              │
│  Routes:                                                     │
│  • /api/rc/*          → REST API fleet RC                    │
│  • /api/session/*     → Manajemen sesi sewa                  │
│  • /api/queue/*       → Antrian viewer                       │
│  • /webhook/donation  → Terima event dari Viewer Merusuh     │
│  • /controller        → Web controller untuk viewer          │
│  • /admin             → Dashboard admin RC                   │
└──────────┬──────────────────────┬────────────────────────────┘
           │                      │
┌──────────▼──────────┐  ┌────────▼────────────────────────┐
│   SESSION MANAGER   │  │      SOCKET.IO EVENTS            │
│  core/sessionMgr.js │  │  • rc_status → semua client      │
│  • Assign RC        │  │  • control_cmd → hardware        │
│  • Timer countdown  │  │  • session_start → viewer        │
│  • Release RC       │  │  • session_end → viewer          │
│  • Queue management │  │  • queue_update → semua          │
└──────────┬──────────┘  └─────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│                   ADAPTER LAYER                              │
│  ┌─────────────────┐   ┌─────────────────┐                  │
│  │  rc-esp32.js    │   │  rc-simulator.js│                  │
│  │  (WiFi WS/UDP)  │   │  (dev only)     │                  │
│  └────────┬────────┘   └─────────────────┘                  │
│           │                                                  │
│  ┌────────▼────────┐                                        │
│  │  drone-mavlink  │                                        │
│  │  (Phase 4)      │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│                 HARDWARE LAYER                               │
│  ┌───────────────┐   ┌───────────────┐                      │
│  │   ESP32 RC    │   │  Drone (FPV)  │                      │
│  │  + FPV cam   │   │  + MAVLink    │                      │
│  └───────────────┘   └───────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Integrasi dengan Viewer Merusuh

**Opsi A — eventBus Shared (Rekomendasi untuk setup 1 PC)**

RC Module berjalan dalam proses yang sama dengan Viewer Merusuh:

```javascript
// Di server/index.js Viewer Merusuh — tambahkan:
const rcModule = require('../rc-module/api/server');
rcModule.init({ eventBus, db, io });

// Di rc-module/api/server.js:
module.exports = {
  init({ eventBus, db, io }) {
    eventBus.on('donation', (data) => {
      sessionManager.handleDonation(data);
    });
  }
};
```

**Opsi B — HTTP POST (Loosely Coupled, untuk setup terpisah)**

RC Module berjalan sebagai server terpisah (port 3001):

```javascript
// Di server/adapters/saweria.js Viewer Merusuh:
await fetch('http://localhost:3001/webhook/donation', {
  method: 'POST',
  body: JSON.stringify(donationData)
});
```

**Opsi C — Standalone (Tanpa Viewer Merusuh)**

RC Module berdiri sendiri sebagai website sewa RC independen, lengkap dengan payment gateway sendiri.

### Database RC Module

RC Module menggunakan SQLite sendiri (terpisah dari DB Viewer Merusuh utama) di `rc-module/api/db/`.

#### Tabel `rc_units`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | |
| name | TEXT | Nama RC: "RC Merah", "Drone 1" |
| type | TEXT | `rc_car`, `drone` |
| adapter | TEXT | `esp32`, `raspi`, `simulator` |
| ip_address | TEXT NULL | IP ESP32 jika via WiFi |
| status | TEXT | `available`, `in_use`, `offline`, `maintenance` |
| created_at | TEXT | |

#### Tabel `rc_sessions`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | |
| rc_id | INTEGER | FK ke rc_units.id |
| viewer_name | TEXT | Nama viewer/donatur |
| viewer_token | TEXT | Token unik untuk akses controller |
| donation_amount | INTEGER | Nominal donasi yang memicu sewa |
| duration_ms | INTEGER | Durasi sewa dalam ms |
| started_at | TEXT | Waktu mulai |
| ends_at | TEXT | Waktu berakhir |
| status | TEXT | `active`, `ended`, `expired` |

#### Tabel `rc_queue`

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | |
| rc_id | INTEGER NULL | RC yang direquest (NULL = any) |
| viewer_name | TEXT | |
| donation_amount | INTEGER | |
| queued_at | TEXT | |
| status | TEXT | `waiting`, `assigned`, `expired` |

### Hardware yang Didukung

**RC Darat**

| Hardware | Protokol | Status |
|----------|----------|--------|
| ESP32 + L298N motor driver | WebSocket (WiFi) | 🔄 Phase 3 |
| Raspberry Pi + motor HAT | SSH / GPIO | ⏳ Phase 3 |
| RC komersial (dengan modifikasi) | UART/PWM | ⏳ Future |

**Drone**

| Hardware | Protokol | Status |
|----------|----------|--------|
| Drone DIY + Raspberry Pi | MAVLink / UDP | ⏳ Phase 4 |
| DJI Tello | SDK HTTP | ⏳ Future |

**Kamera FPV**

| Hardware | Metode Stream | Status |
|----------|--------------|--------|
| ESP32-CAM | MJPEG over HTTP | ⏳ Phase 4 |
| USB Webcam | WebRTC via mediasoup | ⏳ Phase 4 |
| IP Camera | HLS/RTSP via ffmpeg | ⏳ Phase 4 |

### Roadmap RC Module

```
Phase 1 ✅  Fondasi & Dokumentasi
Phase 2 🔄  Simulator (tanpa hardware nyata)
Phase 3 ⏳  Hardware Integration (ESP32)
Phase 4 ⏳  Kamera Streaming (FPV)
Phase 5 ⏳  Multi-RC & Queue System
Phase 6 ⏳  Integrasi penuh ke Viewer Merusuh
```

**Phase 2 (Sekarang):**
- Web controller UI (WASD + on-screen joystick)
- Simulasi RC di browser (kotak bergerak)
- Session timer real-time
- Queue list viewer

**Phase 3 (Hardware ESP32):**
- Firmware ESP32 (menerima perintah via WebSocket)
- Adapter `rc-esp32.js` di server
- Test kontrol RC nyata via browser

**Phase 4 (Kamera FPV):**
- Stream kamera RC ke browser (WebRTC / HLS)
- Overlay kamera di web controller
- Integrasi ke OBS sebagai scene

### Menjalankan RC Module (Simulator)

```bash
cd rc-module
npm install
npm run simulator

# Web controller: http://localhost:3001/controller
# Admin dashboard: http://localhost:3001/admin
```

### Socket.IO Events RC Module

| Event | Arah | Payload | Keterangan |
|-------|------|---------|-----------|
| `rc_status` | Server → All | `{ rc_id, status }` | Status RC berubah |
| `control_cmd` | Viewer → Server | `{ token, cmd, value }` | Perintah kontrol |
| `session_start` | Server → Viewer | `{ token, rc_id, duration_ms }` | Sesi dimulai |
| `session_end` | Server → Viewer | `{ token, reason }` | Sesi berakhir |
| `session_timer` | Server → Viewer | `{ token, remaining_ms }` | Update countdown |
| `queue_update` | Server → All | `{ position, total }` | Posisi antrian berubah |

### REST API RC Module

Base URL: `http://localhost:3001`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/rc` | Daftar semua RC unit + status |
| POST | `/api/rc` | Tambah RC baru ke fleet |
| PUT | `/api/rc/:id` | Update RC (nama, IP, status) |
| DELETE | `/api/rc/:id` | Hapus RC dari fleet |
| GET | `/api/session/active` | Semua sesi aktif |
| GET | `/api/session/:token` | Detail sesi berdasarkan token |
| POST | `/api/session/end/:token` | Force end sesi (admin) |
| GET | `/api/queue` | Daftar antrian saat ini |
| DELETE | `/api/queue/:id` | Hapus dari antrian |
| POST | `/webhook/donation` | Terima event donasi dari Viewer Merusuh |

---

## 13. REST API Reference

Base URL: `http://localhost:{PORT}` (default port 3000, server utama)

### Effects

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/effects` | Semua efek, diurutkan min_amount ASC |
| GET | `/api/effects/:id` | Detail satu efek |
| POST | `/api/effects` | Buat efek baru |
| PUT | `/api/effects/:id` | Update efek (partial update via COALESCE) |
| DELETE | `/api/effects/:id` | Hapus efek |
| POST | `/api/effects/:id/toggle` | Toggle is_active 0↔1 |

### Logs

| Method | Endpoint | Query Params | Deskripsi |
|--------|----------|-------------|-----------|
| GET | `/api/logs` | `platform`, `limit`, `offset` | Log donasi dengan pagination |

### Config

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/config` | Semua config sebagai object key-value |
| PUT | `/api/config` | Update satu atau banyak config sekaligus |

### Status & Queue

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/status` | Health check + statistik |
| GET | `/api/queue` | Info antrian efek saat ini |

### Actions

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/actions` | Semua action dari semua adapter (ahk + vjoy + plugin + custom keys) |
| GET | `/api/ahk/actions` | Hanya AHK preset actions |
| GET | `/api/vjoy/actions` | Hanya vJoy actions |

### AHK Custom Keys

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/ahk/custom-keys` | Semua custom keys |
| POST | `/api/ahk/custom-keys` | Buat custom key baru |
| PUT | `/api/ahk/custom-keys/:id` | Update custom key |
| DELETE | `/api/ahk/custom-keys/:id` | Hapus custom key |
| POST | `/api/ahk/test-key` | Test eksekusi key langsung |

### AHK Game Groups

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/ahk/groups` | Semua game groups |
| POST | `/api/ahk/groups` | Buat group baru |
| PUT | `/api/ahk/groups/:id` | Update group |
| DELETE | `/api/ahk/groups/:id` | Hapus group |

### AHK Presets

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/ahk/presets` | Semua presets dengan info group |
| POST | `/api/ahk/presets` | Buat preset baru |
| PUT | `/api/ahk/presets/:id` | Update preset |
| DELETE | `/api/ahk/presets/:id` | Hapus preset |
| POST | `/api/ahk/presets/:id/activate` | Aktifkan preset (nonaktifkan lainnya) |

### Plugin Game

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/plugin/pending?game=gta5` | Poll efek pending untuk game |
| POST | `/api/plugin/done` | Lapor efek selesai dieksekusi |
| GET | `/api/plugin/status?game=gta5` | Status koneksi plugin |
| GET | `/api/plugin/queues` | Info semua plugin queue |

### Testing (Development only)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/testing/donate` | Simulasi donasi |
| POST | `/api/testing/trigger` | Trigger efek langsung by ID |
| GET | `/api/testing/preview?amount=10000` | Preview efek yang cocok (tanpa trigger) |
| GET | `/api/testing/logs` | Log aktivitas testing |
| DELETE | `/api/testing/logs` | Clear test logs |
| GET | `/api/testing/platforms` | Daftar platform donasi dan status konfigurasinya |

### Env Editor

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/env` | Baca .env (secrets di-mask) + schema |
| PUT | `/api/env` | Tulis .env |
| GET | `/api/env/status` | Cek apakah field wajib sudah terisi |
| POST | `/api/env/generate-secret` | Generate random 64-char hex secret |

### Webhook (Incoming)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/webhook/saweria` | Terima donasi Saweria |
| POST | `/webhook/trakteer` | Terima donasi Trakteer |

---

## 14. Socket.io Events

### Server → Client (broadcast ke semua)

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `donation` | `{ platform, donatorName, amount, message }` | Donasi masuk |
| `effect` | `{ id, name, actionKey, durationMs, donation }` | Efek di-trigger |
| `test_log` | `{ type, platform, donatorName, amount, ... }` | Log testing baru |
| `config_updated` | `{}` | Config berubah (overlay reload) |
| `preset_changed` | `{ id }` | Preset aktif berganti |

### Client → Server

Tidak ada event dari client ke server. Semua aksi melalui REST API.

> Lihat juga: **Socket.IO Events RC Module** di [Bab 12](#12-rc-module--kontrol-rc-via-donasi).

---

## 15. Config Keys

Semua disimpan di tabel `config`. Diakses via `GET /api/config` dan diubah via `PUT /api/config`.

### General

| Key | Default | Keterangan |
|-----|---------|-----------|
| `min_donation_amount` | `1000` | Donasi di bawah ini diabaikan |
| `queue_mode` | `sequential` | `sequential` atau `parallel` |
| `notification_duration_ms` | `5000` | Durasi notif overlay (ms) |
| `AHK_EXE_PATH` | path default | Path ke AutoHotkey.exe |

### Overlay — Notifikasi

| Key | Default | Keterangan |
|-----|---------|-----------|
| `notif_position` | `bottom-right` | `top-left`, `top-right`, `bottom-left`, `bottom-right` |
| `notif_bg` | `#0d0f14` | Warna background notifikasi |
| `notif_bg_opacity` | `0.92` | Opacity background (0.0–1.0) |
| `notif_border` | `#7c3aed` | Warna garis kiri aksen |
| `notif_text` | `#ffffff` | Warna teks nama donatur |
| `notif_amount_color` | `#86efac` | Warna teks nominal |
| `notif_effect_color` | `#fbbf24` | Warna teks nama efek |

### Overlay — Price List

| Key | Default | Keterangan |
|-----|---------|-----------|
| `pricelist_show` | `true` | Tampilkan/sembunyikan price list |
| `pricelist_position` | `top-right` | Posisi price list |
| `pricelist_title` | `Viewer Merusuh` | Judul |
| `pricelist_subtitle` | `List Harga Merusuh` | Sub-judul |
| `pricelist_title_color` | `#ffffff` | Warna judul |
| `pricelist_badge_bg` | `#000000` | Background badge harga |
| `pricelist_badge_text` | `#ffffff` | Teks badge harga |
| `pricelist_label_bg` | `#1e2330` | Background label nama efek |
| `pricelist_label_text` | `#ffffff` | Teks nama efek |
| `pricelist_items_per_page` | `5` | Efek per halaman |
| `pricelist_rotate_sec` | `10` | Jeda rotasi (5–30 detik) |
| `pricelist_hide_after_min` | `5` | Waktu sembunyi (1–15 menit) |
| `pricelist_nav_color` | `#7c3aed` | Warna titik navigasi |

---

## 16. Panduan Menambah Fitur

### A. Menambah Platform Donasi Baru

1. **Buat** `server/adapters/nama_platform.js` — validasi auth, parse payload ke format standar `{ platform, donatorName, amount, message, rawPayload }`, emit ke eventBus.
2. **Ubah** `server/index.js` — import handler, tambah route `/webhook/nama_platform`.
3. **Ubah** `server/routes/env.js` — tambah field API key di `ENV_SCHEMA`.
4. **Ubah** `server/routes/testing.js` — tambah platform ke `GET /api/testing/platforms`.
5. **Ubah** `dashboard/src/pages/SecretsPage.jsx` — tambah section UI.
6. **Ubah** `dashboard/src/pages/TestingPage.jsx` — tambah ikon platform ke `PLATFORM_ICONS`.

### B. Menambah Script AHK Baru

1. **Buat** `adapters/ahk/games/{kategori}/{nama_efek}.ahk` — wajib `#Requires AutoHotkey v2.0` dan `#Include "../../lib/VM_Lib.ahk"`, baca durasi via `VM_GetDuration(default_ms)`.
2. **Ubah** `server/adapters/ahk.js` — tambah entry di `ACTION_REGISTRY`: `'nama_action_key': 'games/kategori/nama_efek.ahk'`.
3. Tambah efek baru via dashboard UI atau `POST /api/effects`.

> **Untuk Client Module:** Salin juga file `.ahk` yang sama ke folder `client/adapters/ahk/games/`.

### C. Menambah vJoy Action Baru

1. **Ubah** `server/adapters/vjoy.js` — tambah fungsi handler async + entry di `ACTION_REGISTRY`.
2. **Ubah** `dashboard/src/pages/VjoyPage.jsx` — tambah entry di array `ACTIONS`.

### D. Menambah Efek ke Plugin GTA 5

1. **Ubah** `plugins/gta5/ViewerMerusuh.cs` — tambah `case "gta5_nama_efek":` di `ExecuteEffect()`.
2. **Ubah** `server/routes/api.js` — tambah entry di array `pluginActions`.

### E. Menambah Efek ke Plugin BeamNG

1. **Ubah** `plugins/beamng/viewermerusuh/main.lua` — tambah `effectHandlers["beamng_nama_efek"] = function(effect) ... end`.
2. **Ubah** `server/routes/api.js` — tambah entry di `pluginActions`.

### F. Menambah Halaman Dashboard Baru

1. **Buat** `dashboard/src/pages/NamaPage.jsx` — export default function, terima props `toast`.
2. **Ubah** `dashboard/src/components/Sidebar.jsx` — tambah entry di array `NAV`.
3. **Ubah** `dashboard/src/App.jsx` — import + tambah ke object `content`.
4. **Ubah** `dashboard/src/utils/api.js` — tambah fungsi fetch yang diperlukan.

### G. Menambah Config Key Baru

1. **Ubah** `server/db/setup.js` — tambah `seedConfig.run('key_baru', 'default_value')`.
2. **Ubah** `overlay/index.html` — tambah ke objek `CFG` default.
3. **Ubah** `dashboard/src/pages/ConfigPage.jsx` atau `OverlayPage.jsx` — tambah UI.
4. Jalankan `node server/db/setup.js` untuk menambah ke DB yang sudah ada.

### H. Menambah Kolom Tabel DB

1. **Ubah** `server/db/setup.js` — tambah kolom di `CREATE TABLE IF NOT EXISTS`.
2. **Penting:** Kolom baru hanya otomatis ada di DB baru. Untuk DB yang sudah ada, tambahkan migration:
   ```sql
   ALTER TABLE nama_tabel ADD COLUMN nama_kolom TYPE DEFAULT nilai;
   ```
   Atau tambahkan migration script yang mengecek apakah kolom sudah ada sebelum ALTER.

### I. Menambah RC ke Fleet (RC Module)

1. Jalankan RC Module server: `cd rc-module && npm start`
2. Buka admin dashboard: `http://localhost:3001/admin`
3. Tambah RC unit baru: `POST /api/rc` dengan `{ name, type, adapter, ip_address }`
4. Untuk hardware ESP32: upload firmware dari `rc-module/hardware/esp32/firmware.ino`
5. Pastikan `ip_address` di record RC sama dengan IP ESP32 di jaringan WiFi

### J. Menambah Jenis Hardware RC Baru

1. **Buat** `rc-module/adapters/rc/rc-nama.js` — implementasi interface: `connect()`, `sendCommand(cmd)`, `disconnect()`
2. **Ubah** `rc-module/core/fleetManager.js` — daftarkan adapter baru
3. **Ubah** `rc-module/api/db/setup.js` — tambah nilai baru ke enum `adapter` di tabel `rc_units`

---

## 17. Panduan Fix Bug

### Kategori Bug — Core Server

#### Bug: Donasi tidak terdeteksi / webhook tidak masuk

**File terkait:** `server/adapters/saweria.js` atau `server/adapters/trakteer.js`, `server/index.js`

**Yang perlu dicek:**
- Apakah URL webhook di Saweria/Trakteer sudah benar
- Apakah `SAWERIA_STREAM_KEY` / `TRAKTEER_API_KEY` sudah diisi
- Log server untuk pesan validasi signature
- Apakah server bisa diakses dari internet (butuh ngrok jika lokal)

---

#### Bug: Efek tidak berjalan setelah donasi terdeteksi

**File terkait:** `server/core/effectEngine.js`, `server/adapters/ahk.js`, `server/adapters/vjoy.js`

**Yang perlu dicek:**
- Apakah ada efek aktif yang cocok untuk nominal donasi tersebut
- Log `[EffectEngine]` dan `[AHK]` / `[vJoy]` di console server
- Apakah AutoHotkey terinstall dan path benar di config
- Apakah game dalam mode windowed/borderless (bukan fullscreen eksklusif)
- Mode queue: sequential atau parallel

---

#### Bug: Dashboard tidak bisa diakses / blank

**File terkait:** `server/index.js`, `electron/main.js`, `dashboard/dist/`

**Yang perlu dicek:**
- Apakah `npm run build` sudah dijalankan (dashboard/dist harus ada)
- Log Electron di `%AppData%\Viewer Merusuh\app.log`
- `ROOT` path di main.js apakah mengarah ke folder yang benar
- Apakah server benar-benar listen di port yang digunakan

---

#### Bug: Overlay OBS tidak tampil / blank

**File terkait:** `overlay/index.html`, `server/index.js`

**Yang perlu dicek:**
- Buka `http://localhost:3000/overlay` di browser biasa dulu
- Pastikan socket.io berhasil di-load (cek console browser)
- Setting OBS: "Shutdown source when not visible" harus OFF
- Path `APP_ROOT` di `server/index.js` untuk serving overlay

---

#### Bug: Error `no such table` saat setup database

**File terkait:** `server/db/setup.js`

**Root cause:** Seed data dijalankan sebelum tabel dibuat. Pastikan urutan di `setup.js` adalah: `db.exec()` (buat semua tabel) → baru seed data.

---

#### Bug: `better-sqlite3` error (MODULE_VERSION mismatch)

```bash
npm uninstall better-sqlite3
npm install better-sqlite3
```

Jika masih error, butuh Visual C++ Build Tools untuk compile native module.

---

#### Bug: Icon/tray tidak muncul di Electron packaged

**File terkait:** `electron/main.js` (fungsi `resolveIcon()`), `electron-builder.config.js` (`extraResources`)

**Yang perlu dicek:**
- Apakah icon files ada di `electron/assets/`
- Apakah `extraResources` di config sudah meng-copy icon ke `resources/`
- Log `[Icon found/not found]` di app.log

---

#### Bug: `process.exit` saat running dari Electron

**File terkait:** `server/index.js`, `server/db/setup.js`

**Fix:** Semua `process.exit()` di server harus dilindungi dengan pengecekan `if (!process.env.ELECTRON)`.

---

#### Bug: Testing endpoint "hanya tersedia di development mode"

**File terkait:** `server/routes/testing.js`, `server/routes/api.js`

**Fix:** Kondisi yang benar adalah `if (process.env.NODE_ENV === 'production' && !process.env.ELECTRON)`. Saat dijalankan dari Electron, `process.env.ELECTRON = '1'` sudah di-set di `electron/main.js`.

---

#### Bug: Path `.env` error "ENOENT in app.asar"

**File terkait:** `server/routes/env.js`, `electron/main.js`

**Root cause:** `.env` tidak bisa dibaca/ditulis dari dalam asar (read-only). Harus menggunakan `process.env.ENV_PATH` yang di-set oleh Electron ke path `%AppData%\Viewer Merusuh\.env`.

---

### Kategori Bug — Client Module

#### Bug: Client tidak bisa konek ke server

**File terkait:** `client/src/core/connection.js`, `client/.env`

**Yang perlu dicek:**
- `SERVER_URL` harus pakai IP, bukan `localhost` (contoh: `http://192.168.1.10:3000`)
- Coba `ping <IP_SERVER>` dari PC Client
- Firewall PC Server harus mengizinkan port 3000 (TCP in)
- Jika beda jaringan: gunakan ngrok atau Cloudflare Tunnel di PC Server

---

#### Bug: Efek diterima di log client tapi AHK tidak jalan

**File terkait:** `client/src/adapters/ahk.js`, `client/.env`

**Yang perlu dicek:**
- `AHK_EXE_PATH` harus path ke AutoHotkey64.exe versi 2 (bukan versi 1)
- Pastikan script `.ahk` ada di folder `client/adapters/ahk/games/` (salin dari server)
- Set `LOG_LEVEL=debug` di `.env` untuk lihat path script yang dicoba
- Coba jalankan script AHK manual dari Command Prompt

---

#### Bug: `auth_error` — client ditolak server

**File terkait:** `client/.env`, `server/.env` atau `server/index.js`

**Yang perlu dicek:**
- `CLIENT_SECRET` di `client/.env` harus sama persis dengan `CLIENT_SECRET` di server `.env`
- Pastikan middleware auth Socket.IO sudah ditambahkan di `server/index.js`
- Generate ulang secret jika perlu

---

### Kategori Bug — RC Module

#### Bug: RC Module tidak bisa konek ke ESP32

**File terkait:** `rc-module/adapters/rc/rc-esp32.js`

**Yang perlu dicek:**
- IP address ESP32 di `rc_units.ip_address` harus benar dan reachable
- ESP32 dan server harus di jaringan WiFi yang sama
- Coba `ping <IP_ESP32>` dari PC server
- Cek serial monitor ESP32 untuk log koneksi WebSocket
- Firmware ESP32 harus sudah di-flash dari `rc-module/hardware/esp32/firmware.ino`

---

#### Bug: Donasi masuk tapi sesi RC tidak dimulai

**File terkait:** `rc-module/core/sessionManager.js`, `rc-module/api/server.js`

**Yang perlu dicek:**
- Apakah integrasi dengan Viewer Merusuh sudah benar (Opsi A atau B)
- Apakah nominal donasi memenuhi minimum sewa RC
- Apakah ada RC unit berstatus `available` di fleet
- Log `[SessionManager]` di console RC Module server

---

## 18. Roadmap & Ide Pengembangan

### Core Server — Prioritas Tinggi

- **Auto-update Electron** — implementasi `electron-updater` untuk update otomatis dari GitHub Releases
- **Cooldown per efek yang berfungsi** — kolom `cooldown_ms` ada di DB tapi belum diimplementasi di effectEngine
- **Migration system** — untuk ALTER TABLE saat update versi agar user tidak perlu hapus DB
- **Statistik donasi** — grafik donasi per hari/minggu, total per platform, efek paling sering ditrigger

### Core Server — Bisa Dikembangkan

- **Adapter Saweria TTS** — trigger text-to-speech saat donasi masuk
- **Adapter Streamlabs/StreamElements** — platform donasi internasional
- **Integrasi TikTok Live** — TikTok gift sebagai trigger
- **Plugin Minecraft** — Fabric/Forge mod
- **Efek kustom berbasis voting** — viewer vote efek yang mau dijalankan
- **Antrian visual di overlay** — tampilkan berapa efek sedang mengantri
- **Webhook outgoing** — notifikasi ke Discord/Telegram saat ada donasi
- **Multi-streamer mode** — satu server untuk beberapa streamer dengan room terpisah

### Client Module — Next Steps

- **Step 2:** AHK adapter lengkap + tool sinkronisasi script dari server via HTTP
- **Step 3:** vJoy / ViGEmBus adapter (`npm install vigemclient`)
- **Step 4:** Plugin proxy adapter — HTTP server lokal untuk polling dari game
- **Step 5:** Web UI lokal (status koneksi, log efek, toggle adapter, auto-discovery LAN)

### RC Module — Next Steps

- **Phase 2:** Web controller UI (WASD + joystick) + simulasi browser + session timer
- **Phase 3:** Firmware ESP32 + adapter `rc-esp32.js` + test hardware nyata
- **Phase 4:** Streaming FPV (WebRTC via mediasoup atau HLS via ffmpeg)
- **Phase 5:** Multi-RC fleet dashboard + queue otomatis
- **Phase 6:** Integrasi penuh ke Viewer Merusuh + overlay OBS siapa yang kontrol RC

### Teknis / Refactor

- **Test suite** — unit test untuk effectEngine dan adapter matching logic
- **TypeScript** — migrasi server ke TypeScript untuk type safety
- **Docker support** — untuk deployment di VPS/server
- **Prisma ORM** — ganti better-sqlite3 raw queries dengan ORM

---

## Catatan Penting untuk Developer

### Environment Variables

| Variable | Keterangan | Diset oleh |
|----------|-----------|------------|
| `PORT` | Port server utama (default 3000) | `.env` |
| `NODE_ENV` | `development` atau `production` | `.env` atau Electron |
| `DB_PATH` | Path absolut ke file SQLite | `electron/main.js` |
| `ENV_PATH` | Path absolut ke file `.env` | `electron/main.js` |
| `ELECTRON` | Bernilai `'1'` saat dijalankan dari Electron | `electron/main.js` |
| `SAWERIA_STREAM_KEY` | Key untuk validasi webhook | `.env` |
| `TRAKTEER_API_KEY` | Key untuk validasi webhook | `.env` |
| `AHK_EXE_PATH` | Path ke AutoHotkey.exe | `.env` |
| `PLUGIN_SECRET` | Secret untuk autentikasi plugin game | `.env` |
| `CLIENT_SECRET` | Secret untuk autentikasi Client Module | `.env` |
| `RC_MODULE_PORT` | Port RC Module (default 3001) | `rc-module/.env` |

### Perbedaan Dev vs Production

| Aspek | Development | Production (Electron) |
|-------|-------------|----------------------|
| Server start | `npm run dev` (nodemon) | `require('server/index.js')` di main.js |
| DB path | `./viewer-merusuh.db` | `%AppData%\Viewer Merusuh\viewer-merusuh.db` |
| `.env` path | `./.env` | `%AppData%\Viewer Merusuh\.env` |
| Dashboard | Vite dev server port+1 | Static files via Express `/dashboard` |
| Testing endpoint | Aktif | Aktif (karena `ELECTRON=1`) |
| NODE_ENV | `development` | `development` (default, bisa diubah user) |

### Port yang Digunakan

| Service | Port | Keterangan |
|---------|------|-----------|
| Server utama (Viewer Merusuh) | 3000 | Express + Socket.IO |
| RC Module server | 3001 | Express + Socket.IO (terpisah) |
| Client plugin proxy (lokal) | 3001* | HTTP server di PC Gaming |
| Vite dev server (dashboard) | 3001* | Hanya saat `npm run dev` |

> *Jika Client Module dan RC Module dijalankan di PC yang sama, pastikan port tidak bentrok.

### Konvensi Koding

- **API response format:** `{ success: true, data: ... }` atau `{ success: false, error: '...' }`
- **Action key format:** snake_case — contoh: `brake_force`, `custom_key_1`, `vjoy_brake`, `rc_forward`
- **Adapter names (core):** `ahk`, `vjoy`, `plugin`
- **Adapter names (RC):** `esp32`, `raspi`, `simulator`, `drone_mavlink`
- **Game targets:** `racing`, `action`, `fps`, `survival`, `global`, `gta5`, `beamng`
- **Config keys:** snake_case — contoh: `pricelist_show`, `notif_border`

---

*Dokumentasi ini terakhir diperbarui: v0.2.0 — mencakup Client Module (Phase 1) dan RC Module (Phase 1–2)*
*GitHub: https://github.com/noobiiefun/Viewer-Merusuh*
