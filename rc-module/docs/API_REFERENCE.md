# API Reference — RC Module

Dokumentasi lengkap REST API dan Socket.IO events untuk RC Module.

---

## Base URL

```
http://localhost:3001
```

---

## REST API

### Response Format

Semua endpoint menggunakan format standar yang sama dengan Viewer Merusuh:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Pesan error" }
```

---

### 🚗 Fleet RC — `/api/rc`

#### `GET /api/rc`
Ambil daftar semua RC yang terdaftar.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rc_001",
      "name": "RC Merah",
      "type": "car",
      "status": "available",
      "ip_address": "192.168.1.101",
      "adapter": "esp32",
      "battery_pct": 87,
      "cam_url": "http://192.168.1.101/stream",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Status RC:**
| Status | Keterangan |
|--------|-----------|
| `available` | Bisa disewa |
| `in_use` | Sedang dipakai viewer |
| `queued` | Ada queue, menunggu giliran |
| `offline` | Tidak terhubung |
| `maintenance` | Sedang diperbaiki |

---

#### `POST /api/rc`
Daftarkan RC baru ke fleet.

**Request Body:**
```json
{
  "name": "RC Biru",
  "type": "car",
  "adapter": "esp32",
  "ip_address": "192.168.1.102",
  "cam_url": "http://192.168.1.102/stream"
}
```

**Type yang valid:** `car`, `drone`, `boat`

**Adapter yang valid:** `esp32`, `raspi`, `mavlink`, `simulator`

---

#### `GET /api/rc/:id`
Detail satu RC.

---

#### `PUT /api/rc/:id`
Update data RC (nama, IP, dll).

---

#### `DELETE /api/rc/:id`
Hapus RC dari fleet (harus dalam status `offline`).

---

#### `POST /api/rc/:id/ping`
Ping RC, cek apakah online.

**Response:**
```json
{
  "success": true,
  "data": { "online": true, "latency_ms": 12 }
}
```

---

### ⏱️ Session — `/api/session`

#### `GET /api/session`
Ambil semua sesi aktif saat ini.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sess_abc123",
      "rc_id": "rc_001",
      "viewer_name": "NamaViewer",
      "viewer_token": "tok_xyz",
      "duration_sec": 300,
      "remaining_sec": 187,
      "started_at": "2025-01-01T10:00:00.000Z",
      "source": "donation",
      "donation_amount": 50000
    }
  ]
}
```

---

#### `POST /api/session/start`
Mulai sesi sewa RC secara manual (untuk testing atau admin).

**Request Body:**
```json
{
  "rc_id": "rc_001",
  "viewer_name": "TestViewer",
  "duration_sec": 120,
  "source": "manual"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "sess_abc123",
    "viewer_token": "tok_xyz789",
    "controller_url": "http://localhost:3001/controller?token=tok_xyz789",
    "expires_at": "2025-01-01T10:02:00.000Z"
  }
}
```

---

#### `POST /api/session/:id/end`
Akhiri sesi lebih awal (admin action).

---

#### `GET /api/session/history`
Riwayat semua sesi (untuk laporan).

**Query params:**
- `limit` — jumlah data (default 50)
- `rc_id` — filter per RC

---

### 📋 Queue — `/api/queue`

#### `GET /api/queue`
Ambil antrian saat ini untuk semua RC.

**Response:**
```json
{
  "success": true,
  "data": {
    "rc_001": [
      {
        "position": 1,
        "viewer_name": "Viewer A",
        "queued_at": "2025-01-01T10:01:00.000Z",
        "estimated_wait_sec": 113
      }
    ]
  }
}
```

---

#### `POST /api/queue/join`
Viewer masuk antrian.

**Request Body:**
```json
{
  "rc_id": "rc_001",
  "viewer_name": "NamaViewer",
  "duration_sec": 120,
  "source": "donation",
  "donation_amount": 25000
}
```

---

#### `DELETE /api/queue/:viewer_token`
Viewer keluar dari antrian.

