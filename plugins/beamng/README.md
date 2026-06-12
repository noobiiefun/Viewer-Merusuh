# Viewer Merusuh — BeamNG.drive Plugin

Plugin Lua native untuk BeamNG.drive yang mengintegrasikan donasi langsung ke dalam game.

## Instalasi

### 1. Copy folder mod

Copy folder `viewermerusuh` ke:
```
Documents/BeamNG.drive/mods/unpacked/viewermerusuh/
```

Struktur akhir:
```
Documents/BeamNG.drive/mods/unpacked/viewermerusuh/
├── modInfo.json
└── lua/
    └── ge/
        └── extensions/
            └── viewermerusuh/
                └── main.lua
```

> ⚠️ Pastikan struktur folder persis seperti di atas — BeamNG sensitif terhadap path.

### 2. Konfigurasi

Edit `main.lua` bagian konfigurasi:

```lua
local SERVER_URL    = "http://localhost:3000"  -- sesuai PORT di .env
local GAME_ID       = "beamng"                 -- jangan diubah
local PLUGIN_SECRET = ""                        -- isi jika set di .env server
local POLL_INTERVAL = 3                         -- detik antar polling
```

### 3. Aktifkan Plugin

- Buka BeamNG.drive
- Buka konsol (` ~ ` atau F7)
- Ketik: `extensions.load('viewermerusuh/main')`
- Atau via menu: **Options → Extensions → viewermerusuh/main → Load**

Jika berhasil, muncul toast: **"Terhubung ke server!"**

### 4. Auto-load (opsional)

Agar plugin otomatis aktif setiap kali BeamNG dibuka:
- Options → Extensions → cari `viewermerusuh/main`
- Klik toggle untuk auto-load

## Efek yang Tersedia

Tambahkan efek di dashboard dengan `adapter: plugin` dan `game_target: beamng`.

| action_key | Efek | Deskripsi |
|------------|------|-----------|
| `beamng_brake` | Rem Mendadak | Tahan rem penuh selama durasi |
| `beamng_throttle` | Gas Penuh | Gas penuh paksa selama durasi |
| `beamng_random_steer` | Steer Chaos | Steer acak kiri-kanan |
| `beamng_handbrake` | Handbrake | Tahan rem tangan |
| `beamng_engine_off` | Matikan Mesin | Mesin mati sementara |
| `beamng_explosion` | Ledakan | Ledakan di sekitar kendaraan |
| `beamng_slow_motion` | Slow Motion | Waktu 30% normal |
| `beamng_vehicle_reset` | Reset Kendaraan | Aktifkan recovery mode |
| `beamng_random_damage` | Kerusakan Acak | Damage beam acak |
| `beamng_chaos` | Chaos Mode | Semua efek sekaligus |

## Troubleshooting

**Toast "Koneksi ke server terputus":**
- Pastikan `npm run dev` sudah berjalan
- Cek `SERVER_URL` di `main.lua` sesuai PORT di `.env`

**Plugin tidak muncul di Extensions:**
- Cek struktur folder — harus persis seperti di atas
- Cek log BeamNG di `Documents/BeamNG.drive/logs/`

**Efek tidak berjalan:**
- Pastikan kamu sedang di dalam kendaraan (bukan di Free Camera)
- Cek log konsol BeamNG (` ~ `) untuk error message
