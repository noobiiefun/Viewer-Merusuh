# Panduan vJoy / ViGEm Virtual Gamepad

Dokumen ini menjelaskan cara kerja adapter vJoy dan cara menambah aksi controller baru.

---

## Cara Kerja

```
Donasi masuk → effectEngine → adapter='vjoy' → vjoy.js → ViGEmBus driver → Virtual Controller → Game
```

Virtual controller yang dibuat adalah **Xbox 360 Controller** — kompatibel dengan hampir semua game PC yang support controller.

---

## Prasyarat

### 1. ViGEmBus Driver

Download dan install dari:
https://github.com/nefarius/ViGEmBus/releases

Pilih file `.exe` terbaru (bukan source code). Restart PC setelah install.

**Verifikasi instalasi:**
- Buka Device Manager → lihat di kategori "System Devices"
- Harus ada entry "Nefarius Virtual Gamepad Emulation Bus"

### 2. npm dependency

```bash
npm install
```

`vigemclient` sudah terdaftar di `package.json`. Jika instalasi gagal karena node-gyp, install:
```bash
npm install --global windows-build-tools
```

### 3. Verifikasi server

Jalankan `npm run dev` — log harus menampilkan:
```
🎮 [vJoy] ViGEmBus terhubung — virtual Xbox 360 controller aktif
```

Jika muncul warning, baca pesan errornya — biasanya driver belum terinstall atau belum restart.

---

## Axis & Button Reference

| Input | ViGEm Property | Range | Contoh Penggunaan |
|-------|---------------|-------|-------------------|
| Left Trigger | `leftTrigger` | 0–255 | Rem |
| Right Trigger | `rightTrigger` | 0–255 | Gas |
| Left Stick X | `leftStickX` | -32768–32767 | Steer kiri/kanan |
| Left Stick Y | `leftStickY` | -32768–32767 | Maju/mundur |
| Right Stick X | `rightStickX` | -32768–32767 | Kamera horizontal |
| Right Stick Y | `rightStickY` | -32768–32767 | Kamera vertikal |
| Button A | `A` | true/false | Gas (beberapa game) |
| Button B | `B` | true/false | Rem/mundur |
| Button X | `X` | true/false | Handbrake |
| Button Y | `Y` | true/false | Nitro/boost |
| DPad Up | `dpadUp` | true/false | - |

Helper functions di `vjoy.js`:
- `toAxisValue(normalized)` — konversi -1.0..1.0 → -32768..32767
- `toTriggerValue(normalized)` — konversi 0.0..1.0 → 0..255

---

## Menambah Action Baru

### Langkah 1 — Tulis handler di `server/adapters/vjoy.js`

```javascript
// Tambah di bagian ACTION HANDLERS
async function actionNitroBoost(durationMs) {
  if (!controller) return simLog('nitro_boost', { durationMs })
  const snap = snapshotState()

  // Tekan tombol Y (nitro di beberapa game) + gas penuh
  controller.report.Y = true
  controller.report.rightTrigger = toTriggerValue(1.0)
  await controller.update()

  await sleep(durationMs)
  await restoreState(snap)
  controller.report.Y = false
  await controller.update()
}
```

### Langkah 2 — Daftarkan ke ACTION_REGISTRY

```javascript
const ACTION_REGISTRY = {
  // ... yang sudah ada ...
  'vjoy_nitro_boost': actionNitroBoost,
}
```

### Langkah 3 — Tambah efek ke database

Via dashboard (halaman Efek → Tambah Efek):
- Adapter: `vJoy / ViGEm`
- Action Key: `vjoy_nitro_boost`

Atau via API:
```bash
curl -X POST http://localhost:3000/api/effects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nitro Boost",
    "min_amount": 15000,
    "game_target": "racing",
    "adapter": "vjoy",
    "action_key": "vjoy_nitro_boost",
    "duration_ms": 3000
  }'
```

### Langkah 4 — Test

Di dashboard → halaman vJoy Controller → tombol Test, atau:
```bash
curl -X POST http://localhost:3000/api/test/donation \
  -H "Content-Type: application/json" \
  -d '{"amount": 15000, "donatorName": "Tester"}'
```

---

## Setting Game

### BeamNG.drive

1. Options → Controls → Controller
2. Virtual Xbox 360 Controller akan terdeteksi otomatis
3. Assign:
   - `Left Trigger` → Brake
   - `Right Trigger` → Throttle
   - `Left Stick X` → Steering
   - `Button X` → Handbrake

### Forza Horizon

Terdeteksi otomatis sebagai Xbox Controller saat game dibuka setelah server jalan.

### Need for Speed

Options → Controls → Controller → pilih Xbox Controller

---

## Troubleshooting

**Controller tidak terdeteksi di game:**
- Pastikan server sudah jalan sebelum buka game
- Beberapa game perlu di-restart jika controller baru connect saat game sudah berjalan

**Log menampilkan `[vJoy-SIM]` bukan aksi nyata:**
- ViGEmBus belum terinstall atau npm dependency belum terinstall
- Lihat log server untuk pesan error spesifik

**vigemclient gagal install (node-gyp error):**
```bash
# Install build tools dulu
npm install --global windows-build-tools
# Lalu coba lagi
npm install
```
