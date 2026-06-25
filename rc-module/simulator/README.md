# Simulator Guide — RC Module

Cara menjalankan RC Module dalam mode simulator — tanpa hardware nyata.

---

## Apa itu Simulator Mode?

Simulator mode memungkinkan kamu test semua fitur RC Module (session, queue, kontrol) tanpa memiliki RC fisik. RC digambarkan sebagai kotak bergerak di canvas HTML.

Cocok untuk:
- Development dan testing logic
- Demo ke orang lain sebelum beli hardware
- Debugging session/queue manager

---

## Cara Jalankan

### 1. Install dependencies

```bash
cd rc-module
npm install
```

### 2. Jalankan server

```bash
npm run simulator
```

Output yang muncul:
```
[FleetManager] RC terdaftar: RC Simulator #1 🔴 (car/simulator) — ID: rc_xxx
[FleetManager] RC terdaftar: RC Simulator #2 🔵 (car/simulator) — ID: rc_yyy
[FleetManager] RC terdaftar: Drone Simulator 🚁 (drone/simulator) — ID: rc_zzz
[FleetManager] 3 RC simulator sudah di-seed untuk development
[RCModule] Modul RC aktif
[RCModule] Server berjalan di http://localhost:3001
[RCModule] Admin  → http://localhost:3001/rc/controller/admin.html
[RCModule] Fleet  → http://localhost:3001/rc/api/fleet
```

### 3. Test session manual via API

```bash
# Lihat daftar RC
curl http://localhost:3001/rc/api/fleet

# Ambil salah satu rc_id dari response di atas, lalu mulai sesi:
curl -X POST http://localhost:3001/rc/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"rc_id":"rc_XXXX","viewer_name":"TestViewer","duration_sec":60,"source":"manual"}'

# Response berisi controller_url, buka di browser!
```

### 4. Buka web controller

Gunakan `controller_url` dari response di atas, contoh:
```
http://localhost:3001/rc/controller/controller.html?token=abc123def456
```

---

## Kontrol di Web Controller

### Mouse / Touchscreen
Tap dan tahan tombol arah di D-pad.

### Keyboard
| Tombol | Aksi |
|--------|------|
| `W` / `↑` | Maju |
| `S` / `↓` | Mundur |
| `A` / `←` | Belok kiri |
| `D` / `→` | Belok kanan |
| `Space` | Stop/Rem |

---

## Yang Terlihat di Simulator

- **Canvas hitam** dengan grid abu-abu: arena RC
- **Kotak merah**: RC kamu
- **Arah segitiga**: menunjukkan arah hadap RC
- **Timer**: countdown sisa waktu sewa
- **Battery**: simulasi drain perlahan (per 10 detik)

---

## Test Queue

Untuk test queue (antrian viewer), buka beberapa browser tab dan mulai beberapa sesi:

```bash
# Tab 1: Mulai sesi pada RC #1
curl -X POST http://localhost:3001/rc/api/session/start \
  -d '{"rc_id":"rc_001","viewer_name":"Viewer A","duration_sec":30}'

# Tab 2: RC #1 sudah dipakai, viewer B masuk antrian
curl -X POST http://localhost:3001/rc/api/queue/join \
  -d '{"rc_id":"rc_001","viewer_name":"Viewer B","duration_sec":30}'

# Lihat queue
curl http://localhost:3001/rc/api/queue
```

Setelah 30 detik, Viewer A selesai → Viewer B otomatis dapat giliran.

---

## Socket.IO Events di Browser Console

Buka DevTools → Console di web controller, events yang terlihat:

```js
// Saat connect berhasil
session_info { session_id, rc_id, viewer_name, remaining_sec }

// Setiap detik
session_tick { remaining_sec: 59, 58, 57, ... }

// Setelah kirim perintah kontrol
rc_state_update { state: { x, y, heading, speed, battery } }

// Saat sesi habis
session_end { reason: "expired" }
```

---

## Struktur yang Akan Berkembang

```
Phase 2 (Sekarang):
  rc-simulator.js → simulasi in-memory
  Tidak ada kamera, tidak ada hardware
  
Phase 3 (Nanti):
  rc-esp32.js → WebSocket ke ESP32 nyata
  Kamera MJPEG dari ESP32-CAM
  
Phase 4 (Masa depan):
  WebRTC streaming
  Multi-kamera
  Drone support
```

---

*Versi dokumen: 0.1.0 — Phase 2*
