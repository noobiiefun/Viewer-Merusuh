# Bump Versi ke 1.0.1

## 1. `package.json` (root)

Ubah:
```json
"version": "1.0.0",
```
Jadi:
```json
"version": "1.0.1",
```

Sekalian tambahkan dependency ngrok di section `dependencies`:
```json
"dependencies": {
  "@ngrok/ngrok": "^1.4.1",
  "better-sqlite3": "12.11.1",
  ...
}
```

> Catatan: kunci `better-sqlite3` ke versi exact `12.11.1` (tanpa `^`) supaya
> tidak ada drift versi yang bisa memicu binding mismatch lagi seperti
> kemarin. Kalau mau tetap pakai range, minimal pin `~12.11.1`.

## 2. Jalankan setelah edit

```bash
npm install
```

Ini akan install `@ngrok/ngrok` dan re-lock `better-sqlite3` ke versi exact.