---

### 🎮 Kontrol RC — `/api/control`

> Endpoint ini biasanya tidak dipanggil langsung — kontrol lebih efisien via Socket.IO.
> Tersedia untuk fallback atau testing.

#### `POST /api/control/:rc_id/command`
Kirim perintah kontrol ke RC.

**Request Body:**
```json
{
  "viewer_token": "tok_xyz789",
  "command": {
    "forward": 0.8,
    "turn": -0.3,
    "brake": false
  }
}
```

**Field command:**
| Field | Range | Keterangan |
|-------|-------|-----------|
| `forward` | -1.0 s/d 1.0 | Negatif = mundur |
| `turn` | -1.0 s/d 1.0 | Negatif = kiri |
| `brake` | boolean | Rem |
| `throttle` | 0.0 s/d 1.0 | Khusus drone: gas |
| `pitch` | -1.0 s/d 1.0 | Drone: pitch |
| `yaw` | -1.0 s/d 1.0 | Drone: yaw |
| `altitude` | number | Drone: ketinggian target (meter) |

---

### ⚙️ Config — `/api/config`

#### `GET /api/config`
Ambil semua konfigurasi RC Module.

**Response:**
```json
{
  "success": true,
  "data": {
    "default_session_duration_sec": 300,
    "min_donation_amount": 10000,
    "amount_per_minute": 5000,
    "max_queue_per_rc": 5,
    "command_rate_limit_ms": 100,
    "allow_manual_start": true
  }
}
```

---

#### `PUT /api/config`
Update konfigurasi.

---

## Socket.IO Events

### Server → Client (Broadcast)

| Event | Payload | Keterangan |
|-------|---------|-----------|
| `rc_status` | `{ rc_id, status, session_id? }` | Status RC berubah |
| `session_start` | `{ session_id, rc_id, viewer_name, duration_sec }` | Sesi dimulai |
| `session_tick` | `{ session_id, remaining_sec }` | Timer countdown (setiap detik) |
| `session_end` | `{ session_id, rc_id, reason }` | Sesi berakhir |
| `queue_update` | `{ rc_id, queue: [...] }` | Queue berubah |
| `fleet_update` | `{ rc_id, data: {...} }` | Data fleet RC berubah |
| `battery_update` | `{ rc_id, battery_pct }` | Update baterai |

### Client → Server

| Event | Payload | Keterangan |
|-------|---------|-----------|
| `control` | `{ token, command }` | Kirim perintah kontrol RC |
| `join_admin` | `{}` | Subscribe ke semua event (dashboard admin) |
| `join_viewer` | `{ token }` | Subscribe ke event sesi viewer ini |

### Contoh Implementasi Client

```javascript
const socket = io('http://localhost:3001');

// Viewer: mulai kontrol setelah dapat token
socket.emit('join_viewer', { token: 'tok_xyz789' });

// Kirim perintah kontrol
socket.emit('control', {
  token: 'tok_xyz789',
  command: { forward: 0.8, turn: 0.0 }
});

// Terima countdown timer
socket.on('session_tick', ({ remaining_sec }) => {
  updateTimerUI(remaining_sec);
});

// Terima notifikasi sesi berakhir
socket.on('session_end', ({ reason }) => {
  alert(`Waktu habis! Alasan: ${reason}`);
  disableController();
});
```

---

## Error Codes

| Code | Keterangan |
|------|-----------|
| `RC_NOT_FOUND` | ID RC tidak ditemukan |
| `RC_OFFLINE` | RC tidak terhubung |
| `RC_IN_USE` | RC sedang dipakai |
| `INVALID_TOKEN` | Token viewer tidak valid / expired |
| `SESSION_EXPIRED` | Sesi sudah berakhir |
| `QUEUE_FULL` | Antrian RC penuh |
| `INVALID_COMMAND` | Format perintah tidak valid |
| `UNAUTHORIZED` | Tidak ada izin (admin endpoint) |

---

*Versi dokumen: 0.1.0*
