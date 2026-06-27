# Panduan Membuat Avatar Sprite — Viewer Merusuh

## Spesifikasi Wajib

| Parameter | Nilai |
|-----------|-------|
| Format | PNG + transparansi (alpha) |
| Frame | 4 frame walk cycle, horizontal |
| Ukuran per frame | **32 × 48 px** |
| Ukuran sprite sheet | **128 × 48 px** (32×4) |
| Rendering di browser | `image-rendering: pixelated` |
| Scale di overlay | 2× (tampil 64×96px di OBS) |

## Layout Sprite Sheet

```
┌──────────┬──────────┬──────────┬──────────┐
│  Frame 1 │  Frame 2 │  Frame 3 │  Frame 4 │
│  (kaki   │  (kaki   │  (kaki   │  (kaki   │
│   kiri   │   kanan  │   kiri   │   kanan  │
│   depan) │   depan) │   blkg)  │   blkg)  │
└──────────┴──────────┴──────────┴──────────┘
← 32px  →← 32px  →← 32px  →← 32px  →
                                  Total: 128px
```

Semua frame dalam **1 file PNG**, berjajar horizontal kiri ke kanan.

## File Template

File `warrior.png`, `mage.png`, dst. di folder ini adalah **template kosong**
yang sudah punya:
- Garis border tiap frame (panduan batas)
- Garis tengah horizontal & vertikal (panduan simetri tubuh)
- Nomor frame di pojok kiri atas (1–4)

Buka di Aseprite atau Pixilart, gambar di atasnya, lalu export ulang.

---

## Cara Buat di Aseprite

### Setup Canvas
1. **File → New**
2. Width: `128`, Height: `48`
3. Color Mode: **RGBA**
4. Background: **Transparent**

### Aktifkan Grid
- **View → Show → Grid** (atau tekan `'`)
- **Edit → Grid → Grid Settings**: Width `32`, Height `48`
- Ini akan membagi canvas jadi 4 kolom = 4 frame ✓

### Gambar Walk Cycle (urutan)
- **Frame 1**: pose netral / kaki tengah
- **Frame 2**: langkah kiri maju (tangan kanan maju)
- **Frame 3**: pose netral lagi (mirror Frame 1)
- **Frame 4**: langkah kanan maju (tangan kiri maju)

> Tips: gambar Frame 1 dulu, duplicate ke Frame 3 (mirror), lalu buat
> Frame 2 dan 4 sebagai variasi langkah.

### Export
- **File → Export Sprite Sheet**
- Layout: **Horizontal strip**
- Klik **Export** → simpan sebagai `nama_avatar.png`

### Preview animasi di Aseprite
Aseprite bisa preview walk cycle:
- **File → Import Sprite Sheet** → pilih file yang sudah dibuat
- Set frame size: 32×48
- Play dengan tombol ▶

---

## Cara Buat di Pixilart (browser, gratis)

1. Buka [pixilart.com/draw](https://www.pixilart.com/draw)
2. **New** → Width: `128`, Height: `48`
3. Aktifkan grid: **View → Grid → 32×48**
4. Gambar 4 frame walk cycle
5. **Save → Download PNG**
6. Rename file sesuai nama avatar: `warrior.png`, `mage.png`, dst.

---

## Tips Pixel Art Walk Cycle

### Proporsi tubuh untuk 32×48px
```
Kepala  : 8×8px  (baris 4–12)
Badan   : 8×12px (baris 12–24)
Kaki    : 8×12px (baris 24–36)
Sisa    : padding atas/bawah
```

### Palet warna
Gunakan max **8–16 warna** per avatar agar terlihat clean di skala kecil.
Hindari gradasi halus — pixel art lebih kuat dengan warna solid dan 1–2 level highlight/shadow.

### Walk cycle 4 frame minimal
```
F1: kaki lurus (netral)
F2: kaki kiri maju, kaki kanan mundur
F3: kaki lurus (netral — bisa sama dengan F1)
F4: kaki kanan maju, kaki kiri mundur
```

Animasi dijalankan: F1 → F2 → F3 → F4 → F1 → ... pada 0.5s/4frame = 8fps.

---

## Cara Tambah Avatar Baru ke Sistem

1. Drop file PNG ke folder `avatar/public/avatars/`
2. Buka Dashboard → **Avatar Manager**
3. Klik **🔄 Scan Folder**
4. Avatar baru muncul → set nama tampil dan info frame jika beda dari default
5. Klik **Assign ke Tier** untuk memilih tier mana yang bisa akses avatar ini
6. Avatar langsung tersedia di halaman `/pick` untuk viewer di tier tersebut

---

## Referensi & Tools

| Tool | Link | Keterangan |
|------|------|-----------|
| Aseprite | [aseprite.org](https://www.aseprite.org) | Berbayar (~$20), terbaik untuk pixel art animasi |
| Pixilart | [pixilart.com](https://www.pixilart.com/draw) | Gratis, berbasis browser |
| Libresprite | [libresprite.github.io](https://libresprite.github.io) | Fork Aseprite gratis/open-source |
| Lospec Palette | [lospec.com/palette-list](https://lospec.com/palette-list) | Koleksi palet pixel art siap pakai |
| Itch.io free assets | [itch.io/game-assets/free](https://itch.io/game-assets/free/tag-pixel-art) | Sprite gratis (cek lisensi!) |

---

*Spesifikasi ini sesuai dengan `avatar/server/db/setup.js` — default frame_width=32, frame_height=48, frame_count=4.*
*Jika kamu butuh ukuran berbeda, update nilai di Dashboard → Avatar Manager → Edit avatar setelah scan.*
