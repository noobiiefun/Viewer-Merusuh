# Viewer Merusuh — GTA 5 Plugin

Plugin native untuk GTA 5 menggunakan ScriptHookV .NET (SHVDN).
Memungkinkan kontrol langsung dari dalam game: wanted level, ledakan, cuaca, NPC, kendaraan, dan lainnya.

## Prasyarat

1. **GTA 5** versi PC (Steam / Epic / Rockstar)
2. **ScriptHookV** — http://www.dev-c.com/gtav/scripthookv/
3. **ScriptHookV .NET (SHVDN) v3** — https://github.com/scripthookvdotnet/scripthookvdotnet/releases
4. **Viewer Merusuh Server** berjalan di PC yang sama

> ⚠️ Plugin ini hanya untuk **Story Mode**. Jangan digunakan di GTA Online — bisa ban.

## Instalasi

### 1. Install ScriptHookV

- Download dari http://www.dev-c.com/gtav/scripthookv/
- Copy `ScriptHookV.dll` dan `NativeTrainer.asi` ke folder GTA 5
- Folder GTA 5 biasanya: `C:\Program Files\Steam\steamapps\common\Grand Theft Auto V\`

### 2. Install ScriptHookV .NET

- Download release terbaru dari GitHub (file `.zip`)
- Copy ke folder GTA 5:
  - `ScriptHookVDotNet.asi`
  - `ScriptHookVDotNet3.dll`
  - `ScriptHookVDotNet3.xml`

### 3. Install Plugin Viewer Merusuh

- Buat folder `scripts` di folder GTA 5 jika belum ada
- Copy file berikut ke `Grand Theft Auto V/scripts/`:
  - `ViewerMerusuh.cs`

### 4. Konfigurasi (opsional)

Buka `ViewerMerusuh.cs` dan edit konstanta di bagian atas:

```csharp
private const string SERVER_URL    = "http://localhost:3000";  // ganti jika PORT berbeda
private const string GAME_ID       = "gta5";                   // jangan diubah
private const string PLUGIN_SECRET = "";                        // isi jika set di .env server
private const int    POLL_INTERVAL = 2000;                     // ms polling (default: 2 detik)
```

Jika server berjalan di port berbeda (misal 3001), ubah `SERVER_URL` ke `http://localhost:3001`.

### 5. Jalankan

1. Jalankan Viewer Merusuh server: `npm run dev`
2. Jalankan GTA 5
3. Masuk ke Story Mode
4. Jika berhasil, muncul notifikasi: **"Viewer Merusuh plugin loaded!"**
5. Tekan **F9** kapan saja untuk cek status koneksi

## Efek yang Tersedia

Tambahkan efek di dashboard dengan `adapter: plugin` dan `game_target: gta5`.

### Wanted Level

| action_key | Efek |
|------------|------|
| `gta5_wanted_up` | Tambah 3 bintang wanted |
| `gta5_wanted_max` | Langsung 6 bintang |
| `gta5_wanted_clear` | Hapus semua wanted |

### Ledakan

| action_key | Efek |
|------------|------|
| `gta5_explosion` | Ledakan kecil di sekitar player |
| `gta5_explosion_rain` | Hujan ledakan selama durasi |

### Kendaraan

| action_key | Efek |
|------------|------|
| `gta5_vehicle_brake` | Rem mendadak |
| `gta5_vehicle_boost` | Kecepatan 3x lipat |
| `gta5_vehicle_flip` | Balik kendaraan |
| `gta5_vehicle_horn` | Spam klakson |
| `gta5_vehicle_engine_off` | Matikan mesin sementara |

### Karakter

| action_key | Efek |
|------------|------|
| `gta5_ragdoll` | Karakter jatuh ragdoll |
| `gta5_super_jump` | Super jump |
| `gta5_drunk` | Efek mabuk |
| `gta5_give_weapon` | Kasih senjata random |
| `gta5_remove_weapon` | Ambil semua senjata |

### Cuaca & Waktu

| action_key | Efek |
|------------|------|
| `gta5_weather_rain` | Hujan lebat |
| `gta5_weather_snow` | Salju |
| `gta5_weather_thunder` | Badai petir |
| `gta5_time_night` | Paksa malam hari |

### NPC

| action_key | Efek |
|------------|------|
| `gta5_npc_attack` | 3 NPC menyerang player |
| `gta5_spawn_cop` | Spawn polisi |
| `gta5_spawn_enemy` | Spawn musuh bersenjata |

### Ultimate

| action_key | Efek |
|------------|------|
| `gta5_chaos_mode` | Semua efek sekaligus |

## Menambah Efek Baru

Edit `ViewerMerusuh.cs`, tambahkan case baru di method `ExecuteEffect`:

```csharp
case "gta5_efek_baru":
    // tulis logic di sini menggunakan SHVDN API
    Game.Player.Character.Health = 100;
    break;
```

Referensi SHVDN API: https://nitanmarcel.github.io/shvdn-docs/

## Troubleshooting

**Plugin tidak load:**
- Pastikan ScriptHookV dan SHVDN sudah terinstall dengan benar
- Cek log error di `Grand Theft Auto V/scripts/ScriptHookVDotNet.log`

**"Koneksi terputus" di notifikasi game:**
- Pastikan Viewer Merusuh server sudah berjalan (`npm run dev`)
- Cek port di SERVER_URL sesuai `.env`

**GTA 5 crash saat load:**
- Update ScriptHookV ke versi terbaru (harus sesuai versi game)
- Pastikan SHVDN versi 3, bukan v2
