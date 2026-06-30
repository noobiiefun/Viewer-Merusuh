# Catatan Penguatan Fondasi — Phase 1.5

> Dokumen ini menjelaskan apa yang ditambahkan setelah Phase 1 selesai,
> dan **kenapa** ini dilakukan sebelum lanjut ke hardware (Phase 3).

---

## Kenapa Perlu "Phase 1.5"?

Fondasi Phase 1 sudah benar secara arsitektur (session/queue/fleet manager,
adapter pattern, dokumentasi lengkap), tapi ada beberapa celah yang kalau
dibawa langsung ke hardware fisik bisa jadi masalah:

1. **Tidak ada persistence** — restart server = semua data fleet hilang.
   Untuk testing yang serius (apalagi nanti pakai hardware sungguhan),
   kita tidak mau RC yang sudah didaftarkan hilang tiap kali server di-restart.

2. **Tidak ada validasi command yang ketat** — command dari browser viewer
   bisa dimanipulasi (lewat DevTools atau curl manual). Tanpa sanitasi,
   command seperti `{ forward: 999, turn: NaN }` bisa lolos sampai ke motor
   RC asli nantinya.

3. **Tidak ada test sama sekali** — perubahan kecil di `sessionManager.js`
   bisa diam-diam merusak logic timer tanpa ketahuan.

4. **Admin dashboard direferensikan tapi filenya belum ada** — `server.js`
   sudah nunjuk ke `admin.html` padahal filenya belum dibuat.

---

## Apa yang Ditambahkan

### 1. Database Layer (`api/db/`)

- `database.js` — singleton koneksi SQLite (better-sqlite3, sama seperti
  Viewer Merusuh), dengan WAL mode untuk concurrent read/write yang aman.
- `setup.js` — schema 3 tabel: `fleet`, `session_history`, `config`.
  Urutan pembuatan tabel sengaja mengikuti pola yang sudah terbukti benar
  di Viewer Merusuh (`db.exec()` buat semua tabel dulu, baru seed) — supaya
  tidak mengulang bug "no such table" yang pernah dicatat di
  `DEVELOPER_GUIDE.md` bagian Panduan Fix Bug.

**Apa yang persisten, apa yang tidak:**

| Data | Persisten? | Alasan |
|------|-----------|--------|
| Fleet RC (nama, IP, adapter) | ✅ Ya, di tabel `fleet` | Tidak boleh hilang tiap restart |
| Status RC (available/in_use/dll) | ✅ Ya | Supaya tahu kondisi terakhir saat crash |
| Battery RC | ✅ Ya, tapi di-flush periodik (30 detik) | Berubah terlalu sering untuk ditulis tiap saat |
| Sesi yang sedang aktif | ❌ Tidak, tetap in-memory | Butuh timer real-time, bukan kebutuhan persist |
| Riwayat sesi (sudah selesai) | ✅ Ya, di tabel `session_history` | Untuk laporan/statistik nanti |

### 2. Command Sanitizer (`core/commandSanitizer.js`)

Ini bagian paling penting dari penguatan ini. **Semua command kontrol,
dari sumber manapun, sekarang wajib lewat `sanitizeCommand()` sebelum
mencapai adapter manapun** (simulator, ESP32, MAVLink nanti).

Yang dilakukan:
- Semua angka di-*clamp* ke rentang valid (`-1` s/d `1` untuk forward/turn,
  `0` s/d `120` meter untuk altitude drone sesuai regulasi Permenhub No. 37/2020)
- `NaN`, `undefined`, atau string yang bukan angka → dianggap `0`, bukan
  diteruskan mentah
- `brake`/`land`/`rth` hanya `true` jika benar-benar boolean `true` (bukan
  string `"true"` atau angka `1`, supaya tidak ada celah type coercion)
- Field yang tidak dikenal (misal field asing yang disisipkan) **tidak**
  ikut diteruskan ke adapter

Plus `CommandRateLimiter` — membatasi 1 command per 100ms per RC, supaya
client yang buggy atau mencoba spam tidak membanjiri adapter hardware.

