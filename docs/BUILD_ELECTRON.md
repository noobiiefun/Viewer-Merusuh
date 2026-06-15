# Build Electron — Panduan Developer

Dokumen ini menjelaskan cara build Viewer Merusuh menjadi file `.exe` installer Windows.

---

## Hasil Build

```
electron/dist-electron/
├── viewer-merusuh-setup-1.0.0.exe     ← Installer (next-next-finish, 70-100MB)
└── viewer-merusuh-1.0.0-portable.exe  ← Portable (langsung jalankan, tanpa install)
```

**Perbedaan installer vs portable:**

| | Installer (.exe setup) | Portable (.exe) |
|---|---|---|
| Install ke | `C:\Program Files\Viewer Merusuh\` | Folder mana saja |
| Shortcut desktop | ✅ Otomatis | ❌ Manual |
| Uninstall | ✅ Lewat Control Panel | ❌ Hapus file saja |
| Data user | `%AppData%\Viewer Merusuh\` | Folder yang sama |
| Rekomendasi | Untuk user biasa | Untuk testing/developer |

---

## Prasyarat Build

- **Node.js** v18+ — https://nodejs.org
- **Windows** 10/11 (untuk build .exe; atau pakai Wine di Linux)
- **Git** (opsional, untuk UPDATE.bat)

---

## Cara Build

### Satu Perintah (recommended)

```bash
node build-electron.js
```

Script ini otomatis:
1. Build dashboard React (`dashboard/dist/`)
2. Install Electron dependencies
3. Jalankan electron-builder → hasilkan `.exe`

### Manual Step-by-Step

```bash
# 1. Build dashboard
cd dashboard && npm install && npm run build && cd ..

# 2. Install electron deps
cd electron && npm install && cd ..

# 3. Build installer
cd electron && npx electron-builder build --win
```

---

## Konfigurasi Build

Edit `electron/package.json` → bagian `"build"`:

```json
{
  "build": {
    "appId": "com.namakamu.viewer-merusuh",
    "productName": "Viewer Merusuh",
    "publish": {
      "provider": "github",
      "owner":    "username-github-kamu",
      "repo":     "viewer-merusuh"
    }
  }
}
```

---

## Icon

Letakkan file icon di `electron/assets/`:

| File | Ukuran | Digunakan untuk |
|------|--------|-----------------|
| `icon.png` | 256x256px | Window title bar, taskbar |
| `icon.ico` | Multi-size | File icon Windows |
| `tray-icon.png` | 16x16 atau 32x32px | System tray |

Tools untuk convert PNG → ICO:
- https://convertico.com
- https://icoconvert.com

---

## Auto-Update (GitHub Releases)

Electron-builder sudah dikonfigurasi untuk auto-update via GitHub Releases.

### Setup

1. Buat GitHub repository
2. Edit `electron/package.json`:
   ```json
   "publish": {
     "provider": "github",
     "owner":    "username-kamu",
     "repo":     "viewer-merusuh"
   }
   ```
3. Buat GitHub Personal Access Token dengan permission `repo`
4. Set sebagai environment variable: `GH_TOKEN=ghp_xxxxx`

### Release

```bash
# Build dan publish langsung ke GitHub Releases
GH_TOKEN=ghp_xxxxx node build-electron.js
cd electron && npx electron-builder --win --publish always
```

Atau upload manual:
1. Build: `node build-electron.js`
2. Buka GitHub → Releases → Create new release
3. Upload `dist-electron/*.exe`

---

## Struktur Data User (setelah install)

Data user disimpan di `%AppData%\Viewer Merusuh\`:

```
C:\Users\[nama]\AppData\Roaming\Viewer Merusuh\
├── .env                  ← konfigurasi (PORT, API keys, dll)
└── viewer-merusuh.db     ← database SQLite (efek, log donasi)
```

File ini **tidak hilang** saat update/uninstall-reinstall (kecuali user hapus manual).

---

## Dev Mode (tanpa build)

Untuk testing di mode development:

```bash
# Terminal 1: server backend
npm run dev

# Terminal 2: dashboard React dev server
npm run dev:dashboard

# Terminal 3: Electron (pakai server yang sudah jalan)
npm run electron:dev
```

---

## Cara Build (Updated)

```bash
# Cukup satu perintah dari root folder project:
node build-electron.js
```

### Kenapa tidak perlu Python atau Visual C++?

`better-sqlite3` (native module) hanya perlu di-compile **sekali** saat `npm install` di root project. Script `build-electron.js` menggunakan `node_modules` yang sudah ada di root — **tidak menginstall ulang** di subfolder `electron/`. Jadi tidak perlu Python, MSVC, atau build tools untuk build .exe.

---

## Troubleshooting

**Error: `configuration has an unknown property 'main'`**

`main` bukan property electron-builder. Entry point dibaca dari `package.json` root.
Pastikan root `package.json` punya:
```json
{ "main": "electron/main.js" }
```
Script `build-electron.js` sudah validasi ini sebelum build dimulai.

---

**Error: `gyp ERR! find Python` / `better-sqlite3 compile failed`**

Terjadi jika ada sisa `node_modules` dari instalasi lama di `electron/`.
Script `build-electron.js` sudah otomatis mendeteksi dan menghapus `electron/node_modules` lama jika versinya tidak sesuai, lalu install ulang dengan `--ignore-scripts`.

Jika masih error, hapus manual:
```bash
rd /s /q electron\node_modules
node build-electron.js
```

---

**Error: `better-sqlite3` crash saat app dijalankan**

`better-sqlite3` perlu di-compile ulang khusus untuk ABI Node.js di Electron.
Script sudah menangani ini otomatis via `@electron/rebuild`. Jika gagal:
```bash
cd electron
npm install
npx @electron/rebuild -f -w better-sqlite3
cd ..
node build-electron.js
```

---

**`Error: spawn electron ENOENT`**
```bash
cd electron && npm install
```

**Build gagal — native module error (better-sqlite3)**
```bash
cd electron
npx electron-rebuild -f -w better-sqlite3
```

**Icon tidak muncul**
- Pastikan `electron/assets/icon.png` ada dan ukuran minimal 256x256px
- `icon.ico` harus format ICO asli, bukan PNG yang di-rename

**App terbuka tapi halaman blank**
- Pastikan dashboard sudah di-build: `cd dashboard && npm run build`
- Cek apakah `dashboard/dist/index.html` ada
