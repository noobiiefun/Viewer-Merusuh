# Viewer Merusuh — CLIENT

> Modul terpisah untuk menjalankan efek game di **PC Gaming** yang berbeda dari PC Server/OBS.

---

## Daftar Isi

1. [Konsep & Arsitektur](#1-konsep--arsitektur)
2. [Prasyarat](#2-prasyarat)
3. [Instalasi](#3-instalasi)
4. [Konfigurasi](#4-konfigurasi)
5. [Struktur Folder](#5-struktur-folder)
6. [Cara Kerja Internal](#6-cara-kerja-internal)
7. [Adapter Reference](#7-adapter-reference)
8. [Web Dashboard](#8-web-dashboard)
9. [Integrasi dengan Server](#9-integrasi-dengan-server)
10. [FAQ & Troubleshooting](#10-faq--troubleshooting)

---

## 1. Konsep & Arsitektur

### Masalah yang Dipecahkan

Banyak streamer menggunakan **setup 2 PC**:
- **PC Stream / OBS** — menjalankan OBS, menerima webhook donasi, overlay
- **PC Gaming** — menjalankan game, perlu AutoHotkey / vJoy untuk efek chaos

Viewer Merusuh server berjalan di PC OBS. Agar efek bisa dieksekusi di PC Gaming, dibutuhkan **client agent** yang:
1. Terhubung ke server via jaringan LAN atau internet
2. Menerima perintah efek secara real-time
3. Mengeksekusi efek di PC Gaming (AutoHotkey, vJoy, plugin game)

### Diagram Arsitektur

```
[ VIEWER/DONATOR ]
       │
       │ Donasi via Saweria/Trakteer
       ▼
┌─────────────────────────────────┐
│       PC STREAM / OBS           │
│                                 │
│  ┌──────────────────────────┐   │
│  │  Viewer Merusuh SERVER   │   │
│  │  (Express + Socket.IO)   │   │
│  │                          │   │
│  │  • Terima webhook donasi │   │
│  │  • Cocokkan efek         │   │
│  │  • Emit event 'effect'   │   │
│  └────────────┬─────────────┘   │
│               │                 │
│  ┌────────────▼─────────────┐   │
│  │  OBS Browser Source      │   │
│  │  (Overlay notifikasi)    │   │
│  └──────────────────────────┘   │
└────────────────┬────────────────┘
                 │
         LAN / Internet
         Socket.IO connection
                 │
┌────────────────▼────────────────┐
│       PC GAMING                 │
│                                 │
│  ┌──────────────────────────┐   │
│  │  Viewer Merusuh CLIENT   │◄──┘
│  │  (modul ini)             │
│  │                          │
│  │  • Terima event 'effect' │
│  │  • Route ke adapter      │
│  └──┬────────┬──────────────┘
│     │        │
│  ┌──▼──┐  ┌──▼──────┐  ┌────────────┐
│  │ AHK │  │  vJoy   │  │ Game Plugin│
│  │     │  │ ViGEmBus│  │ (polling)  │
│  └──┬──┘  └──┬──────┘  └────────────┘
│     │        │
│  ┌──▼────────▼──────────────────────┐
│  │           GAME                   │
│  └──────────────────────────────────┘
└─────────────────────────────────────┘
```

### Alur Data

```
Server emit event 'effect' via Socket.IO
    ↓
connection.js menerima event
    ↓
adapterManager.execute(payload)
    ↓
Pilih adapter sesuai payload.adapter
    ↓
adapter.execute({ action, params })
    ↓
Efek berjalan di game
```

---

## 2. Prasyarat

### PC Gaming (tempat client berjalan)

| Kebutuhan | Versi | Keterangan |
|-----------|-------|------------|
| Node.js | v18+ | Runtime JavaScript |
| AutoHotkey | v2.x | Untuk efek keyboard/mouse (adapter AHK) |
| ViGEmBus | latest | Untuk efek virtual gamepad (adapter vJoy, opsional) |

> Download ViGEmBus: https://github.com/nefarius/ViGEmBus/releases

### Jaringan

- PC Gaming dan PC Server harus terhubung ke **jaringan yang sama** (LAN/WiFi) untuk koneksi lokal
- Untuk koneksi via **internet**: server harus memiliki IP publik atau menggunakan ngrok/Cloudflare Tunnel

---

## 3. Instalasi

```bash
# Masuk ke folder client
cd viewer-merusuh/client

# Install dependencies
npm install

# Setup .env pertama kali
npm run setup
```

Output `npm run setup`:
```
✅  File .env berhasil dibuat dari .env.example

📝  Langkah selanjutnya:
   1. Buka file .env
   2. Isi SERVER_URL dengan IP PC Server (PC OBS)
   3. Isi CLIENT_SECRET dengan nilai yang sama seperti di server
   4. Sesuaikan adapter yang ingin diaktifkan
   5. Jalankan: npm start

🌐  Web Dashboard tersedia di: http://localhost:3002
```

### Menjalankan Client

```bash
# Production
npm start

# Development (auto-restart saat file berubah)
npm run dev
```

### Install Adapter vJoy (opsional)

Jika ingin menggunakan adapter vJoy/ViGEmBus:

```bash
# 1. Install ViGEmBus driver dulu (restart PC setelah install)
#    https://github.com/nefarius/ViGEmBus/releases

# 2. Install npm package
npm install vigemclient

# 3. Aktifkan di .env
#    ADAPTER_VJOY=true
```

---

## 4. Konfigurasi

Edit file `.env` (dibuat otomatis oleh `npm run setup`):

```env
# ── Koneksi Server ─────────────────────────────────────
# IP dan port PC Server (PC OBS)
# LAN    : http://192.168.1.10:3000
# Internet: https://xxxxx.ngrok.io
SERVER_URL=http://192.168.1.10:3000

# Secret yang sama dengan CLIENT_SECRET di .env server
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CLIENT_SECRET=rahasia_yang_panjang_dan_unik

# Nama client (muncul di log server)
CLIENT_NAME=GamePC

# ── Adapter Toggle ──────────────────────────────────────
ADAPTER_AHK=true       # AutoHotkey (keyboard/mouse emulation)
ADAPTER_VJOY=false     # vJoy/ViGEmBus (virtual gamepad)
ADAPTER_PLUGIN=false   # Plugin proxy (GTA5/BeamNG polling)

# ── AHK Config ─────────────────────────────────────────
AHK_EXE_PATH=C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe

# ── vJoy Config ────────────────────────────────────────
VJOY_CONTROLLER_TYPE=DS4   # DS4 (saat ini hanya DS4 yang didukung)

# ── Plugin Config ──────────────────────────────────────
PLUGIN_LOCAL_PORT=3001     # Port HTTP server lokal untuk game plugin
PLUGIN_TOKEN=              # Token auth (kosong = tanpa auth)
PLUGIN_EFFECT_TTL=30000    # Efek kadaluarsa setelah N ms (default: 30 detik)

# ── Dashboard ───────────────────────────────────────────
DASHBOARD_ENABLED=true     # Web UI di http://localhost:3002
DASHBOARD_PORT=3002

# ── Logging ────────────────────────────────────────────
LOG_LEVEL=info             # error | warn | info | debug
```

### Menemukan IP PC Server

Di PC Server (Windows), buka Command Prompt:
```cmd
ipconfig
```
Cari **IPv4 Address** di adapter Ethernet atau Wi-Fi. Contoh: `192.168.1.10`

---

## 5. Struktur Folder

```
client/
│
├── src/
│   ├── index.js                  # Entry point utama
│   │
│   ├── core/
│   │   ├── connection.js         # Koneksi Socket.IO ke server
│   │   ├── adapterManager.js     # Router efek ke adapter
│   │   ├── dashboard.js          # Web dashboard HTTP server + SSE
│   │   ├── discovery.js          # LAN auto-discovery (UDP broadcast)
│   │   └── eventBus.js           # Event emitter internal antar modul
│   │
│   ├── adapters/
│   │   ├── ahk.js               # AutoHotkey adapter ✅
│   │   ├── vjoy.js              # vJoy/ViGEm adapter ✅
│   │   └── plugin.js            # Game plugin adapter ✅
│   │
│   └── utils/
│       ├── logger.js            # Logger dengan color-coding
│       └── config.js            # Config loader + validator
│
├── adapters/
│   └── ahk/                     # Folder script AHK
│       ├── lib/
│       │   └── generic_key.ahk  # Fallback script
│       └── games/               # Script per kategori game
│           ├── racing/          # brake_force, flip_car, horn_spam
│           ├── action/          # random_keys
│           ├── fps/             # invert_mouse, spin
│           └── misc/            # screenshot
│
├── plugin-examples/             # Contoh game plugin siap pakai
│   ├── gta5/viewer_merusuh.lua
│   ├── beamng/viewer_merusuh.lua
│   └── generic/poller.py
│
├── scripts/
│   ├── setup.js                 # Setup .env pertama kali
│   ├── test-vjoy.js             # CLI test adapter vJoy
│   └── test-plugin.js           # CLI test adapter plugin
│
├── docs/                        # (folder ini bisa dihapus)
├── .env                         # Config (jangan di-commit!)
├── .env.example                 # Template config
├── .gitignore
└── package.json
```

---

## 6. Cara Kerja Internal

### connection.js

Mengelola koneksi Socket.IO ke server:
- **Auto-reconnect** — exponential backoff (1s → max 30s)
- **Auth payload** — mengirim `clientSecret` dan `clientName` saat handshake
- **Event listener** — meneruskan event `effect` ke AdapterManager dan EventBus

```javascript
socket.on('connect', ...)
socket.on('disconnect', ...)
socket.on('effect', payload => adapterManager.execute(payload))
socket.on('auth_error', ...)
```

### adapterManager.js

Router yang mendaftarkan adapter dan meneruskan efek ke adapter yang sesuai:

```javascript
manager.register('ahk', ahkAdapter);
manager.register('vjoy', vjoyAdapter);
manager.register('plugin', pluginAdapter);

manager.execute({ adapter: 'ahk', action: 'brake_force', params: {} });
```

### eventBus.js

Event emitter internal — menghubungkan modul tanpa coupling langsung:

| Event | Dikirim oleh | Diterima oleh |
|-------|-------------|---------------|
| `conn:status` | `connection.js` | `dashboard.js` → SSE |
| `effect` | `connection.js` | `dashboard.js` → SSE |
| `adapter:status` | `adapterManager.js` | `dashboard.js` → SSE |
| `log` | `logger.js` | `dashboard.js` → SSE |

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

---

## 7. Adapter Reference

### AHK Adapter (`adapter: "ahk"`)

Menjalankan script AutoHotkey v2 berdasarkan `action`.

**Resolusi path script (urutan prioritas):**
```
adapters/ahk/games/racing/<action>.ahk
adapters/ahk/games/action/<action>.ahk
adapters/ahk/games/fps/<action>.ahk
adapters/ahk/games/misc/<action>.ahk
adapters/ahk/lib/<action>.ahk
adapters/ahk/lib/generic_key.ahk   ← fallback terakhir
```

**Script bawaan:**

| Action | Path | Keterangan |
|--------|------|------------|
| `brake_force` | `games/racing/brake_force.ahk` | Tekan rem mendadak |
| `flip_car` | `games/racing/flip_car.ahk` | Putar stir kiri-kanan |
| `horn_spam` | `games/racing/horn_spam.ahk` | Spam klakson |
| `random_keys` | `games/action/random_keys.ahk` | Tekan tombol random |
| `invert_mouse` | `games/fps/invert_mouse.ahk` | Inversi gerakan mouse |
| `spin` | `games/fps/spin.ahk` | Putar mouse 360° |
| `screenshot` | `games/misc/screenshot.ahk` | Ambil screenshot |

**Cara menambah script AHK baru:**
1. Buat file di folder yang sesuai: `adapters/ahk/games/racing/flip_car.ahk`
2. Script otomatis dipilih saat action `flip_car` diterima dari server

Script menerima `params` sebagai argumen JSON:
```ahk
; Di dalam script AHK:
if A_Args.Length > 0 {
    raw := A_Args[1]   ; berisi JSON string dari params
    if RegExMatch(raw, '"duration_ms"\s*:\s*(\d+)', &m)
        duration := Integer(m[1])
}
```

> 💡 **Tips:** Salin folder `adapters/ahk/` dari PC Server ke PC Client agar semua script sama.

---

### vJoy Adapter (`adapter: "vjoy"`)

Mengontrol virtual gamepad DS4 via ViGEmBus.

**Prasyarat:**
- ViGEmBus driver terinstall
- `npm install vigemclient`
- `ADAPTER_VJOY=true` di `.env`

**Action yang tersedia:**

| Action | Params | Keterangan |
|--------|--------|------------|
| `press_button` | `button`, `duration_ms` | Tekan tombol lalu lepas |
| `hold_button` | `button`, `duration_ms` | Tahan tombol |
| `spam_button` | `button`, `count`, `interval_ms` | Toggle tombol berkali-kali |
| `tilt_left_stick` | `x`, `y`, `duration_ms` | Miringkan left stick |
| `tilt_right_stick` | `x`, `y`, `duration_ms` | Miringkan right stick |
| `spin_left_stick` | `duration_ms`, `radius` | Putar left stick 360° |
| `press_trigger` | `side`, `value`, `duration_ms` | Tekan trigger L2/R2 |
| `spam_trigger` | `side`, `count`, `interval_ms` | Spam trigger naik-turun |
| `chaos_input` | `duration_ms` | Input random selama durasi |
| `full_release` | — | Reset semua input ke netral |

**Nama tombol:**

| Tombol | Alias |
|--------|-------|
| `CROSS` | `X`, `A` |
| `CIRCLE` | `O`, `B` |
| `SQUARE`, `TRIANGLE` | — |
| `L1`, `R1`, `L2`, `R2`, `L3`, `R3` | — |
| `DPAD_UP` | `UP` |
| `DPAD_DOWN` | `DOWN` |
| `DPAD_LEFT` | `LEFT` |
| `DPAD_RIGHT` | `RIGHT` |
| `OPTIONS` | `START` |
| `SHARE` | `SELECT` |
| `PS` | — |

**Nilai stick:** `x`/`y` range `-1.0` (kiri/atas) ~ `1.0` (kanan/bawah), `0` = center
**Nilai trigger:** `value` range `0.0` ~ `1.0`

**Test dari CLI:**
```bash
node scripts/test-vjoy.js press_button '{"button":"CROSS","duration_ms":300}'
node scripts/test-vjoy.js spam_button '{"button":"R1","count":10}'
node scripts/test-vjoy.js tilt_left_stick '{"x":0,"y":1,"duration_ms":2000}'
node scripts/test-vjoy.js spin_left_stick '{"duration_ms":3000}'
node scripts/test-vjoy.js chaos_input '{"duration_ms":5000}'
node scripts/test-vjoy.js full_release
node scripts/test-vjoy.js   # tampilkan semua action
```

---

### Plugin Adapter (`adapter: "plugin"`)

Membuka HTTP server lokal di port `3001` sehingga game plugin (Lua/Python/C#) bisa polling efek dan mengeksekusinya di dalam game.

**Alur:**
```
VM Server → [Socket.IO] → VM Client → plugin.js (simpan ke queue)
                                              ↑
Game Plugin → GET /api/plugin/pending ────────┘
Game Plugin → eksekusi efek di game
Game Plugin → POST /api/plugin/complete/:id
```

**Aktivasi:**
```env
ADAPTER_PLUGIN=true
PLUGIN_LOCAL_PORT=3001
PLUGIN_TOKEN=              # kosong = tanpa auth
PLUGIN_EFFECT_TTL=30000   # kadaluarsa setelah 30 detik
```

**API Endpoint** (hanya dari `127.0.0.1`):

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/plugin/pending` | Ambil efek antrian, tandai `sent` |
| `POST` | `/api/plugin/complete/:id` | Konfirmasi efek selesai |
| `GET` | `/api/plugin/status` | Status server + jumlah queue |
| `GET` | `/api/plugin/queue` | Debug — lihat isi queue |
| `POST` | `/api/plugin/clear` | Kosongkan queue (panic button) |

**Response `/api/plugin/pending`:**
```json
{
  "effects": [
    {
      "id": "eff_1720000000_1",
      "action": "flip_car",
      "params": {},
      "duration_ms": 3000,
      "donation": { "username": "penonton123", "amount": 5000 }
    }
  ]
}
```

**Auth (opsional):** Jika `PLUGIN_TOKEN` diisi, tambahkan header:
```
Authorization: Bearer <token>
```

**Contoh plugin siap pakai** (di folder `plugin-examples/`):
- `gta5/viewer_merusuh.lua` — ScriptHookV + Lua
- `beamng/viewer_merusuh.lua` — BeamNG Extension
- `generic/poller.py` — Python template untuk game apapun

**Test dari CLI:**
```bash
node scripts/test-plugin.js start                          # server + 3 efek demo
node scripts/test-plugin.js send flip_car '{"x":1}'       # kirim 1 efek
node scripts/test-plugin.js poll                          # poll manual
node scripts/test-plugin.js status                        # cek status
node scripts/test-plugin.js clear                         # kosongkan queue
```

---

## 8. Web Dashboard

Dashboard web aktif secara default di `http://localhost:3002` setelah `npm start`.

**Fitur:**
- Status koneksi real-time (connected / disconnected / reconnecting)
- Log efek masuk real-time lengkap dengan nama donor + nominal
- Toggle adapter on/off tanpa restart
- Scan server di LAN (UDP auto-discovery)
- Console log client langsung di browser
- Statistik efek diterima + uptime koneksi

**Konfigurasi:**
```env
DASHBOARD_ENABLED=true   # false untuk nonaktifkan
DASHBOARD_PORT=3002      # ganti jika port konflik
```

**API Dashboard** (digunakan UI secara internal):
```
GET  /api/events         ← SSE stream real-time
GET  /api/state          ← Snapshot state (load awal)
GET  /api/discover       ← Trigger LAN scan
POST /api/set-server     ← Simpan SERVER_URL baru ke .env
POST /api/adapter/:name  ← Toggle adapter { enabled: true/false }
```

### Auto-Discovery LAN

Tombol **"Scan Server di LAN"** mengirim UDP broadcast ke subnet (port 47777).
Server yang aktif akan merespons dengan URL-nya.

Agar discovery bekerja, tambahkan ini ke `server/index.js` di **PC Server**:

```javascript
const dgram = require('dgram');
const udp   = dgram.createSocket({ type: 'udp4', reuseAddr: true });

udp.on('message', (msg, rinfo) => {
  if (msg.toString() === 'VM_DISCOVER') {
    const reply = Buffer.from(JSON.stringify({
      vm_server: true,
      name:    process.env.SERVER_NAME || 'Viewer Merusuh Server',
      url:     `http://${rinfo.address}:${process.env.PORT || 3000}`,
      version: require('./package.json').version,
    }));
    udp.send(reply, rinfo.port, rinfo.address);
  }
});

udp.bind(47777, () => {
  udp.setBroadcast(true);
  console.log('[Discovery] UDP listener aktif di port 47777');
});
```

> Jika server belum ada listener ini, isi `SERVER_URL` di `.env` secara manual.

---

## 9. Integrasi dengan Server

### Menambahkan CLIENT_SECRET di Server

Di `.env` PC Server:
```env
CLIENT_SECRET=rahasia_yang_panjang_dan_unik
```

Di `server/index.js`, tambahkan guard Socket.IO:

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

### Contoh Konfigurasi Efek di Server

```json
[
  {
    "name": "Rem Mendadak",
    "adapter": "ahk",
    "action": "brake_force",
    "params": { "duration_ms": 3000 },
    "duration_ms": 3000,
    "min_donation": 2000
  },
  {
    "name": "Stir Putar",
    "adapter": "vjoy",
    "action": "spin_left_stick",
    "params": { "duration_ms": 3000 },
    "duration_ms": 3000,
    "min_donation": 5000
  },
  {
    "name": "Balik Mobil (GTA5)",
    "adapter": "plugin",
    "action": "flip_car",
    "params": {},
    "duration_ms": 3000,
    "min_donation": 5000
  },
  {
    "name": "Chaos Total",
    "adapter": "vjoy",
    "action": "chaos_input",
    "params": { "duration_ms": 5000 },
    "duration_ms": 5000,
    "min_donation": 10000
  }
]
```

### Emit Event dari Server

Server harus memastikan event `effect` di-emit ke semua client:

```javascript
io.emit('effect', effectPayload);   // broadcast ke semua
```

> Server yang sudah ada sudah melakukan ini via `eventBus` → `io.emit('effect', ...)`, tidak perlu perubahan.

---

## 10. FAQ & Troubleshooting

### Q: Client tidak bisa konek ke server

1. Pastikan PC Server dan PC Client di jaringan yang sama
2. `ping <IP_SERVER>` dari PC Client — harus reply
3. Pastikan firewall PC Server mengizinkan port 3000 TCP

```cmd
netsh advfirewall firewall add rule name="Viewer Merusuh" dir=in action=allow protocol=TCP localport=3000
```

4. `SERVER_URL` di `.env` harus pakai IP, bukan `localhost`

---

### Q: AHK tidak jalan, tidak ada error

1. Verifikasi `AHK_EXE_PATH` → harus path ke `AutoHotkey64.exe` versi 2
2. Pastikan script `.ahk` ada di `adapters/ahk/games/`
3. Coba jalankan script AHK manual dari Command Prompt
4. Set `LOG_LEVEL=debug` di `.env` untuk melihat path yang dicoba

---

### Q: vJoy / ViGEmBus tidak bisa diinstall

- Install ViGEmBus driver dulu **sebelum** `npm install vigemclient`
- Beberapa versi memerlukan Visual C++ Redistributable
- Buka Device Manager → pastikan ada "Virtual Gamepad Emulation Bus"
- Restart game setelah client aktif (beberapa game perlu controller terdeteksi sebelum game dibuka)

---

### Q: Plugin adapter — efek masuk queue tapi game tidak mengambil

- Pastikan game plugin berjalan dan polling ke port yang benar
- Cek: `node scripts/test-plugin.js status` → lihat `queueSize`
- Naikkan TTL jika efek sering kadaluarsa: `PLUGIN_EFFECT_TTL=60000`
- Test manual: `curl http://127.0.0.1:3001/api/plugin/pending`

---

### Q: Dashboard tidak bisa dibuka

- Cek log — ada pesan `[Dashboard] Web UI aktif → http://localhost:3002`
- Port 3002 mungkin dipakai program lain → ganti `DASHBOARD_PORT` di `.env`
- Pastikan tidak ada adblocker yang memblokir `localhost`

---

### Q: Scan LAN tidak menemukan server

- Firewall PC Server harus mengizinkan UDP port 47777
- Server harus menjalankan UDP listener (lihat bagian Auto-Discovery di atas)
- Sebagai alternatif: isi `SERVER_URL` manual di `.env`

---

### Q: Cara generate CLIENT_SECRET?

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```powershell
# PowerShell
[System.Web.Security.Membership]::GeneratePassword(40,5)
```

Salin hasil ke `.env` server **dan** `.env` client.

---

### Q: Apakah client bisa digunakan tanpa Electron?

Ya. Client adalah **pure Node.js**, tidak memerlukan Electron. Cukup `node src/index.js`.

---

### Q: Apakah bisa digunakan via internet (beda jaringan)?

Ya:
- **ngrok**: `ngrok http 3000` di PC Server → gunakan URL ngrok sebagai `SERVER_URL`
- **Cloudflare Tunnel**: gratis, lebih stabil dari ngrok
- **IP publik**: port forwarding di router ke port 3000

---

*Viewer Merusuh Client v0.5.0 — Semua step selesai*
*Terakhir diperbarui: 2025*