> Ini secara sengaja dipisah jadi modul sendiri (bukan ditaruh inline di
> `server.js`) supaya gampang ditest secara terisolasi, dan supaya nanti
> kalau ada adapter baru (drone MAVLink, dll), tinggal panggil fungsi yang
> sama tanpa duplikasi logic validasi.

### 3. Validasi Input di Core Logic

`sessionManager.start()`, `queueManager.enqueue()`, dan `fleetManager.register()`
sekarang menolak input yang tidak masuk akal di level paling awal:
- `duration_sec` harus angka positif, maksimal 3600 detik (1 jam)
- `viewer_name` dan `rc_id` tidak boleh kosong
- RC dengan adapter selain `simulator` wajib punya `ip_address`
- Tidak bisa start sesi baru untuk RC yang sudah `in_use`

### 4. Admin Dashboard (`web-client/admin/admin.html`)

Halaman monitoring real-time: fleet (status + battery), sesi aktif
(dengan tombol hentikan), dan antrian — semua update otomatis lewat
Socket.IO tanpa perlu refresh. Berguna untuk:
- Memantau fleet sebelum dan sesudah live streaming
- Test cepat (tombol "Mulai Sesi Test") tanpa perlu curl manual
- Nanti jadi referensi visual saat bikin `RcPage.jsx` di dashboard React
  Viewer Merusuh (lihat `INTEGRATION_GUIDE.md` Step 4)

### 5. Unit Test (`core/__tests__/`)

37 test untuk command sanitizer dan queue manager sudah dijalankan dan
**lulus semua** di lingkungan development. Test untuk session manager dan
fleet manager juga sudah ditulis, tapi butuh `better-sqlite3` ter-install
dengan benar di mesin kamu untuk dijalankan (karena keduanya pakai database).

Cara jalankan:
```bash
cd rc-module
npm install
npm test
```

Test mencakup kasus "nakal" yang sengaja dicoba dibikin gagal — bukan cuma
happy path:
- Command dengan `NaN`, string aneh, angka di luar rentang
- `duration_sec` negatif, nol, atau lebih dari batas maksimal
- RC yang sudah dipakai tapi dicoba di-assign lagi
- Restart server (simulasi reload dari DB) — RC esp32 harus balik ke `offline`,
  RC simulator boleh tetap `available`

---

## Yang Sengaja BELUM Dikerjakan di Phase 1.5

Supaya jelas batasannya — ini bukan kelupaan, tapi memang ditunda sampai
fase yang relevan:

| Item | Kenapa ditunda |
|------|----------------|
| WebSocket client di `rc-esp32.js` | Butuh hardware fisik untuk test, baru relevan di Phase 3 |
| Kamera streaming (WebRTC/HLS) | Phase 4, butuh keputusan dulu mau pakai mediasoup atau ffmpeg |
| Test untuk `api/server.js` (integration test) | Bisa ditambah, tapi prioritas sekarang di core logic dulu karena itu yang paling sering berubah |
| `drone-mavlink.js` adapter | Phase 4, drone jauh lebih kompleks dan butuh riset keamanan lebih dalam |
| Migrasi data dari `rc-simulator.js` lama ke pola adapter yang konsisten dengan `rc-esp32.js` | Simulator sengaja tetap sederhana (tidak pakai class konstruksi yang sama persis) karena tidak perlu reconnect logic seperti hardware asli |

---

## Checklist Sebelum Lanjut ke Phase 3 (Hardware)

Gunakan ini sebagai patokan kapan kamu siap pegang solder dan ESP32:

- [ ] `npm test` semua lulus di mesin kamu (termasuk yang butuh better-sqlite3)
- [ ] Sudah coba jalankan simulator beberapa hari, fleet dan history tidak hilang setelah restart
- [ ] Sudah coba test queue dengan minimal 2 viewer bersamaan (lihat `docs/SIMULATOR_GUIDE.md`)
- [ ] Admin dashboard sudah dicoba, paham cara baca status RC dan sesi aktif
- [ ] Sudah baca `docs/HARDWARE_GUIDE.md` bagian wiring sebelum beli komponen

---

*Versi dokumen: 0.1.0 — ditulis setelah Phase 1.5 selesai*
