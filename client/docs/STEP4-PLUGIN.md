# Step 4 — Plugin Adapter (HTTP Proxy Lokal)

> Dokumen ini melengkapi README utama untuk detail implementasi Step 4.

---

## Konsep

Plugin adapter membuka **HTTP server lokal** di port `3001` (default).
Game plugin (Lua, Python, C#, dll) **polling** ke server ini untuk mengambil efek,
lalu **mengeksekusinya di dalam game**, kemudian **mengkonfirmasi** efek selesai.

```
[Donasi masuk]
     ↓
[VM Server emit 'effect']
     ↓
[VM Client — plugin.js menerima]
     ↓ (simpan ke queue)
[HTTP GET /api/plugin/pending]  ←── Game Plugin polling
     ↓ (ambil efek)
[Game Plugin eksekusi efek]
     ↓
[HTTP POST /api/plugin/complete/:id]  ←── konfirmasi selesai
```

---

## Aktivasi

```env
# .env
ADAPTER_PLUGIN=true
PLUGIN_LOCAL_PORT=3001      # default
PLUGIN_TOKEN=               # kosongkan = tanpa auth, isi = wajib token
PLUGIN_EFFECT_TTL=30000     # efek kadaluarsa setelah 30 detik (ms)
```

---

## API Endpoint

Semua endpoint hanya bisa diakses dari `127.0.0.1` (lokal).

### `GET /api/plugin/pending`
Ambil semua efek yang belum dieksekusi. Efek langsung ditandai `sent`.

**Response:**
```json
{
  "effects": [
    {
      "id": "eff_1720000000_1",
      "action": "flip_car",
      "params": {},
      "duration_ms": 3000,
      "donation": {
        "username": "penonton123",
        "amount": 5000
      }
    }
  ]
}
```

---

### `POST /api/plugin/complete/:id`
Konfirmasi efek sudah dieksekusi. Hapus dari queue.

**Response:**
```json
{ "ok": true, "id": "eff_1720000000_1" }
```

---

### `GET /api/plugin/status`
Info status server.

```json
{
  "status": "ok",
  "port": 3001,
  "queueSize": 2,
  "auth": false,
  "effectTtl": 30000
}
```

---

### `GET /api/plugin/queue`
Debug — lihat semua isi queue termasuk status `pending`/`sent`.

---

### `POST /api/plugin/clear`
Panik button — kosongkan semua queue.

```json
{ "ok": true, "cleared": 3 }
```

---

## Auth (Opsional)

Jika `PLUGIN_TOKEN` diisi, semua request harus membawa header:

```
Authorization: Bearer <token>
```

Untuk generate token:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

---

## Contoh Plugin

### GTA5 (Lua / ScriptHookV)
```
plugin-examples/gta5/viewer_merusuh.lua
```
Action yang sudah ada: `flip_car`, `spawn_cops`, `clear_wanted`, `change_weather`,
`random_teleport`, `explosion`, `kill_engine`, `max_speed`, `repair_vehicle`, `set_health`

### BeamNG.drive (Lua Extension)
```
plugin-examples/beamng/viewer_merusuh.lua
```
Action yang sudah ada: `reset_vehicle`, `apply_force`, `launch_vehicle`, `set_speed`,
`change_weather`, `random_damage`, `disable_brakes`, `random_teleport`

### Generic Python
```
plugin-examples/generic/poller.py
```
Template untuk game apapun yang support Python. Tinggal tambahkan handler.

---

## Test dari CLI

```bash
# Jalankan server + masukkan 3 efek demo
node scripts/test-plugin.js start

# (terminal baru) Poll efek
node scripts/test-plugin.js poll

# (terminal baru) Kirim 1 efek + simulasi complete
node scripts/test-plugin.js send flip_car '{"intensity":1}'

# Cek status
node scripts/test-plugin.js status

# Kosongkan queue
node scripts/test-plugin.js clear
```

Atau via `curl`:
```bash
# Poll
curl http://127.0.0.1:3001/api/plugin/pending

# Complete (ganti ID sesuai response poll)
curl -X POST http://127.0.0.1:3001/api/plugin/complete/eff_1720000000_1

# Status
curl http://127.0.0.1:3001/api/plugin/status
```

---

## Contoh Efek di Server

Tambahkan ke konfigurasi efek server:

```json
[
  {
    "name": "Balik Mobil",
    "adapter": "plugin",
    "action": "flip_car",
    "params": {},
    "duration_ms": 3000,
    "min_donation": 5000
  },
  {
    "name": "Spawn Polisi",
    "adapter": "plugin",
    "action": "spawn_cops",
    "params": { "wanted_level": 3 },
    "duration_ms": 15000,
    "min_donation": 10000
  },
  {
    "name": "Hujan Badai",
    "adapter": "plugin",
    "action": "change_weather",
    "params": { "weather": "rain" },
    "duration_ms": 30000,
    "min_donation": 3000
  }
]
```

---

## Troubleshooting

### Port 3001 sudah dipakai
```env
PLUGIN_LOCAL_PORT=3002
```

### Efek masuk queue tapi game tidak mengambil
- Pastikan game plugin berjalan dan polling ke port yang benar
- Cek `node scripts/test-plugin.js status` → lihat `queueSize`
- Cek `node scripts/test-plugin.js poll` manual

### Efek kadaluarsa (expired) terus
- `PLUGIN_EFFECT_TTL` terlalu kecil, atau polling interval game terlalu lambat
- Naikkan TTL: `PLUGIN_EFFECT_TTL=60000` (60 detik)

### Game plugin tidak bisa konek
- Pastikan client berjalan (`npm start`)
- Pastikan `ADAPTER_PLUGIN=true` di `.env`
- Test: `curl http://127.0.0.1:3001/api/plugin/status`

---

*Step 4 selesai. Step 5 selanjutnya: Web Dashboard UI + auto-discovery LAN*
