# Avatar Overlay — Dokumentasi Developer
> Modul live chat avatar pixel untuk OBS, bagian dari ekosistem **Viewer Merusuh**
> Lokasi di repo: `avatar/` (root direktori Viewer Merusuh)
> Viewer yang pernah **donasi** atau **sewa RC** berhak atas avatar — tier & jenis avatar diatur streamer dari dashboard.

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Konsep Sistem Tier Avatar](#2-konsep-sistem-tier-avatar)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Alur Lengkap](#4-alur-lengkap)
5. [Struktur Folder](#5-struktur-folder)
6. [Database Schema](#6-database-schema)
7. [Backend — Server Node.js](#7-backend--server-nodejs)
8. [Frontend — Halaman Pilih Avatar (Viewer)](#8-frontend--halaman-pilih-avatar-viewer)
9. [Frontend — Dashboard Streamer](#9-frontend--dashboard-streamer)
10. [Overlay OBS](#10-overlay-obs)
11. [YouTube Live Chat Reader](#11-youtube-live-chat-reader)
12. [Sistem Avatar & Sprite](#12-sistem-avatar--sprite)
13. [Socket.IO Events](#13-socketio-events)
14. [REST API Reference](#14-rest-api-reference)
15. [Integrasi ke Viewer Merusuh (Future)](#15-integrasi-ke-viewer-merusuh-future)
16. [Integrasi ke RC Module (Future)](#16-integrasi-ke-rc-module-future)
17. [Integrasi ke Client Module (Future)](#17-integrasi-ke-client-module-future)
18. [Roadmap Pengembangan](#18-roadmap-pengembangan)

---

## 1. Gambaran Umum

**Avatar Overlay** adalah modul OBS Browser Source yang menampilkan avatar pixel 2D viewer di layar stream secara real-time. Saat viewer yang **berhak** mengirim pesan di YouTube Live Chat, avatar mereka muncul di overlay dengan animasi berjalan dan speech bubble berisi teks chat tersebut.

**Hak avatar** diperoleh melalui dua jalur:
- Viewer pernah **donasi** (Saweria / Trakteer)
- Viewer pernah **sewa RC** (RC Module)

Streamer mengatur sendiri dari dashboard: tier apa yang ada, avatar mana yang bisa diakses per tier, dan berapa threshold minimumnya.

### Fitur Utama

| Fitur | Keterangan |
|-------|-----------|
| **Avatar Pixel** | Sprite sheet pixel art 2D, dipilih viewer sesuai tier |
| **Speech Bubble** | Teks chat muncul di atas kepala avatar |
| **Walking Animation** | Avatar berjalan masuk/keluar dari tepi layar |
| **Sistem Tier** | Streamer atur tier → avatar eksklusif per tier |
| **Dual Source Hak** | Hak dari donasi ATAU sewa RC, bisa dikombinasi |
| **Halaman Pilih Avatar** | Viewer pilih via link web, hanya avatar sesuai tier yang muncul |
| **Dashboard Streamer** | Kelola tier, avatar, viewer, dan status polling |
| **Standalone dulu** | Berdiri sendiri, siap diintegrasikan ke Viewer Merusuh & RC Module nanti |

---

## 2. Konsep Sistem Tier Avatar

### Apa itu Tier?

Tier adalah level akses avatar yang ditentukan oleh streamer. Streamer bebas menentukan nama, warna, dan avatar apa saja yang masuk ke setiap tier — tidak ada tier default yang kaku.

### Contoh Konfigurasi Tier (di Dashboard Streamer)

```
Tier "Rusuh Biasa"
  - Syarat: donasi minimal Rp 5.000 ATAU pernah sewa RC
  - Avatar yang bisa dipilih: warrior.png, archer.png, mage.png

Tier "Sultan Merusuh"
  - Syarat: donasi minimal Rp 50.000 ATAU sewa RC minimal 3x
  - Avatar yang bisa dipilih: (semua dari tier bawah) + dragon.png, knight_gold.png

Tier "Sponsor RC"
  - Syarat: pernah sewa RC minimal 1x (terlepas dari nominal donasi)
  - Avatar yang bisa dipilih: rc_driver.png, helmet_red.png (avatar khusus RC)
```

> Streamer bisa membuat tier sebanyak yang diinginkan, atau hanya 1 tier saja (semua sama).

### Bagaimana Viewer Mendapat Tier?

```
Viewer donasi Rp 50.000 via Saweria
    ↓
Server Viewer Merusuh menerima webhook donasi
    ↓ (Phase integrasi: eventBus 'donation')
Avatar module menerima event donasi
    ↓
Cek: apakah viewer sudah ada di DB avatar?
    ↓
Bandingkan total donasi viewer dengan threshold tier yang ada
    ↓
Set tier tertinggi yang memenuhi syarat
    ↓
Viewer dapat akses avatar sesuai tier tersebut

— ATAU —

Viewer sewa RC via RC Module
    ↓
RC Module emit event / webhook 'rc_session_start'
    ↓
Avatar module menerima event sewa RC
    ↓
Cek apakah ada tier dengan syarat "pernah sewa RC"
    ↓
Assign tier yang sesuai ke viewer tersebut
```

### Sumber Hak Avatar

| Sumber | Data yang Dipakai | Contoh Penggunaan |
|--------|------------------|-------------------|
| Donasi Saweria | `amount`, `username`, `platform` | Tier berdasarkan total donasi kumulatif |
| Donasi Trakteer | `amount`, `username`, `platform` | Sama seperti Saweria |
| Sewa RC | `viewer_name`, `rc_session_count`, `total_duration_sec` | Tier khusus RC driver |
| Manual (streamer) | — | Streamer assign tier manual dari dashboard |

---

## 3. Arsitektur Sistem

### Fase Saat Ini (Standalone)

```
┌─────────────────────────────────────────────────────────────────┐
│                        PC STREAM / OBS                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │          AVATAR SERVER (Node.js + Express)               │    │
│  │          Port: 3500 (default)                            │    │
│  │                                                          │    │
│  │  • YouTube Chat Poller                                   │    │
│  │  • SQLite DB: viewers, tiers, avatars, donor_log         │    │
│  │  • REST API                                              │    │
│  │  • Socket.IO → broadcast chat event ke overlay           │    │
│  │  • Static: /overlay, /pick, /dashboard                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────┐   ┌──────────────────────────────┐    │
│  │  OBS Browser Source   │   │  Dashboard Streamer           │    │
│  │  :3500/overlay        │   │  :3500/dashboard             │    │
│  └──────────────────────┘   └──────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                │ ngrok / IP lokal
                ▼
┌──────────────────────────────────┐
│  Halaman Pilih Avatar (Viewer)    │
│  https://xxxxx.ngrok.io/pick     │
│  Viewer lihat avatar sesuai tier  │
│  → pilih → simpan                │
└──────────────────────────────────┘
```

### Fase Integrasi (Future)

```
┌────────────────────────────────────────────────────────────────────┐
│                    VIEWER MERUSUH (Server Utama :3000)             │
│                                                                    │
│  eventBus.emit('donation', data) ──────────────────────────────┐  │
│  eventBus.emit('rc_session_start', data) ───────────────────┐  │  │
│                                                             │  │  │
│  ┌──────────────────────────────────────────────────────┐  │  │  │
│  │              avatar/ module                           │◄─┘◄─┘  │
│  │  • tierEngine.js — evaluasi hak tier viewer           │        │
│  │  • ytPoller.js   — baca YouTube Live Chat             │        │
│  │  • avatarDB      — tabel viewers, tiers, avatars      │        │
│  │  • Socket.IO → /overlay                               │        │
│  └──────────────────────────────────────────────────────┘        │
└────────────────────────────────────────────────────────────────────┘
```

### Komponen

| Komponen | Path di repo | Teknologi |
|----------|-------------|-----------|
| Server avatar | `avatar/server/index.js` | Node.js + Express + Socket.IO |
| Tier engine | `avatar/server/core/tierEngine.js` | Logic evaluasi hak tier |
| YouTube poller | `avatar/server/core/ytPoller.js` | `youtube-chat` npm |
| Database | `avatar/server/db/` | SQLite + better-sqlite3 |
| Overlay OBS | `avatar/public/overlay/` | Pure HTML/CSS/JS |
| Halaman pilih avatar | `avatar/public/pick/` | Pure HTML/CSS/JS |
| Dashboard streamer | `avatar/public/dashboard/` | Pure HTML/CSS/JS |
| File avatar sprite | `avatar/public/avatars/` | PNG sprite sheet |

---

## 4. Alur Lengkap

### Alur Setup (Streamer)

```
1. Jalankan server: npm start (di folder avatar/)
2. Buka dashboard: localhost:3500/dashboard
3. Buat tier: nama tier, syarat (min donasi / min sewa RC / manual), avatar yang boleh dipakai
4. Pastikan avatar PNG sudah ada di folder avatars/
5. Input YouTube Live Video ID
6. Klik "Start Polling Chat"
7. Bagikan link /pick ke viewer yang sudah memenuhi syarat
8. Tambah OBS Browser Source: localhost:3500/overlay
```

### Alur Viewer Dapat Hak Avatar

```
[Via Donasi — Standalone Mode]
1. Streamer input manual: "si Clonze donasi Rp 50.000"
   atau (fase integrasi) event donasi masuk otomatis dari Viewer Merusuh

2. tierEngine evaluasi: tier mana yang memenuhi syarat?
3. Assign tier ke viewer di tabel `viewers`
4. Streamer kirim link /pick ke viewer

[Via Sewa RC — Standalone Mode]
1. Streamer input manual: "si Clonze pernah sewa RC"
   atau (fase integrasi) event dari RC Module masuk otomatis

2. tierEngine evaluasi tier RC
3. Assign tier ke viewer
4. Streamer kirim link /pick
```

### Alur Viewer Pilih Avatar

```
1. Viewer buka /pick
2. Input nama YouTube Channel (harus persis seperti yang tampil di chat)
3. Server cek: apakah nama ini ada di tabel viewers dan punya tier?
4. Jika ya: tampilkan hanya avatar yang boleh diakses tier tersebut
5. Viewer pilih avatar (preview animasi langsung)
6. Klik "Simpan" → POST /api/viewers/pick
7. Konfirmasi muncul: "Avatar kamu sudah disimpan! Kamu akan muncul saat chat di live."
```

### Alur Real-time (Saat Live)

```
YouTube Live Chat
    ↓
ytPoller.js polling setiap 3 detik
    ↓
Cek: apakah authorName ada di tabel viewers dengan is_active = 1?
    ↓ (Ya, dan sudah pilih avatar)
Ambil avatar_id + tier viewer
    ↓
Buat payload: { viewer_name, message, avatar_id, tier_id, timestamp }
    ↓
Socket.IO emit('chat_message', payload) → semua client
    ↓
overlay/index.html menerima event
    ↓
Spawn avatar di posisi bawah layar
Avatar berjalan masuk → berhenti
Speech bubble muncul dengan teks chat
Setelah N detik → avatar berjalan keluar → remove
```

---

## 5. Struktur Folder

```
avatar/                            ← root modul, masuk ke repo Viewer Merusuh
│
├── server/
│   ├── index.js                   ← Entry point Express + Socket.IO port 3500
│   ├── core/
│   │   ├── ytPoller.js            ← YouTube Live Chat reader
│   │   └── tierEngine.js          ← Evaluasi hak tier viewer
│   ├── db/
│   │   ├── setup.js               ← Inisialisasi tabel SQLite
│   │   └── avatar.db              ← File DB (gitignore)
│   └── routes/
│       ├── api.js                 ← REST API publik (viewer)
│       └── admin.js               ← REST API dashboard streamer
│
├── public/
│   ├── overlay/
│   │   ├── index.html             ← OBS Browser Source (bg transparent)
│   │   ├── overlay.css
│   │   └── overlay.js             ← Socket.IO client + render avatar
│   │
│   ├── pick/
│   │   ├── index.html             ← Viewer pilih avatar
│   │   ├── pick.css
│   │   └── pick.js
│   │
│   ├── dashboard/
│   │   ├── index.html             ← Dashboard streamer
│   │   ├── dashboard.css
│   │   └── dashboard.js
│   │
│   └── avatars/                   ← Sprite PNG semua avatar
│       ├── warrior.png
│       ├── mage.png
│       ├── archer.png
│       ├── rc_driver.png          ← Avatar eksklusif tier RC
│       ├── knight_gold.png        ← Avatar eksklusif tier Sultan
│       └── ...
│
├── .env
├── package.json
└── README.md
```

> **Catatan `avatars/`:** Drop file PNG ke sini → otomatis terdeteksi server. Streamer assign ke tier via dashboard.

---

## 6. Database Schema

### Tabel `tiers`

```sql
CREATE TABLE IF NOT EXISTS tiers (
  id            TEXT PRIMARY KEY,          -- contoh: "rusuh_biasa", "sultan", "rc_driver"
  display_name  TEXT NOT NULL,             -- nama tampil: "Rusuh Biasa"
  color_hex     TEXT DEFAULT '#ffffff',    -- warna badge tier di dashboard
  min_donation  INTEGER DEFAULT 0,         -- minimum total donasi (Rupiah), 0 = tidak pakai
  min_rc_sessions INTEGER DEFAULT 0,       -- minimum sesi RC, 0 = tidak pakai
  allow_manual  INTEGER DEFAULT 1,         -- streamer bisa assign manual
  priority      INTEGER DEFAULT 0,         -- urutan evaluasi (tier tertinggi = priority tertinggi)
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel `tier_avatars`

```sql
-- Relasi many-to-many: tier ↔ avatar
CREATE TABLE IF NOT EXISTS tier_avatars (
  tier_id    TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  avatar_id  TEXT NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
  PRIMARY KEY (tier_id, avatar_id)
);
```

### Tabel `avatars`

```sql
CREATE TABLE IF NOT EXISTS avatars (
  id            TEXT PRIMARY KEY,          -- filename: "warrior.png"
  display_name  TEXT NOT NULL,             -- nama tampil: "Warrior"
  frame_count   INTEGER DEFAULT 4,
  frame_width   INTEGER DEFAULT 32,
  frame_height  INTEGER DEFAULT 48,
  is_enabled    INTEGER DEFAULT 1
);
```

### Tabel `viewers`

```sql
CREATE TABLE IF NOT EXISTS viewers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_name     TEXT NOT NULL UNIQUE,
  tier_id          TEXT REFERENCES tiers(id),       -- tier saat ini
  avatar_id        TEXT REFERENCES avatars(id),     -- avatar yang dipilih
  total_donation   INTEGER DEFAULT 0,               -- akumulasi donasi (Rupiah)
  total_rc_sessions INTEGER DEFAULT 0,              -- total sesi RC
  assigned_by      TEXT DEFAULT 'auto',             -- 'auto' | 'manual'
  registered_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen        DATETIME,
  is_active        INTEGER DEFAULT 1
);
```

### Tabel `donor_log`

```sql
-- Riwayat event yang menentukan hak avatar
CREATE TABLE IF NOT EXISTS donor_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_name TEXT NOT NULL,
  event_type   TEXT NOT NULL,     -- 'donation' | 'rc_session' | 'manual'
  amount       INTEGER DEFAULT 0, -- nominal donasi (jika donation)
  platform     TEXT,              -- 'saweria' | 'trakteer' | 'rc_module' | 'manual'
  meta         TEXT,              -- JSON bebas (rc_id, session_id, catatan, dll)
  tier_before  TEXT,              -- tier sebelum event ini
  tier_after   TEXT,              -- tier sesudah event ini (jika ada perubahan)
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel `chat_log`

```sql
CREATE TABLE IF NOT EXISTS chat_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_name TEXT NOT NULL,
  avatar_id    TEXT,
  tier_id      TEXT,
  message      TEXT NOT NULL,
  sent_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Backend — Server Node.js

### `server/index.js`

```javascript
// Tanggung jawab:
// - Express + Socket.IO di port 3500
// - Serve static: /avatars, /overlay, /pick, /dashboard
// - Mount routes /api dan /admin
// - Export io instance untuk ytPoller dan tierEngine
// - Load .env, inisialisasi DB

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');
require('dotenv').config();

const { setupDB } = require('./db/setup');
const apiRoutes   = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

setupDB(); // Buat tabel jika belum ada

app.use(express.json());
app.use('/avatars',   express.static(path.join(__dirname, '../public/avatars')));
app.use('/overlay',   express.static(path.join(__dirname, '../public/overlay')));
app.use('/pick',      express.static(path.join(__dirname, '../public/pick')));
app.use('/dashboard', express.static(path.join(__dirname, '../public/dashboard')));
app.use('/api',   apiRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 3500;
server.listen(PORT, () => {
  console.log(`[Avatar] Server: http://localhost:${PORT}`);
});

module.exports = { io };
```

---

### `server/core/tierEngine.js`

```javascript
// Tanggung jawab:
// - Evaluasi tier viewer berdasarkan total_donation dan total_rc_sessions
// - Selalu ambil tier dengan priority tertinggi yang terpenuhi
// - Dipanggil setiap kali ada event donasi atau sesi RC baru
// - Bisa dipanggil juga dari admin untuk re-evaluasi manual

const db = require('../db/setup').getDB();

/**
 * Evaluasi dan update tier viewer berdasarkan data terbaru.
 * @param {string} youtubeName
 * @returns {object|null} tier baru jika berubah, null jika tidak berubah
 */
function evaluateTier(youtubeName) {
  const viewer = db.prepare(
    `SELECT * FROM viewers WHERE LOWER(youtube_name) = LOWER(?)`
  ).get(youtubeName);

  if (!viewer) return null;

  // Ambil semua tier, urutkan dari priority tertinggi
  const tiers = db.prepare(
    `SELECT * FROM tiers ORDER BY priority DESC`
  ).all();

  let newTier = null;

  for (const tier of tiers) {
    const donationOk  = tier.min_donation   === 0 || viewer.total_donation    >= tier.min_donation;
    const rcOk        = tier.min_rc_sessions === 0 || viewer.total_rc_sessions >= tier.min_rc_sessions;

    // Tier terpenuhi jika SALAH SATU syarat yang di-set terpenuhi
    // (keduanya 0 berarti tier ini hanya bisa di-assign manual)
    if (tier.min_donation === 0 && tier.min_rc_sessions === 0) continue;
    if (donationOk || rcOk) {
      newTier = tier;
      break; // ambil yang priority tertinggi saja
    }
  }

  if (newTier && newTier.id !== viewer.tier_id) {
    db.prepare(
      `UPDATE viewers SET tier_id = ? WHERE LOWER(youtube_name) = LOWER(?)`
    ).run(newTier.id, youtubeName);
    return newTier;
  }

  return null;
}

/**
 * Tambah donasi ke viewer dan evaluasi ulang tier.
 * Jika viewer belum ada, buat dulu.
 */
function addDonation({ youtubeName, amount, platform, meta = {} }) {
  // Upsert viewer
  db.prepare(`
    INSERT INTO viewers (youtube_name, total_donation)
    VALUES (?, ?)
    ON CONFLICT(youtube_name) DO UPDATE SET
      total_donation = total_donation + excluded.total_donation
  `).run(youtubeName, amount);

  // Log event
  const viewerBefore = db.prepare(
    `SELECT tier_id FROM viewers WHERE LOWER(youtube_name) = LOWER(?)`
  ).get(youtubeName);

  const newTier = evaluateTier(youtubeName);

  db.prepare(`
    INSERT INTO donor_log (youtube_name, event_type, amount, platform, meta, tier_before, tier_after)
    VALUES (?, 'donation', ?, ?, ?, ?, ?)
  `).run(
    youtubeName, amount, platform,
    JSON.stringify(meta),
    viewerBefore?.tier_id ?? null,
    newTier?.id ?? viewerBefore?.tier_id ?? null
  );

  return newTier;
}

/**
 * Tambah sesi RC ke viewer dan evaluasi ulang tier.
 */
function addRcSession({ youtubeName, sessionId, rcId, durationSec }) {
  db.prepare(`
    INSERT INTO viewers (youtube_name, total_rc_sessions)
    VALUES (?, 1)
    ON CONFLICT(youtube_name) DO UPDATE SET
      total_rc_sessions = total_rc_sessions + 1
  `).run(youtubeName);

  const viewerBefore = db.prepare(
    `SELECT tier_id FROM viewers WHERE LOWER(youtube_name) = LOWER(?)`
  ).get(youtubeName);

  const newTier = evaluateTier(youtubeName);

  db.prepare(`
    INSERT INTO donor_log (youtube_name, event_type, platform, meta, tier_before, tier_after)
    VALUES (?, 'rc_session', 'rc_module', ?, ?, ?)
  `).run(
    youtubeName,
    JSON.stringify({ session_id: sessionId, rc_id: rcId, duration_sec: durationSec }),
    viewerBefore?.tier_id ?? null,
    newTier?.id ?? viewerBefore?.tier_id ?? null
  );

  return newTier;
}

module.exports = { evaluateTier, addDonation, addRcSession };
```

---

### `server/core/ytPoller.js`

```javascript
// Tanggung jawab:
// - Polling YouTube Live Chat
// - Filter hanya viewer yang terdaftar + sudah pilih avatar + is_active
// - Emit Socket.IO event 'chat_message'
// - Simpan ke chat_log

class YtPoller {
  constructor(io, db) {
    this.io = io;
    this.db = db;
    this.isRunning = false;
  }

  async start(videoId) { /* init youtube-chat library, mulai polling */ }

  async handleMessage(msg) {
    const senderName = msg.author.name;

    const viewer = this.db.prepare(`
      SELECT v.*, a.id as avatar_file
      FROM viewers v
      LEFT JOIN avatars a ON v.avatar_id = a.id
      WHERE LOWER(v.youtube_name) = LOWER(?)
        AND v.is_active = 1
        AND v.avatar_id IS NOT NULL
        AND v.tier_id IS NOT NULL
    `).get(senderName);

    if (!viewer) return; // Belum terdaftar atau belum pilih avatar

    // Update last_seen
    this.db.prepare(
      `UPDATE viewers SET last_seen = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(viewer.id);

    // Simpan chat log
    this.db.prepare(
      `INSERT INTO chat_log (youtube_name, avatar_id, tier_id, message) VALUES (?, ?, ?, ?)`
    ).run(viewer.youtube_name, viewer.avatar_id, viewer.tier_id, msg.message);

    // Broadcast ke overlay
    this.io.emit('chat_message', {
      viewer_name: viewer.youtube_name,
      avatar_id:   viewer.avatar_id,
      tier_id:     viewer.tier_id,
      message:     msg.message,
      timestamp:   Date.now(),
    });
  }

  stop() { this.isRunning = false; }
}

module.exports = YtPoller;
```

---

### `server/routes/api.js` — Endpoint Publik (Viewer)

```
GET  /api/viewers/check?name=Clonze
     → Cek apakah nama terdaftar, tier apa, sudah pilih avatar belum
     → Response: { registered: bool, tier: {...}, has_avatar: bool, avatar_id: string|null }

GET  /api/avatars?tier_id=rusuh_biasa
     → List avatar yang bisa dipilih viewer dengan tier tersebut
     → Filter: hanya is_enabled=1, hanya yang di tier_avatars tier tersebut

POST /api/viewers/pick
     → Viewer submit pilihan avatar
     → Body: { youtube_name, avatar_id }
     → Validasi: avatar harus ada di tier viewer
     → Response: { success: true, message: "Avatar disimpan!" }

GET  /api/status
     → Status server: isPolling, videoId, viewerCount, avatarCount, tierCount
```

---

### `server/routes/admin.js` — Endpoint Dashboard Streamer

```
# Tier Management
GET    /admin/tiers                     → List semua tier + jumlah viewer per tier
POST   /admin/tiers                     → Buat tier baru
PUT    /admin/tiers/:id                 → Update tier (nama, syarat, warna)
DELETE /admin/tiers/:id                 → Hapus tier
POST   /admin/tiers/:id/avatars         → Assign avatar ke tier, body: { avatar_id }
DELETE /admin/tiers/:id/avatars/:avid   → Lepas avatar dari tier

# Avatar Management
GET    /admin/avatars                   → List semua avatar (include disabled)
POST   /admin/avatars/sync              → Scan ulang folder /avatars, daftarkan yang baru
PUT    /admin/avatars/:id               → Update display_name, frame_count, dll
POST   /admin/avatars/:id/toggle        → Enable/disable avatar

# Viewer Management
GET    /admin/viewers                   → List semua viewer + tier + avatar + statistik
POST   /admin/viewers                   → Tambah viewer manual: { youtube_name, tier_id }
PUT    /admin/viewers/:id/tier          → Override tier manual: { tier_id }
POST   /admin/viewers/:id/donation      → Input donasi manual: { amount, platform }
POST   /admin/viewers/:id/rc-session    → Input sesi RC manual: { session_id, rc_id, duration_sec }
DELETE /admin/viewers/:id               → Hapus viewer
POST   /admin/viewers/:id/toggle        → Aktifkan/nonaktifkan viewer

# Polling Control
POST   /admin/polling/start             → Start YouTube polling: { video_id }
POST   /admin/polling/stop              → Stop polling
GET    /admin/polling/status            → Status polling saat ini

# Log
GET    /admin/donor-log                 → Riwayat event donasi/RC: ?viewer=&limit=
GET    /admin/chat-log                  → Riwayat chat yang masuk: ?viewer=&limit=
```

---

## 8. Frontend — Halaman Pilih Avatar (Viewer)

### `public/pick/index.html` — Flow

```
1. Viewer buka /pick
2. Form muncul: input nama YouTube Channel
3. Klik "Cek Status" → GET /api/viewers/check?name=...
   → Jika tidak terdaftar: tampilkan pesan "Nama kamu belum ada di daftar.
     Minta link ke streamer setelah donasi atau sewa RC."
   → Jika terdaftar tapi belum pilih avatar: lanjut ke step 4
   → Jika sudah pilih avatar: tampilkan avatar saat ini + opsi ganti
4. Tampilkan grid avatar yang bisa dipilih (sesuai tier viewer)
   → Setiap card: gambar animasi preview + nama avatar + badge tier
5. Viewer klik avatar → POST /api/viewers/pick
6. Konfirmasi sukses
```

### `public/pick/pick.js` — Struktur Fungsi

```javascript
async function checkViewer(youtubeName)    // GET /api/viewers/check
async function loadAvatarGrid(tierId)      // GET /api/avatars?tier_id=
function renderAvatarCard(avatar)          // Render card dengan animasi CSS
function selectAvatar(avatarId)            // Highlight pilihan
async function submitPick(youtubeName, avatarId)  // POST /api/viewers/pick
function showError(msg)
function showSuccess(msg)
```

---

## 9. Frontend — Dashboard Streamer

### Sections Dashboard

#### Tab 1: Tier Manager
- Tabel semua tier: nama, warna badge, syarat (min donasi / min RC), jumlah viewer, jumlah avatar
- Tombol buat tier baru (form popup)
- Per tier: edit syarat, kelola avatar yang assign ke tier ini (drag & drop atau checklist)

#### Tab 2: Avatar Manager
- Grid semua avatar di folder `avatars/`
- Tombol "Scan Folder" → sync file PNG baru
- Per avatar: preview animasi, nama, frame info, toggle enable, tier yang memakai avatar ini

#### Tab 3: Viewer Manager
- Tabel: nama YouTube, tier, avatar, total donasi, total sesi RC, terakhir chat
- Filter by tier
- Aksi per viewer: ganti tier manual, hapus, nonaktifkan
- Tombol "Tambah Viewer Manual" → form: nama + tier

#### Tab 4: Input Event Manual
- Form: input donasi manual → nama viewer + nominal + platform
- Form: input sesi RC manual → nama viewer + RC ID + durasi
- Berguna sebelum fase integrasi otomatis

#### Tab 5: Polling Control
- Input Video ID YouTube
- Start/Stop polling
- Status indicator
- Log chat real-time

---

## 10. Overlay OBS

### Setup di OBS

```
Sources → + → Browser
URL    : http://localhost:3500/overlay
Width  : 1920
Height : 1080
```

> ⚠️ Background HARUS transparan. `body { background: transparent; }`

### `public/overlay/overlay.js` — Logika Render

```javascript
const socket = io('http://localhost:3500');

socket.on('chat_message', (data) => {
  spawnAvatar(data);
});

function spawnAvatar({ viewer_name, avatar_id, tier_id, message }) {
  // 1. Cek apakah avatar viewer ini sudah ada di layar (bisa update bubble saja)
  // 2. Jika belum: buat elemen baru
  // 3. Posisi: bottom layar, X random atau berdasarkan slot
  // 4. Set sprite: background-image ke /avatars/<avatar_id>
  // 5. Animasi walk-in dari tepi layar
  // 6. Setelah tiba: tampilkan speech bubble + nama viewer
  // 7. Timer: setelah BUBBLE_DURATION → hide bubble
  // 8. Timer: setelah IDLE_DURATION → walk-out → remove elemen
}
```

### Struktur Elemen DOM Avatar

```
div.avatar-container[data-viewer="Clonze"]
  ├── div.speech-bubble
  │     └── span.bubble-text     ← isi chat
  ├── div.avatar-name             ← nama viewer (+ badge tier opsional)
  └── div.avatar-sprite           ← CSS sprite animation
```

### CSS Walk Cycle

```css
/* Sprite sheet horizontal: 4 frame × 32px */
.avatar-sprite {
  width: 32px;
  height: 48px;
  image-rendering: pixelated;     /* Jaga ketajaman pixel art */
  background-image: url('/avatars/warrior.png');
  animation: walk-cycle 0.5s steps(4) infinite;
  transform: scale(2);            /* 2× pixel scale */
}

@keyframes walk-cycle {
  from { background-position-x: 0; }
  to   { background-position-x: -128px; } /* 4 × 32px */
}

/* Mirror saat jalan ke kiri */
.avatar-sprite.facing-left {
  transform: scale(2) scaleX(-1);
}
```

### State Machine Avatar

```
[SPAWN]         → Element dibuat, posisi di luar layar kanan/kiri
     ↓
[WALK_IN]       → CSS transition: posisi geser ke dalam layar
     ↓
[ARRIVE]        → Animasi berhenti (atau idle loop jika ada)
     ↓
[BUBBLE_SHOW]   → Speech bubble fade in + teks chat
     ↓
[BUBBLE_HIDE]   → Setelah BUBBLE_DURATION ms: bubble fade out
     ↓
[IDLE]          → Avatar diam (atau looping idle animation)
     ↓            Jika ada chat baru dari viewer ini → kembali ke BUBBLE_SHOW
[WALK_OUT]      → Setelah IDLE_DURATION ms: jalan keluar layar
     ↓
[REMOVED]       → Element dihapus dari DOM
```

### Config Overlay (via `.env`)

| Variable | Default | Keterangan |
|----------|---------|-----------|
| `BUBBLE_DURATION_MS` | `5000` | Lama speech bubble tampil |
| `IDLE_DURATION_MS` | `12000` | Lama avatar idle sebelum exit |
| `MAX_AVATARS` | `8` | Maksimal avatar di layar |
| `AVATAR_SCALE` | `2` | Pixel scale (2 = 64×96px) |
| `WALK_SPEED_PX_S` | `80` | Kecepatan jalan (px/detik) |

---

## 11. YouTube Live Chat Reader

### Pilihan Implementasi

#### Opsi A — Library `youtube-chat` (Dev/MVP)
```bash
npm install youtube-chat
```
Tidak butuh API key. Cocok untuk development awal.

#### Opsi B — YouTube Data API v3 (Production)
Butuh API key dari Google Cloud Console. Lebih stabil dan ada quota resmi.

**Rekomendasi:** Mulai Opsi A, upgrade ke Opsi B untuk production.

### Matching Logic

```javascript
// Case-insensitive match nama YouTube
const viewer = db.prepare(`
  SELECT v.*, t.id as tier_id
  FROM viewers v
  JOIN tiers t ON v.tier_id = t.id
  WHERE LOWER(v.youtube_name) = LOWER(?)
    AND v.is_active = 1
    AND v.avatar_id IS NOT NULL
`).get(senderName);
```

---

## 12. Sistem Avatar & Sprite

### Format Sprite Sheet

Semua avatar menggunakan **horizontal sprite sheet PNG**:

```
┌────────┬────────┬────────┬────────┐
│ Frame1 │ Frame2 │ Frame3 │ Frame4 │  ← walk cycle
└────────┴────────┴────────┴────────┘
```

**Spesifikasi standar:**
- Format: PNG + transparansi (alpha)
- Frame default: `32 × 48 px`, 4 frame walk cycle
- Sprite sheet width: `32 × 4 = 128 px`
- `image-rendering: pixelated` di CSS untuk ketajaman pixel art

**Catatan tier eksklusif:** Avatar untuk tier RC Driver (misal `rc_driver.png`) secara visual bisa berbeda gaya — helm, baju balap, dll. Tidak ada perbedaan teknis, hanya tier_avatars-nya yang di-assign ke tier RC saja.

### Cara Tambah Avatar Baru

```
1. Buat sprite sheet PNG sesuai spesifikasi
2. Drop ke folder avatar/public/avatars/
3. Dashboard → Tab "Avatar Manager" → klik "Scan Folder"
4. Avatar baru muncul → set display_name, frame info jika beda dari default
5. Assign ke tier yang diinginkan
6. Avatar langsung tersedia di /pick untuk tier tersebut
```

---

## 13. Socket.IO Events

### Server → Client

| Event | Payload | Penerima | Keterangan |
|-------|---------|----------|-----------|
| `chat_message` | `{ viewer_name, avatar_id, tier_id, message, timestamp }` | overlay, dashboard | Chat dari viewer terdaftar |
| `polling_status` | `{ isRunning, videoId }` | dashboard | Update status polling |
| `viewer_registered` | `{ youtube_name, tier_id, avatar_id }` | dashboard | Viewer baru pilih avatar |
| `tier_updated` | `{ tier_id }` | dashboard | Tier diubah |
| `viewer_tier_changed` | `{ youtube_name, old_tier, new_tier }` | dashboard, overlay | Tier viewer berubah (opsional untuk efek visual) |

---

## 14. REST API Reference

### `GET /api/viewers/check?name=Clonze`

```json
{
  "success": true,
  "data": {
    "registered": true,
    "youtube_name": "Clonze",
    "tier": {
      "id": "sultan",
      "display_name": "Sultan Merusuh",
      "color_hex": "#FFD700"
    },
    "has_avatar": true,
    "avatar_id": "warrior.png"
  }
}
```

### `GET /api/avatars?tier_id=sultan`

```json
{
  "success": true,
  "data": [
    { "id": "warrior.png",    "display_name": "Warrior",     "frame_count": 4, "frame_width": 32, "frame_height": 48 },
    { "id": "knight_gold.png","display_name": "Knight Gold", "frame_count": 4, "frame_width": 32, "frame_height": 48 }
  ]
}
```

### `POST /api/viewers/pick`

```json
// Request
{ "youtube_name": "Clonze", "avatar_id": "knight_gold.png" }

// Response sukses
{ "success": true, "message": "Avatar berhasil disimpan!" }

// Error: avatar tidak ada di tier viewer
{ "success": false, "error": "Avatar ini tidak tersedia untuk tier kamu." }

// Error: viewer belum terdaftar
{ "success": false, "error": "Nama kamu belum terdaftar. Minta link dari streamer setelah donasi atau sewa RC." }
```

### `POST /admin/viewers` — Tambah Viewer Manual

```json
// Request
{ "youtube_name": "Digitalpacman", "tier_id": "rusuh_biasa" }

// Response
{ "success": true, "data": { "id": 5, "youtube_name": "Digitalpacman", "tier_id": "rusuh_biasa" } }
```

### `POST /admin/viewers/:id/donation` — Input Donasi Manual

```json
// Request
{ "amount": 50000, "platform": "saweria", "note": "Donasi stream tgl 1 Jan" }

// Response (jika tier naik)
{
  "success": true,
  "data": {
    "new_total_donation": 75000,
    "tier_changed": true,
    "old_tier": "rusuh_biasa",
    "new_tier": "sultan"
  }
}
```

### `POST /admin/viewers/:id/rc-session` — Input Sesi RC Manual

```json
// Request
{ "session_id": "sess_abc123", "rc_id": "rc_001", "duration_sec": 300 }

// Response
{
  "success": true,
  "data": {
    "total_rc_sessions": 2,
    "tier_changed": false,
    "current_tier": "rusuh_biasa"
  }
}
```

---

## 15. Integrasi ke Viewer Merusuh (Future)

Ketika diintegrasikan, modul `avatar/` masuk ke dalam repo Viewer Merusuh dan menggunakan `eventBus` yang sudah ada.

### Hook ke eventBus Donasi

```javascript
// avatar/server/integration/viewerMerusuh.js

const tierEngine = require('../core/tierEngine');

function initViewerMerusuhIntegration(eventBus, io) {

  // Donasi masuk → evaluasi tier otomatis
  eventBus.on('donation', async (donation) => {
    const { username, amount, platform } = donation;

    const newTier = tierEngine.addDonation({
      youtubeName: username,
      amount,
      platform,
      meta: { source: 'viewer_merusuh_event' }
    });

    if (newTier) {
      console.log(`[Avatar] ${username} naik ke tier: ${newTier.display_name}`);
      io.emit('viewer_tier_changed', {
        youtube_name: username,
        new_tier: newTier.id
      });
    }
  });

}

module.exports = { initViewerMerusuhIntegration };
```

### Cara Mount di `server/index.js` Viewer Merusuh

```javascript
// server/index.js — tambahkan setelah server siap
if (process.env.AVATAR_MODULE_ENABLED === 'true') {
  const avatarModule = require('../avatar/server');
  avatarModule.init({ app, io, eventBus });
}
```

### Tambahan `.env` Viewer Merusuh

```env
# Avatar Module
AVATAR_MODULE_ENABLED=true
AVATAR_PORT=3500
```

---

## 16. Integrasi ke RC Module (Future)

### Hook Event Sesi RC

RC Module sudah memiliki Socket.IO event `session_start`. Avatar module mendengarkan event ini untuk menambah `total_rc_sessions` viewer dan evaluasi tier.

```javascript
// avatar/server/integration/rcModule.js

const tierEngine = require('../core/tierEngine');

/**
 * Opsi A: Jika RC Module dan Avatar berjalan dalam proses yang sama
 * (shared eventBus atau direct require)
 */
function initRcModuleIntegration(rcModuleIo, avatarIo) {
  rcModuleIo.on('session_start', async (sessionData) => {
    const { viewer_name, session_id, rc_id, duration_sec } = sessionData;

    const newTier = tierEngine.addRcSession({
      youtubeName: viewer_name,
      sessionId:   session_id,
      rcId:        rc_id,
      durationSec: duration_sec,
    });

    if (newTier) {
      avatarIo.emit('viewer_tier_changed', {
        youtube_name: viewer_name,
        new_tier: newTier.id,
      });
    }
  });
}

/**
 * Opsi B: RC Module dan Avatar berjalan di port terpisah
 * RC Module POST ke webhook Avatar module
 */
// Di RC Module (server/index.js), tambahkan setelah session dibuat:
//
// await fetch('http://localhost:3500/webhook/rc-session', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json', 'X-Internal-Key': process.env.AVATAR_INTERNAL_KEY },
//   body: JSON.stringify({ viewer_name, session_id, rc_id, duration_sec })
// });

module.exports = { initRcModuleIntegration };
```

### Endpoint Webhook dari RC Module (Opsi B)

```
POST /webhook/rc-session
Headers: X-Internal-Key: <AVATAR_INTERNAL_KEY>
Body: { viewer_name, session_id, rc_id, duration_sec }
```

### Avatar Eksklusif RC di Overlay (Future Enhancement)

Saat RC Module aktif dan ada viewer yang sedang kontrol RC, overlay bisa menampilkan efek khusus:

```javascript
// Di overlay.js
socket.on('rc_session_start', ({ viewer_name, rc_name }) => {
  const avatar = getAvatarOnScreen(viewer_name);
  if (avatar) {
    // Tambahkan badge "🎮 Kontrol RC" di atas nama avatar
    showRcBadge(avatar, rc_name);
  }
});

socket.on('rc_session_end', ({ viewer_name }) => {
  removeRcBadge(viewer_name);
});
```

---

## 17. Integrasi ke Client Module (Future)

Client Module (PC Gaming) tidak berinteraksi langsung dengan Avatar Overlay. Namun ada satu skenario menarik untuk masa depan:

**Skenario:** Saat efek game dieksekusi (misal "rem mendadak"), avatar viewer yang mentrigger efek tersebut bisa bereaksi di overlay.

```javascript
// Ketika efek game selesai dieksekusi di Client Module,
// server Viewer Merusuh emit event ke semua client termasuk overlay avatar:

// Di avatar/overlay.js (setelah integrasi):
socket.on('effect_executed', ({ viewer_name, effect_name }) => {
  const avatar = getAvatarOnScreen(viewer_name);
  if (avatar) {
    triggerAvatarReaction(avatar, effect_name);
    // Contoh: avatar melompat, berputar, atau speech bubble berubah warna merah
  }
});
```

Ini **tidak perlu diimplementasi sekarang**, tapi arsitekturnya sudah mendukung karena semua event lewat Socket.IO yang sama.

---

## 18. Roadmap Pengembangan

### Phase 1 — MVP Standalone
- [ ] Setup `avatar/` folder + `npm init` + install deps
- [ ] `server/db/setup.js` — buat semua tabel
- [ ] `server/core/tierEngine.js` — logic evaluasi tier
- [ ] `server/routes/admin.js` — CRUD tier, avatar, viewer (minimal)
- [ ] `server/routes/api.js` — check viewer, list avatar per tier, submit pick
- [ ] `server/core/ytPoller.js` — YouTube chat polling (Opsi A: `youtube-chat`)
- [ ] `server/index.js` — entry point Express + Socket.IO
- [ ] `public/overlay/` — OBS overlay dengan walk animation + speech bubble
- [ ] `public/pick/` — halaman pilih avatar dengan check tier
- [ ] `public/dashboard/` — dashboard streamer (semua 5 tab)
- [ ] Minimal 3–5 avatar pixel art siap pakai di `public/avatars/`

### Phase 2 — Polish Standalone
- [ ] Walk animation masuk/keluar dari tepi layar
- [ ] Avatar slot system: max N avatar, antrian jika penuh
- [ ] Config panel di dashboard (scale, speed, duration)
- [ ] YouTube API v3 resmi (upgrade dari `youtube-chat`)
- [ ] Re-evaluasi tier otomatis saat streamer ubah syarat tier

### Phase 3 — Integrasi Viewer Merusuh
- [ ] `avatar/server/integration/viewerMerusuh.js`
- [ ] Hook `eventBus.on('donation')` → `tierEngine.addDonation()`
- [ ] Mount avatar module di `server/index.js` Viewer Merusuh
- [ ] Test alur donasi → tier → pick → overlay

### Phase 4 — Integrasi RC Module
- [ ] `avatar/server/integration/rcModule.js`
- [ ] Webhook `POST /webhook/rc-session` atau shared event
- [ ] Avatar eksklusif RC Driver
- [ ] Badge "🎮 Kontrol RC" di overlay saat sesi RC aktif

### Phase 5 — Integrasi Client Module
- [ ] Event `effect_executed` dari server → reaksi avatar di overlay
- [ ] Animasi reaksi avatar (lompat, berputar, bubble warna merah)

---

## Catatan Teknis

### Environment Variables (`avatar/.env`)

| Variable | Default | Keterangan |
|----------|---------|-----------|
| `PORT` | `3500` | Port avatar server |
| `YT_API_KEY` | — | YouTube Data API v3 key (Phase 2) |
| `POLL_INTERVAL_MS` | `3000` | Interval polling chat |
| `MAX_AVATARS` | `8` | Maks avatar di overlay bersamaan |
| `BUBBLE_DURATION_MS` | `5000` | Lama speech bubble |
| `IDLE_DURATION_MS` | `12000` | Lama avatar idle sebelum exit |
| `AVATAR_SCALE` | `2` | Pixel scale |
| `AVATAR_INTERNAL_KEY` | — | Shared secret untuk webhook dari RC Module |

### Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.6.0",
    "better-sqlite3": "^9.0.0",
    "youtube-chat": "^2.0.0",
    "dotenv": "^16.0.0"
  }
}
```

### Port yang Digunakan

| Service | Port |
|---------|------|
| Viewer Merusuh (server utama) | `3000` |
| RC Module | `3001` |
| Avatar Overlay | `3500` |

---

*Dokumentasi ini adalah perencanaan sebelum coding dimulai.*
*Versi: 0.2.0-docs | Modul: Avatar Overlay for Viewer Merusuh*
*Lokasi di repo: `avatar/` (root Viewer Merusuh)*
*Sumber hak avatar: Donasi (Saweria/Trakteer) + Sewa RC Module*
