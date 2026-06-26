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
8. [Integrasi dengan Server](#8-integrasi-dengan-server)
9. [Roadmap Step by Step](#9-roadmap-step-by-step)
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
|-----------|-------|-----------|
| Node.js | v18+ | Runtime JavaScript |
| AutoHotkey | v2.x | Untuk efek keyboard/mouse |
| ViGEmBus | latest | Untuk efek virtual gamepad (opsional) |

### Jaringan

- PC Gaming dan PC Server harus terhubung ke **jaringan yang sama** (LAN/WiFi) untuk koneksi lokal
- Untuk koneksi via **internet**: server harus memiliki IP publik atau menggunakan ngrok/Cloudflare Tunnel

---

## 3. Instalasi

### Clone / Copy Folder

```bash
# Masuk ke folder client
cd viewer-merusuh/client

# Install dependencies
npm install

# Jalankan setup untuk membuat .env
npm run setup
```

### Setup Pertama Kali

```bash
npm run setup
```

Output:
```
✅  File .env berhasil dibuat dari .env.example

📝  Langkah selanjutnya:
   1. Buka file .env
   2. Isi SERVER_URL dengan IP PC Server (PC OBS)
   3. Isi CLIENT_SECRET dengan nilai yang sama seperti di server
   4. Sesuaikan adapter yang ingin diaktifkan
   5. Jalankan: npm start
```

### Menjalankan Client

```bash
# Production
npm start

# Development (auto-restart saat file berubah)
npm run dev
```

---

## 4. Konfigurasi

Edit file `.env` (dibuat otomatis oleh `npm run setup`):

```env
# IP dan port PC Server (PC OBS)
# LAN    : http://192.168.1.10:3000
# Internet: http://103.x.x.x:3000
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
│   ├── index.js                 # Entry point utama
│   │
│   ├── core/
│   │   ├── connection.js        # Koneksi Socket.IO ke server
│   │   └── adapterManager.js   # Router efek ke adapter
│   │
│   ├── adapters/
│   │   ├── ahk.js              # AutoHotkey adapter ✅ (Step 1)
│   │   ├── vjoy.js             # vJoy/ViGEm adapter 🔧 (Step 3)
│   │   └── plugin.js           # Game plugin adapter 🔧 (Step 4)
│   │
│   └── utils/
│       ├── logger.js           # Logger dengan color-coding
│       └── config.js           # Config loader + validator
│
├── adapters/
│   └── ahk/                    # Folder script AHK (sama dengan server)
│       ├── lib/                # AHK helper libraries
│       └── games/              # Script per game/kategori
│           ├── racing/
│           ├── action/
│           ├── fps/
│           └── ...
│
├── scripts/
│   └── setup.js                # Script setup .env pertama kali
│
├── docs/
│   └── README.md               # Dokumentasi ini
│
├── .env                        # Config (jangan di-commit!)
├── .env.example               # Template config
├── .gitignore
└── package.json
```

---

## 6. Cara Kerja Internal

### connection.js

Mengelola koneksi Socket.IO ke server dengan fitur:
- **Auto-reconnect** — mencoba konek ulang otomatis dengan exponential backoff (1s → max 30s)
- **Auth payload** — mengirim `clientSecret` dan `clientName` saat handshake
- **Event listener** — mendengarkan event `effect` dari server lalu meneruskan ke AdapterManager

```javascript
// Event yang didengarkan:
socket.on('connect', ...)         // Saat berhasil konek
socket.on('disconnect', ...)      // Saat terputus
socket.on('effect', payload => adapterManager.execute(payload))  // Efek masuk
socket.on('auth_error', ...)      // Jika secret salah
```

### adapterManager.js

Router yang mendaftarkan adapter dan meneruskan efek:

```javascript
// Daftar adapter
manager.register('ahk', ahkAdapter);
manager.register('vjoy', vjoyAdapter);

// Routing berdasarkan payload.adapter
manager.execute({ adapter: 'ahk', action: 'brake_force', params: {} });
```

### Payload Efek (dari server)

Format standar event `effect` yang diterima dari server:

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

Menjalankan script AutoHotkey berdasarkan `action`.

**Resolusi path script:**

| Action | Path yang dicari |
|--------|-----------------|
| `brake_force` | `adapters/ahk/games/racing/brake_force.ahk` |
| `horn_spam` | `adapters/ahk/games/action/horn_spam.ahk` |
| `custom_key_1` | `adapters/ahk/lib/generic_key.ahk` (fallback) |

**Cara menambah script AHK:**

1. Buat file `.ahk` di folder yang sesuai:
   ```
   adapters/ahk/games/racing/flip_car.ahk
   ```
2. Script akan otomatis dipilih saat action `flip_car` diterima

> 💡 **Tips:** Salin folder `adapters/ahk/` dari PC Server ke PC Client agar semua script sama.

---

### vJoy Adapter (`adapter: "vjoy"`) — *Step 3*

Status: Stub, akan diimplementasikan di Step 3.

Dependency yang perlu diinstall:
```bash
npm install vigemclient
```

---

### Plugin Adapter (`adapter: "plugin"`) — *Step 4*

Status: Stub, akan diimplementasikan di Step 4.

Akan membuka HTTP server lokal di `PLUGIN_LOCAL_PORT` (default: 3001) sehingga game plugin bisa polling efek langsung ke client.

---

## 8. Integrasi dengan Server

### Menambahkan CLIENT_SECRET di Server

Di `.env` PC Server, tambahkan:
```env
# Secret untuk autentikasi client agent
CLIENT_SECRET=rahasia_yang_panjang_dan_unik
```

Di `server/index.js`, tambahkan guard Socket.IO (opsional tapi disarankan):

```javascript
// server/index.js — di dalam io.on('connection', ...)
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

### Event yang Perlu Diterima Client

Server harus memastikan event `effect` di-emit ke **semua client** termasuk game-client:

```javascript
// server/index.js atau server/core/effectEngine.js
io.emit('effect', effectPayload);   // Broadcast ke semua
// atau
socket.broadcast.emit('effect', effectPayload);
```

> Server yang sudah ada sudah melakukan ini melalui `eventBus` → `index.js` → `io.emit('effect', ...)`, jadi tidak perlu perubahan di server untuk fitur dasar.

---

## 9. Roadmap Step by Step

| Step | Fitur | Status |
|------|-------|--------|
| **Step 1** | Scaffold, koneksi Socket.IO, AHK adapter dasar | ✅ Done |
| **Step 2** | AHK adapter lengkap + sinkronisasi folder script dari server | ✅ Done |
| **Step 3** | vJoy / ViGEmBus adapter | ✅ Done |
| **Step 4** | Plugin adapter (HTTP proxy lokal untuk GTA5/BeamNG polling) | 🔜 |
| **Step 5** | Config UI sederhana (web dashboard lokal) + auto-discovery server di LAN | 🔜 |

### Detail Step 2 (AHK Lanjutan)

- Script sync: tool untuk menyalin folder `adapters/ahk/` dari server via HTTP
- Support `params` ke dalam script AHK (misal: durasi, intensity)
- Logging per-script ke file

### Detail Step 3 (vJoy)

- Koneksi ke ViGEmBus menggunakan `vigemclient`
- Mapping action → tombol gamepad virtual
- Test mode dari command line

### Detail Step 4 (Plugin Proxy)

- Express mini-server di port `PLUGIN_LOCAL_PORT`
- Route `GET /api/plugin/pending` untuk game plugin polling
- Route `POST /api/plugin/complete/:id` untuk game plugin konfirmasi efek selesai
- Queue management efek yang belum dikonsumsi

### Detail Step 5 (UI)

- Web UI di `http://localhost:3002`
- Status koneksi (connected/disconnected/reconnecting)
- Log efek masuk real-time
- Toggle adapter on/off
- Auto-discovery server di LAN (UDP broadcast)

---

## 10. FAQ & Troubleshooting

### Q: Client tidak bisa konek ke server

**Cek:**
1. Pastikan PC Server dan PC Client di jaringan yang sama
2. Coba `ping <IP_SERVER>` dari PC Client
3. Pastikan firewall PC Server mengizinkan port 3000 (TCP in)
4. Cek `SERVER_URL` di `.env` — harus pakai IP, bukan `localhost`

**Windows Firewall (di PC Server):**
```cmd
netsh advfirewall firewall add rule name="Viewer Merusuh" dir=in action=allow protocol=TCP localport=3000
```

---

### Q: AHK tidak jalan, tidak ada error

**Cek:**
1. Verifikasi `AHK_EXE_PATH` di `.env` — harus path ke `AutoHotkey64.exe` versi 2
2. Pastikan script `.ahk` ada di folder `adapters/ahk/games/`
3. Coba jalankan script AHK manual dari Command Prompt
4. Set `LOG_LEVEL=debug` di `.env` untuk melihat path script yang dicoba

---

### Q: `CLIENT_SECRET` berbeda, gimana cara generate?

Gunakan salah satu cara ini:

**Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**PowerShell:**
```powershell
[System.Web.Security.Membership]::GeneratePassword(40,5)
```

Salin hasil ke `.env` server **dan** `.env` client.

---

### Q: Apakah client bisa digunakan tanpa Electron?

Ya. Client adalah **pure Node.js**, tidak memerlukan Electron. Cukup `node src/index.js`.

---

### Q: Apakah bisa digunakan via internet (beda jaringan)?

Ya. Gunakan salah satu cara:
- **ngrok** di PC Server: `ngrok http 3000` → gunakan URL ngrok sebagai `SERVER_URL`
- **Cloudflare Tunnel**: gratis, lebih stabil dari ngrok
- **IP publik langsung**: set port forwarding di router PC Server ke port 3000

---

*Dokumentasi ini dibuat untuk Viewer Merusuh Client — Step 1*
*Terakhir diperbarui: 2025*
