# Panduan Menambah Game Baru ke Viewer Merusuh

Dokumen ini menjelaskan cara menambahkan dukungan untuk game baru.
Ikuti langkah-langkah berikut agar konsisten dengan sistem yang ada.

---

## Struktur Grup Game

Game diorganisir berdasarkan **grup/kategori** terlebih dahulu:

```
adapters/ahk/games/
├── racing/      ← semua game balapan (BeamNG, NFS, Forza, GTA racing)
├── action/      ← open world & action (GTA 5, RDR2, Saints Row)
├── fps/         ← first/third person shooter (CS2, Valorant, COD)
├── survival/    ← survival & crafting (Minecraft, Rust, DayZ)
└── [grup baru]/ ← tambah folder baru jika kategori belum ada
```

---

## Langkah 1 — Buat Script AHK

Buat file baru di folder grup yang sesuai:
`adapters/ahk/games/[grup]/[nama_efek].ahk`

**Template dasar:**

```ahk
; adapters/ahk/games/[grup]/[nama_efek].ahk
; Viewer Merusuh — Efek: [Nama Efek]
; Kompatibel: [nama game]
;
; Deskripsi singkat cara kerja efek ini

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
; Sesuaikan key binding dengan setting game kamu
ACTION_KEY := "Space"
duration   := VM_GetDuration(3000)   ; default 3 detik
; ─────────────────────────────────────────────────────

VM_Log("[nama_efek] START")

; === Tulis logic efek di sini ===
VM_HoldKey(ACTION_KEY, duration)
; ================================

VM_Log("[nama_efek] DONE")
```

**Helper yang tersedia di `VM_Lib.ahk`:**

| Fungsi | Deskripsi |
|--------|-----------|
| `VM_GetDuration(default)` | Ambil durasi dari argumen server (ms) |
| `VM_HoldKey(key, ms)` | Tahan key selama X milidetik |
| `VM_SpamKey(key, count, interval)` | Tekan key berulang kali |
| `VM_TypeCheat(string)` | Ketik string karakter per karakter |
| `VM_MouseMove(dx, dy)` | Gerak mouse relatif |
| `VM_Click(button)` | Klik mouse |
| `VM_Log(msg)` | Log ke console |

---

## Langkah 2 — Daftarkan ke ACTION_REGISTRY

Buka `server/adapters/ahk.js` dan tambahkan entry baru:

```javascript
const ACTION_REGISTRY = {
  // ... entry yang sudah ada ...

  // ── [NAMA GRUP] ──
  'nama_action_key': 'games/[grup]/[nama_efek].ahk',
}
```

Gunakan `action_key` yang deskriptif dan lowercase dengan underscore.

---

## Langkah 3 — Tambah Efek ke Database

Via API atau langsung di `server/db/setup.js` (untuk seed default):

```bash
curl -X POST http://localhost:3000/api/effects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nama Efek",
    "description": "Deskripsi singkat",
    "min_amount": 5000,
    "max_amount": 9999,
    "game_target": "[grup]",
    "adapter": "ahk",
    "action_key": "nama_action_key",
    "duration_ms": 3000,
    "cooldown_ms": 5000
  }'
```

---

## Langkah 4 — Test

```bash
# Simulasi donasi (dev mode)
curl -X POST http://localhost:3000/api/test/donation \
  -H "Content-Type: application/json" \
  -d '{"amount": 7000, "donatorName": "Tester"}'
```

Lihat console server — harus muncul log `[AHK] Spawn: games/[grup]/[nama_efek].ahk`.

---

## Contoh: Menambah Efek Minecraft "Drop All Items"

**1. Buat script** `adapters/ahk/games/survival/mc_drop_all.ahk`:
```ahk
#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

duration := VM_GetDuration(3000)
VM_Log("mc_drop_all START")

; Q = drop item yang dipegang di Minecraft
; Ctrl+Q = drop seluruh stack
startTime := A_TickCount
while (A_TickCount - startTime < duration) {
    Send("{LCtrl down}{q}{LCtrl up}")
    Sleep(200)
}

VM_Log("mc_drop_all DONE")
```

**2. Daftar di registry** (`server/adapters/ahk.js`):
```javascript
'mc_drop_all': 'games/survival/mc_drop_all.ahk',
```

**3. Tambah efek via API** dengan `action_key: "mc_drop_all"`.

---

## Catatan Penting

- Selalu test di **offline/story mode** dulu (bukan multiplayer)
- Efek yang terlalu agresif (alt+F4, shutdown, dll) **jangan dibuat**
- Tambahkan komentar di script — terutama untuk key binding yang berbeda per game
- Jika game butuh window focus khusus, gunakan `WinActivate` di AHK
