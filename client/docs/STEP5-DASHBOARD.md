# Step 5 — Web Dashboard UI + Auto-Discovery LAN

> Dokumen ini melengkapi README utama untuk detail implementasi Step 5.

---

## Fitur

- **Status koneksi real-time** — badge connected / disconnected / reconnecting
- **Log efek masuk** — tampil langsung saat donasi masuk, lengkap nama donor + nominal
- **Toggle adapter on/off** — tanpa perlu restart client
- **LAN Discovery** — scan subnet untuk menemukan server Viewer Merusuh
- **Console log** — tail log client langsung di browser
- **Statistik** — jumlah efek diterima, uptime koneksi

---

## Aktivasi

Dashboard aktif secara default. Untuk menonaktifkan:

```env
# .env
DASHBOARD_ENABLED=false
```

Ganti port jika 3002 konflik:

```env
DASHBOARD_PORT=3003
```

Setelah `npm start`, buka browser di **PC Gaming**:

```
http://localhost:3002
```

---

## Auto-Discovery LAN

Tombol **"Scan Server di LAN"** di dashboard mengirim UDP broadcast ke subnet.
Server Viewer Merusuh yang aktif akan merespons dengan URL-nya.

### Syarat auto-discovery bekerja

Server (PC OBS) harus menambahkan listener UDP. Tambahkan ke `server/index.js`:

```javascript
const dgram = require('dgram');

const DISCOVER_PORT = 47777;
const udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });

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

udp.bind(DISCOVER_PORT, () => {
  udp.setBroadcast(true);
  console.log(`[Discovery] UDP listener aktif di port ${DISCOVER_PORT}`);
});
```

> Jika server belum ada listener ini, scan tetap bisa dilakukan tapi hasilnya kosong.
> Isi `SERVER_URL` di `.env` secara manual sebagai alternatif.

---

## Arsitektur Dashboard

```
src/core/
├── dashboard.js     ← HTTP server + SSE stream + HTML UI
├── eventBus.js      ← EventEmitter internal (glue antar modul)
└── discovery.js     ← UDP broadcast untuk scan LAN
```

### Event Bus

Semua modul berkomunikasi via `eventBus.js`:

| Event | Dikirim oleh | Diterima oleh |
|-------|-------------|---------------|
| `conn:status` | `connection.js` | `dashboard.js` → SSE |
| `effect` | `connection.js` | `dashboard.js` → SSE |
| `adapter:status` | `adapterManager.js` | `dashboard.js` → SSE |
| `log` | logger mana saja | `dashboard.js` → SSE |

### SSE Endpoints

Dashboard menggunakan **Server-Sent Events** (SSE) — satu koneksi HTTP long-lived yang push update ke browser tanpa polling.

```
GET /api/events          ← SSE stream (connect sekali, dapat update terus)
GET /api/state           ← Snapshot state saat ini (untuk load awal)
GET /api/discover        ← Trigger LAN scan, return JSON daftar server
POST /api/set-server     ← Simpan SERVER_URL baru ke .env
POST /api/adapter/:name  ← Toggle adapter { enabled: true/false }
```

---

## Troubleshooting

### Dashboard tidak bisa dibuka

- Pastikan client berjalan (`npm start`)
- Cek log — ada pesan `[Dashboard] Web UI aktif → http://localhost:3002`
- Port 3002 mungkin dipakai program lain → ganti `DASHBOARD_PORT` di `.env`

### Scan LAN tidak menemukan server

- Firewall PC Server harus mengizinkan UDP port 47777 (in)
- Server harus menjalankan UDP listener (lihat bagian Auto-Discovery di atas)
- Coba ping IP server dari PC Gaming dulu
- Sebagai alternatif: isi `SERVER_URL` manual di `.env`

### Toggle adapter tidak berpengaruh

- Beberapa adapter tidak bisa di-restart tanpa restart client penuh (misal: vjoy karena koneksi ViGEmBus)
- Restart client sebagai solusi akhir

### Log efek tidak muncul di dashboard

- Buka DevTools browser → tab Console → cek error SSE
- Coba refresh halaman dashboard
- Pastikan tidak ada adblocker yang memblokir `localhost`

---

## Screenshot Area

```
┌─────────────────────────────────────────────────────────┐
│  ⚡ Viewer Merusuh                          CLIENT v0.5  │
├──────────────────────┬──────────────────────────────────┤
│ Koneksi Server       │ Log Efek Real-time               │
│ ● Connected          │ ┌─────────────────────────────┐  │
│ http://192.168.1.10  │ │ Rem Mendadak  [ahk]  21:03  │  │
│                      │ │ dari penonton1 (Rp 5.000)   │  │
│ Efek: 42  Uptime: 2j │ │─────────────────────────────│  │
│──────────────────────│ │ Chaos Input   [vjoy] 21:01  │  │
│ Adapter              │ │ dari donatur2 (Rp 10.000)   │  │
│ AHK      ●──────○   │ └─────────────────────────────┘  │
│ VJOY     ●──────○   │                                   │
│ PLUGIN   ○──────●   │ Console                          │
│──────────────────────│ [21:03] Adapter ahk init OK     │
│ Auto-Discovery LAN   │ [21:03] Terhubung ke server     │
│ [🔍 Scan LAN]       │ [21:01] Efek chaos_input selesai │
└──────────────────────┴──────────────────────────────────┘
```

---

*Step 5 selesai — semua step dalam Roadmap Viewer Merusuh Client sudah lengkap!*
