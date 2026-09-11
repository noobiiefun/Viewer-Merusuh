# Panduan Upload Release ke GitHub

Langkah-langkah membuat release v1.0.1 di GitHub untuk repo `noobiiefun/Viewer-Merusuh`.

---

## Langkah 1 — Commit & Push Source Code Terbaru

Pastikan semua perubahan source code (BUKAN file `.exe`) sudah di-push:

```bash
cd G:\app\Viewer-Merusuh
git add .
git commit -m "release: v1.0.1 — core platform stabil"
git push origin main
```

> ⚠️ **Jangan commit isi folder `dist-electron/`** — file `.exe` di-upload terpisah lewat halaman Release, bukan lewat git. Pastikan `.gitignore` sudah benar (lihat file `_gitignore` yang sudah diupload sebelumnya).

---

## Langkah 2 — Buat Tag Versi

```bash
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

---

## Langkah 3 — Buat Release di GitHub

1. Buka repo: `https://github.com/noobiiefun/Viewer-Merusuh`
2. Klik tab **"Releases"** (di sidebar kanan repo)
3. Klik **"Draft a new release"**
4. Isi form:
   - **Choose a tag**: pilih `v1.0.1` yang baru dibuat
   - **Release title**: `Viewer Merusuh v1.0.1 — Penonton Bayar, Game Kacau`
   - **Description**: copy-paste isi file `RELEASE_NOTES.md`

---

## Langkah 4 — Upload File .exe

Di bagian bawah form release, ada area **"Attach binaries by dropping them here..."**

Drag & drop atau klik untuk upload **kedua file** dari folder `dist-electron/`:

```
dist-electron/viewer-merusuh-setup-1.0.1.exe      (~75 MB)
dist-electron/viewer-merusuh-1.0.1-portable.exe   (~75 MB)
```

> File `.blockmap` dan `builder-effective-config.yaml` di folder yang sama **tidak perlu** diupload — itu file internal electron-builder.

---

## Langkah 5 — Publish

1. Centang **"Set as the latest release"**
2. Klik **"Publish release"**

Selesai! Release akan muncul di:
`https://github.com/noobiiefun/Viewer-Merusuh/releases/tag/v1.0.1`

User bisa download langsung dari sana tanpa perlu clone repo atau build sendiri.

---

## Update README Utama (Opsional tapi Direkomendasikan)

Tambahkan badge dan link download di bagian atas `README.md` agar terlihat profesional:

```markdown
[![Release](https://img.shields.io/github/v/release/noobiiefun/Viewer-Merusuh)](https://github.com/noobiiefun/Viewer-Merusuh/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/noobiiefun/Viewer-Merusuh/total)](https://github.com/noobiiefun/Viewer-Merusuh/releases)
[![License](https://img.shields.io/github/license/noobiiefun/Viewer-Merusuh)](LICENSE)

## 📥 Download

**[⬇️ Download Versi Terbaru](https://github.com/noobiiefun/Viewer-Merusuh/releases/latest)**

Tidak perlu install Node.js atau coding apapun — tinggal download `.exe`, install, dan jalankan.
```

---

## Untuk Release Berikutnya (v1.1.0, dst)

Setiap kali ada update besar:

1. Update versi di `package.json` (root)
2. Update `CHANGELOG.md` — pindahkan item dari `[Unreleased]` ke section versi baru
3. Build ulang: `node build-electron.js`
4. Commit, tag versi baru, push
5. Buat release baru di GitHub, upload `.exe` baru

```bash
# Contoh untuk v1.1.0
git tag -a v1.1.0 -m "Release v1.1.0 — tambah Client Module"
git push origin v1.1.0
```

---

## Auto-Update (Pengembangan Selanjutnya)

Saat ini aplikasi **belum punya auto-update**. User harus manual download versi baru dari GitHub Releases setiap update.

Untuk menambahkan auto-update di masa depan, gunakan `electron-updater` yang sudah terhubung dengan konfigurasi `publish` di `electron-builder.config.js` (sudah ada, tinggal diaktifkan):

```js
// electron-builder.config.js — sudah ada:
publish: {
  provider: 'github',
  owner: 'noobiiefun',
  repo: 'Viewer-Merusuh',
}
```

Implementasi auto-update memerlukan tambahan kode di `electron/main.js` menggunakan package `electron-updater`. Ini bisa jadi target untuk v1.1.0 atau v2.0.0.
