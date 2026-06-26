# Step 3 — vJoy / ViGEmBus Adapter

> Dokumen ini melengkapi README utama untuk detail implementasi Step 3.

---

## Instalasi

### 1. Install ViGEmBus Driver (di PC Gaming)

Download dan install dari:
👉 https://github.com/nefarius/ViGEmBus/releases

Pilih file `.exe` installer terbaru lalu restart PC setelah install.

### 2. Install npm package

```bash
npm install vigemclient
```

> `vigemclient` masuk sebagai `optionalDependencies` di `package.json`,
> artinya `npm install` biasa tidak otomatis menginstallnya.
> Jalankan perintah di atas secara eksplisit jika ingin mengaktifkan adapter ini.

### 3. Aktifkan di `.env`

```env
ADAPTER_VJOY=true
```

---

## Action Reference

### `press_button`
Tekan satu tombol lalu lepas.

```json
{
  "adapter": "vjoy",
  "action": "press_button",
  "params": { "button": "CROSS", "duration_ms": 300 }
}
```

---

### `hold_button`
Tahan tombol selama durasi (semantik berbeda dari press, lebih lama).

```json
{
  "adapter": "vjoy",
  "action": "hold_button",
  "params": { "button": "L2", "duration_ms": 2000 }
}
```

---

### `spam_button`
Toggle tombol on/off berkali-kali dengan cepat.

```json
{
  "adapter": "vjoy",
  "action": "spam_button",
  "params": { "button": "R1", "count": 10, "interval_ms": 80 }
}
```

---

### `tilt_left_stick`
Miringkan left stick ke arah tertentu lalu kembali ke center.

```json
{
  "adapter": "vjoy",
  "action": "tilt_left_stick",
  "params": { "x": 0, "y": 1, "duration_ms": 1500 }
}
```
- `x` / `y`: range `-1.0` (kiri/atas) ~ `1.0` (kanan/bawah). `0` = center.
- Default: maju lurus (`y: 1`)

---

### `tilt_right_stick`
Miringkan right stick (kamera).

```json
{
  "adapter": "vjoy",
  "action": "tilt_right_stick",
  "params": { "x": 1, "y": 0, "duration_ms": 1000 }
}
```

---

### `spin_left_stick`
Putar left stick melingkar 360° (efek chaos untuk racing game).

```json
{
  "adapter": "vjoy",
  "action": "spin_left_stick",
  "params": { "duration_ms": 3000, "radius": 1.0 }
}
```
- `radius`: `0.0` ~ `1.0` — seberapa jauh dari center

---

### `press_trigger`
Tekan trigger (gas/rem) ke nilai tertentu.

```json
{
  "adapter": "vjoy",
  "action": "press_trigger",
  "params": { "side": "R", "value": 1.0, "duration_ms": 500 }
}
```
- `side`: `"L"` (L2/LT) atau `"R"` (R2/RT)
- `value`: `0.0` ~ `1.0`

---

### `spam_trigger`
Spam trigger naik-turun.

```json
{
  "adapter": "vjoy",
  "action": "spam_trigger",
  "params": { "side": "R", "count": 8, "interval_ms": 100 }
}
```

---

### `chaos_input`
Input random — tombol dan stick sembarang selama durasi.

```json
{
  "adapter": "vjoy",
  "action": "chaos_input",
  "params": { "duration_ms": 3000 }
}
```

---

### `full_release`
Reset semua input ke netral (safety action).

```json
{
  "adapter": "vjoy",
  "action": "full_release",
  "params": {}
}
```

---

## Nama Tombol

| Tombol | Alias |
|--------|-------|
| `CROSS` | `X`, `A` |
| `CIRCLE` | `O`, `B` |
| `SQUARE` | |
| `TRIANGLE` | |
| `L1`, `R1` | |
| `L2`, `R2` | |
| `L3`, `R3` | (tekan stick) |
| `DPAD_UP` | `UP` |
| `DPAD_DOWN` | `DOWN` |
| `DPAD_LEFT` | `LEFT` |
| `DPAD_RIGHT` | `RIGHT` |
| `OPTIONS` | `START` |
| `SHARE` | `SELECT` |
| `PS` | |

---

## Test dari CLI

```bash
# Tekan CROSS selama 300ms
node scripts/test-vjoy.js press_button '{"button":"CROSS","duration_ms":300}'

# Spam R1 10 kali
node scripts/test-vjoy.js spam_button '{"button":"R1","count":10}'

# Tilt kiri (mundur) selama 2 detik
node scripts/test-vjoy.js tilt_left_stick '{"x":0,"y":-1,"duration_ms":2000}'

# Putar stick
node scripts/test-vjoy.js spin_left_stick '{"duration_ms":3000}'

# Chaos input 5 detik
node scripts/test-vjoy.js chaos_input '{"duration_ms":5000}'

# Reset
node scripts/test-vjoy.js full_release

# Tampilkan semua action
node scripts/test-vjoy.js
```

---

## Contoh Efek di Server

Tambahkan ini di konfigurasi efek server (`effects.json` atau database):

```json
[
  {
    "name": "Stir Stik Kiri",
    "adapter": "vjoy",
    "action": "spin_left_stick",
    "params": { "duration_ms": 3000 },
    "duration_ms": 3000,
    "min_donation": 5000
  },
  {
    "name": "Gas Poll Random",
    "adapter": "vjoy",
    "action": "spam_trigger",
    "params": { "side": "R", "count": 15, "interval_ms": 80 },
    "duration_ms": 2400,
    "min_donation": 2000
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

---

## Troubleshooting

### `vigemclient` tidak bisa diinstall
Pastikan ViGEmBus driver sudah terinstall **sebelum** `npm install vigemclient`.
Beberapa versi memerlukan Visual C++ Redistributable.

### Controller tidak terdeteksi di game
- Buka **Device Manager** → pastikan ada "Xbox HID-compliant game controller" atau "Virtual Gamepad Emulation Bus"
- Coba restart game setelah client berjalan
- Beberapa game perlu controller terdeteksi **sebelum** game dibuka

### Input tidak berpengaruh di game
- Pastikan game menggunakan controller (bukan keyboard-only)
- Di game racing: cek apakah controller terdaftar dan tidak bentrok dengan AHK adapter
- Coba `full_release` dulu sebelum mengirim efek lain

### Error: `Cannot find module 'vigemclient'`
```bash
npm install vigemclient
```

---

*Step 3 selesai. Step 4 selanjutnya: Plugin Adapter (HTTP proxy untuk GTA5/BeamNG)*
