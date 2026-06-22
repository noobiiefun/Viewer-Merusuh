# Viewer Merusuh — Dokumentasi Developer

> **Tagline:** Penonton Bayar, Game Kacau.
> Platform interaktif open-source untuk livestreamer — viewer bisa merusuh saat streaming game via donasi.

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
11. [REST API Reference](#11-rest-api-reference)
12. [Socket.io Events](#12-socketio-events)
13. [Config Keys](#13-config-keys)
14. [Panduan Menambah Fitur](#14-panduan-menambah-fitur)
15. [Panduan Fix Bug](#15-panduan-fix-bug)
16. [Roadmap & Ide Pengembangan](#16-roadmap--ide-pengembangan)

---

## 1. Gambaran Umum

Viewer Merusuh adalah alternatif open-source dari **Crowd Control** yang bebas platform donasi dan bebas platform streaming. Saat viewer mengirim donasi melalui Saweria atau Trakteer, server mendeteksi donasi tersebut, mencocokkan nominalnya dengan efek yang telah dikonfigurasi, lalu mengeksekusi efek di dalam game yang sedang dimainkan streamer secara real-time.

### Alur Utama

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
    ↓
Socket.io broadcast ke Dashboard + OBS Overlay
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

---

## 2. Arsitektur Sistem

### Komponen Utama

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
┌──────────▼──────────────────────────────────────────┐
│              ADAPTER LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │  ahk.js  │  │ vjoy.js  │  │  plugin.js (queue) │ │
│  │ AHK v2   │  │ ViGEmBus │  │  ← polling by game │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────┘
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
viewer-merusuh/
│
├── electron/                    # Electron desktop app
│   ├── main.js                  # Main process — server + window + tray
│   ├── preload.js               # Context bridge (IPC)
│   ├── loading.html             # Splash screen saat booting
│   └── assets/
│       ├── icon.png             # App icon 1024x1024
│       ├── icon.ico             # App icon Windows (multi-size)
│       └── tray-icon.png        # Tray icon 32x32
│
├── server/                      # Backend Node.js
│   ├── index.js                 # Entry point Express + Socket.io
│   ├── core/
│   │   ├── effectEngine.js      # Queue efek, matching donasi → efek
│   │   └── eventBus.js          # EventEmitter singleton
│   ├── adapters/
│   │   ├── saweria.js           # Webhook handler Saweria
│   │   ├── trakteer.js          # Webhook handler Trakteer
│   │   ├── ahk.js               # AutoHotkey adapter
│   │   └── vjoy.js              # ViGEm virtual gamepad adapter
│   ├── db/
│   │   ├── database.js          # SQLite singleton getDB()
│   │   └── setup.js             # Init schema + seed data
│   └── routes/
│       ├── api.js               # REST API utama (effects, logs, config, ahk)
│       ├── plugin.js            # Plugin game polling endpoint
│       ├── env.js               # .env editor dari dashboard
│       └── testing.js           # Testing area endpoint
│
├── dashboard/                   # Frontend React (Vite)
│   ├── src/
│   │   ├── main.jsx             # Entry point React
│   │   ├── App.jsx              # Root: routing + socket + toast
│   │   ├── index.css            # Design system (CSS vars, utility classes)
│   │   ├── hooks/
│   │   │   ├── useSocket.js     # Socket.io client hook
│   │   │   └── useToast.js      # Toast notification state
│   │   ├── utils/
│   │   │   └── api.js           # Semua fungsi fetch ke server
│   │   ├── components/
│   │   │   ├── Sidebar.jsx      # Navigasi sidebar dengan logo
│   │   │   ├── SetupWizard.jsx  # Wizard 7 langkah first-time setup
│   │   │   └── ToastContainer.jsx
│   │   └── pages/
│   │       ├── DashboardPage.jsx  # Stat cards + live feed + test panel
│   │       ├── EffectsPage.jsx    # CRUD efek dengan modal form
│   │       ├── TestingPage.jsx    # Simulasi donasi + direct trigger
│   │       ├── OverlayPage.jsx    # Overlay editor + live preview
│   │       ├── LogsPage.jsx       # Log donasi masuk
│   │       ├── AhkPage.jsx        # AHK: game groups, presets, custom keys
│   │       ├── VjoyPage.jsx       # Status ViGEm + test actions
│   │       ├── SecretsPage.jsx    # .env editor UI
│   │       └── ConfigPage.jsx     # General config (overlay, queue, dll)
│   └── vite.config.js
│
├── overlay/
│   └── index.html               # OBS Browser Source overlay (standalone HTML)
│
├── adapters/
│   └── ahk/
│       ├── lib/
│       │   ├── VM_Lib.ahk         # Shared library (helper functions)
│       │   ├── generic_key.ahk    # Script universal 1 tombol
│       │   ├── generic_combo.ahk  # Script universal kombinasi tombol
│       │   └── global/
│       │       └── volume_mute.ahk
│       └── games/
│           ├── racing/            # brake_force, handbrake, full_throttle, flip_car, slow_motion
│           ├── action/            # horn_spam, explosion_rain, wanted_level_up, ragdoll, super_jump, chaos_mode
│           ├── fps/               # no_ammo, invert_mouse, random_weapon
│           └── survival/          # drop_item, camera_shake
│
├── plugins/
│   ├── gta5/
│   │   └── ViewerMerusuh.cs     # ScriptHookV .NET plugin (C#)
│   └── beamng/
│       └── viewermerusuh/
│           └── main.lua         # BeamNG Lua extension
│
├── installer/
│   ├── SETUP.bat                # First-time setup Windows
│   ├── START.bat                # Jalankan server
│   ├── STOP.bat                 # Matikan server
│   ├── UPDATE.bat               # Update dari GitHub
│   ├── README_INSTALL.txt       # Instruksi user
│   ├── setup.js                 # Setup script Node.js
│   ├── postinstall.js           # Auto-run setelah npm install
│   └── make-release.js          # Build ZIP release
│
├── docs/
│   ├── ADDING_GAMES.md          # Panduan tambah game baru (AHK)
│   ├── VJOY_GUIDE.md            # Panduan vJoy/ViGEm
│   └── BUILD_ELECTRON.md        # Panduan build .exe
│
├── electron-builder.config.js   # Konfigurasi electron-builder
├── build-electron.js            # Script build .exe
├── package.json                 # Root package.json
└── .env.example                 # Template konfigurasi
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

Lihat [Config Keys](#13-config-keys) untuk daftar lengkap.

### Tabel `ahk_game_groups`

Daftar game yang dikategorikan.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | |
| name | TEXT | Kategori: FPS, Racing, Action, dll |
| game_name | TEXT | Nama game spesifik: Valorant, BeamNG, dll |
| icon | TEXT | Emoji icon |
| is_active | INTEGER | 0/1 |
| created_at | TEXT | |

### Tabel `ahk_presets`

Setting bernama yang bisa diaktifkan per sesi streaming.

| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | INTEGER PK | |
| name | TEXT | Nama preset: "Setting Valorant" |
| group_id | INTEGER NULL | FK ke ahk_game_groups.id |
| description | TEXT NULL | |
| is_active | INTEGER | 0/1 — hanya satu yang aktif sekaligus |
| created_at | TEXT | |

### Tabel `ahk_custom_keys`

Tombol keyboard custom yang bisa dipilih sebagai action_key di efek.

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

## 11. REST API Reference

Base URL: `http://localhost:{PORT}`

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

### Actions (untuk dropdown di dashboard)

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

## 12. Socket.io Events

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

---

## 13. Config Keys

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

## 14. Panduan Menambah Fitur

### A. Menambah Platform Donasi Baru

**File yang perlu dibuat/diubah:**

1. **Buat** `server/adapters/nama_platform.js`
   - Fungsi: validasi auth (header/signature), parse payload ke format standar `{ platform, donatorName, amount, message, rawPayload }`
   - Emit ke eventBus: `eventBus.emit('donation', donation)`

2. **Ubah** `server/index.js`
   - Import handler baru
   - Tambah route: `app.post('/webhook/nama_platform', handlerFunction)`

3. **Ubah** `server/routes/env.js`
   - Tambah field baru di `ENV_SCHEMA` untuk API key platform

4. **Ubah** `server/routes/testing.js`
   - Tambah platform baru ke response `GET /api/testing/platforms`

5. **Ubah** `dashboard/src/pages/SecretsPage.jsx` (opsional)
   - Tambah section UI untuk platform baru

6. **Ubah** `dashboard/src/pages/TestingPage.jsx`
   - Tambah ikon platform baru ke `PLATFORM_ICONS`

### B. Menambah Script AHK Baru (Efek Game Preset)

**File yang perlu dibuat/diubah:**

1. **Buat** `adapters/ahk/games/{kategori}/{nama_efek}.ahk`
   - Wajib: `#Requires AutoHotkey v2.0` dan `#Include "../../lib/VM_Lib.ahk"`
   - Baca durasi via `VM_GetDuration(default_ms)`

2. **Ubah** `server/adapters/ahk.js`
   - Tambah entry di `ACTION_REGISTRY`: `'nama_action_key': 'games/kategori/nama_efek.ahk'`

3. Tambah efek baru via dashboard UI atau `POST /api/effects` dengan action_key yang baru didaftarkan.

### C. Menambah vJoy Action Baru

**File yang perlu diubah:**

1. **Ubah** `server/adapters/vjoy.js`
   - Tambah fungsi handler async baru
   - Tambah entry di `ACTION_REGISTRY`

2. **Ubah** `dashboard/src/pages/VjoyPage.jsx`
   - Tambah entry di array `ACTIONS` untuk UI test panel

### D. Menambah Efek ke Plugin GTA 5

**File yang perlu diubah:**

1. **Ubah** `plugins/gta5/ViewerMerusuh.cs`
   - Tambah `case "gta5_nama_efek":` di switch statement `ExecuteEffect()`
   - Implementasi menggunakan SHVDN API

2. **Ubah** `server/routes/api.js`
   - Tambah entry di array `pluginActions` dalam handler `GET /api/actions`

### E. Menambah Efek ke Plugin BeamNG

**File yang perlu diubah:**

1. **Ubah** `plugins/beamng/viewermerusuh/main.lua`
   - Tambah handler baru di tabel `effectHandlers`: `effectHandlers["beamng_nama_efek"] = function(effect) ... end`

2. **Ubah** `server/routes/api.js`
   - Tambah entry di array `pluginActions`

### F. Menambah Halaman Dashboard Baru

**File yang perlu dibuat/diubah:**

1. **Buat** `dashboard/src/pages/NamaPage.jsx`
   - Export default function, terima props `toast` (dan `lastEffect` jika butuh realtime)

2. **Ubah** `dashboard/src/components/Sidebar.jsx`
   - Tambah entry di array `NAV`: `{ id: 'nama', icon: '🆕', label: 'Nama Menu' }`

3. **Ubah** `dashboard/src/App.jsx`
   - Import halaman baru
   - Tambah ke object `content`: `nama: <NamaPage toast={toast} />`

4. **Ubah** `dashboard/src/utils/api.js`
   - Tambah fungsi fetch yang diperlukan

### G. Menambah Config Key Baru

1. **Ubah** `server/db/setup.js` — tambah `seedConfig.run('key_baru', 'default_value')`
2. **Ubah** `overlay/index.html` — tambah ke objek `CFG` default dan baca dari config response
3. **Ubah** `dashboard/src/pages/ConfigPage.jsx` atau `OverlayPage.jsx` — tambah UI untuk mengubah config
4. Jalankan `node server/db/setup.js` untuk menambah ke DB yang sudah ada (INSERT OR IGNORE tidak akan hapus data lama)

### H. Menambah Kolom Tabel DB

1. **Ubah** `server/db/setup.js` — tambah kolom di `CREATE TABLE IF NOT EXISTS`
2. **Penting:** Kolom baru hanya otomatis ada di DB baru. Untuk DB yang sudah ada, perlu migration manual:
   ```sql
   ALTER TABLE nama_tabel ADD COLUMN nama_kolom TYPE DEFAULT nilai;
   ```
   Atau tambahkan migration script yang mengecek apakah kolom sudah ada sebelum ALTER.

---

## 15. Panduan Fix Bug

Saat melaporkan atau memperbaiki bug, sertakan informasi berikut dan file terkait:

### Kategori Bug dan File Terkait

#### Bug: Donasi tidak terdeteksi / webhook tidak masuk

**File terkait:**
- `server/adapters/saweria.js` atau `server/adapters/trakteer.js`
- `server/index.js` (route webhook)

**Yang perlu dicek:**
- Apakah URL webhook di Saweria/Trakteer sudah benar
- Apakah `SAWERIA_STREAM_KEY` / `TRAKTEER_API_KEY` sudah diisi
- Log server untuk pesan validasi signature
- Apakah server bisa diakses dari internet (butuh ngrok jika lokal)

---

#### Bug: Efek tidak berjalan setelah donasi terdeteksi

**File terkait:**
- `server/core/effectEngine.js` — matching dan queue logic
- `server/adapters/ahk.js` — eksekusi AHK
- `server/adapters/vjoy.js` — eksekusi vJoy

**Yang perlu dicek:**
- Apakah ada efek aktif yang cocok untuk nominal donasi tersebut
- Log `[EffectEngine]` dan `[AHK]` / `[vJoy]` di console server
- Apakah AutoHotkey terinstall dan path benar di config
- Apakah game dalam mode windowed/borderless (bukan fullscreen eksklusif)
- Mode queue: sequential atau parallel

---

#### Bug: Dashboard tidak bisa diakses / blank

**File terkait:**
- `server/index.js` — static file serving
- `electron/main.js` — `loadDashboard()` dan `startServer()`
- `dashboard/dist/` — hasil build React (harus ada)

**Yang perlu dicek:**
- Apakah `npm run build` sudah dijalankan (dashboard/dist harus ada)
- Log Electron di `%AppData%\Viewer Merusuh\app.log`
- `ROOT` path di main.js apakah mengarah ke folder yang benar
- Apakah server benar-benar listen di port yang digunakan

---

#### Bug: Overlay OBS tidak tampil / blank

**File terkait:**
- `overlay/index.html` — standalone HTML
- `server/index.js` — static serving path overlay

**Yang perlu dicek:**
- Buka `http://localhost:3000/overlay` di browser biasa dulu
- Pastikan socket.io berhasil di-load (cek console browser)
- Setting OBS: "Shutdown source when not visible" harus OFF
- Path `APP_ROOT` di `server/index.js` untuk serving overlay

---

#### Bug: Error `no such table` saat setup database

**File terkait:**
- `server/db/setup.js`

**Root cause:** Seed data dijalankan sebelum tabel dibuat. Pastikan urutan di `setup.js` adalah: `db.exec()` (buat semua tabel) → baru seed data.

---

#### Bug: `better-sqlite3` error (MODULE_VERSION mismatch)

**File terkait:**
- `package.json` (versi better-sqlite3)

**Fix:**
```bash
npm uninstall better-sqlite3
npm install better-sqlite3
```
Jika masih error, butuh Visual C++ Build Tools untuk compile native module.

---

#### Bug: Icon/tray tidak muncul di Electron packaged

**File terkait:**
- `electron/main.js` — fungsi `resolveIcon()`
- `electron-builder.config.js` — `extraResources` section

**Yang perlu dicek:**
- Apakah icon files ada di `electron/assets/`
- Apakah `extraResources` di config sudah meng-copy icon ke `resources/`
- Log `[Icon found/not found]` di app.log

---

#### Bug: `process.exit` saat running dari Electron

**File terkait:**
- `server/index.js` — error handler port
- `server/db/setup.js` — akhir fungsi setup

**Fix:** Semua `process.exit()` di server harus dilindungi dengan pengecekan `if (!process.env.ELECTRON)`.

---

#### Bug: Testing endpoint "hanya tersedia di development mode"

**File terkait:**
- `server/routes/testing.js`
- `server/routes/api.js`

**Fix:** Kondisi yang benar adalah `if (process.env.NODE_ENV === 'production' && !process.env.ELECTRON)`. Saat dijalankan dari Electron, `process.env.ELECTRON = '1'` sudah di-set di `electron/main.js`.

---

#### Bug: Path `.env` error "ENOENT in app.asar"

**File terkait:**
- `server/routes/env.js`
- `electron/main.js`

**Root cause:** `.env` tidak bisa dibaca/ditulis dari dalam asar (read-only). Harus menggunakan `process.env.ENV_PATH` yang di-set oleh Electron ke path `%AppData%\Viewer Merusuh\.env`.

---

## 16. Roadmap & Ide Pengembangan

### Fitur yang Belum Ada (Prioritas Tinggi)

- **Auto-update Electron** — implementasi `electron-updater` untuk update otomatis dari GitHub Releases
- **Adapter Streamlabs/StreamElements** — platform donasi internasional
- **Ko-fi / Trakteer Stars** — platform donasi alternatif
- **Cooldown per efek yang berfungsi** — saat ini kolom `cooldown_ms` ada di DB tapi belum diimplementasi di effectEngine
- **Statistik donasi** — grafik donasi per hari/minggu, total per platform, efek yang paling sering ditrigger

### Fitur yang Bisa Dikembangkan

- **Multi-streamer mode** — satu server untuk beberapa streamer dengan room terpisah
- **Efek kustom berbasis voting** — viewer vote efek yang mau dijalankan
- **Integrasi TikTok Live** — TikTok gift sebagai trigger
- **Plugin Minecraft** — Fabric/Forge mod
- **Plugin Roblox** — via HTTP request dari dalam Roblox
- **Antrian visual di overlay** — tampilkan berapa efek yang sedang mengantri
- **Sound effect saat efek aktif** — play audio di PC streamer
- **Webhook outgoing** — notifikasi ke Discord/Telegram saat ada donasi
- **API key management** — system key per streamer untuk fitur multi-user

### Teknis / Refactor

- **Migration system** — untuk ALTER TABLE saat update versi, agar user tidak perlu hapus DB
- **Test suite** — unit test untuk effectEngine dan adapter matching logic
- **TypeScript** — migrasi server ke TypeScript untuk type safety
- **Prisma ORM** — ganti better-sqlite3 raw queries dengan ORM
- **Docker support** — untuk deployment di VPS/server

---

## Catatan Penting untuk Developer

### Environment Variables

| Variable | Keterangan | Diset oleh |
|----------|-----------|------------|
| `PORT` | Port server | `.env` |
| `NODE_ENV` | `development` atau `production` | `.env` atau Electron |
| `DB_PATH` | Path absolut ke file SQLite | `electron/main.js` |
| `ENV_PATH` | Path absolut ke file `.env` | `electron/main.js` |
| `ELECTRON` | Bernilai `'1'` saat dijalankan dari Electron | `electron/main.js` |
| `SAWERIA_STREAM_KEY` | Key untuk validasi webhook | `.env` |
| `TRAKTEER_API_KEY` | Key untuk validasi webhook | `.env` |
| `AHK_EXE_PATH` | Path ke AutoHotkey.exe | `.env` |
| `PLUGIN_SECRET` | Secret untuk autentikasi plugin game | `.env` |

### Perbedaan Dev vs Production

| Aspek | Development | Production (Electron) |
|-------|-------------|----------------------|
| Server start | `npm run dev` (nodemon) | `require('server/index.js')` di main.js |
| DB path | `./viewer-merusuh.db` | `%AppData%\Viewer Merusuh\viewer-merusuh.db` |
| `.env` path | `./env` | `%AppData%\Viewer Merusuh\.env` |
| Dashboard | Vite dev server port+1 | Static files via Express `/dashboard` |
| Testing endpoint | Aktif | Aktif (karena `ELECTRON=1`) |
| NODE_ENV | `development` | `development` (default, bisa diubah user) |

### Konvensi Koding

- **API response format:** `{ success: true, data: ... }` atau `{ success: false, error: '...' }`
- **Action key format:** snake_case, contoh: `brake_force`, `custom_key_1`, `vjoy_brake`
- **Adapter names:** `ahk`, `vjoy`, `plugin`
- **Game targets:** `racing`, `action`, `fps`, `survival`, `global`, `gta5`, `beamng`
- **Config keys:** snake_case, contoh: `pricelist_show`, `notif_border`

---

*Dokumentasi ini terakhir diperbarui untuk Viewer Merusuh v1.0.0*
*GitHub: https://github.com/noobiiefun/Viewer-Merusuh*
