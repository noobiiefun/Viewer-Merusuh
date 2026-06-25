# Integration Guide — RC Module → Viewer Merusuh

Panduan cara menggabungkan RC Module ke aplikasi Viewer Merusuh yang sudah ada.

> ⏳ Panduan ini untuk **Phase 6**. Saat ini fokus di simulator dulu.
> Dokumen ini ditulis sekarang agar saat waktunya tiba, tinggal ikuti step-nya.

---

## Gambaran Integrasi

```
viewer-merusuh/          rc-module/
├── server/              ├── core/
│   ├── core/            │   ├── sessionManager.js
│   │   ├── eventBus.js ─┼──►│   (listen 'donation' event)
│   │   └── ...          │   └── ...
│   ├── adapters/        ├── adapters/
│   └── routes/      ◄───┼── api/routes/
│       └── api.js       │   (tambah tab RC di dashboard)
└── dashboard/           └── web-client/
    └── src/pages/           └── (controller & admin UI)
        └── RcPage.jsx  ◄─── (di-embed atau link dari dashboard)
```

---

## Opsi Integrasi

### Opsi A — Modul Terintegrasi (Rekomendasi)

RC Module berjalan dalam satu proses Electron yang sama.

**Keuntungan:**
- Satu app, satu port
- Bisa share eventBus langsung
- Tidak ada latency HTTP antar proses

**Cara:**

#### Step 1 — Copy folder `rc-module` ke dalam project

```
viewer-merusuh/
├── rc-module/        ← copy ke sini
├── server/
├── dashboard/
└── electron/
```

#### Step 2 — Require RC Module di `server/index.js`

```js
// server/index.js — tambahkan di bagian atas
const rcModule = require('../rc-module/api/server');

// Setelah server Express sudah siap, tambahkan:
rcModule.init({
  app,        // Express app (untuk mount routes /rc/*)
  io,         // Socket.IO instance
  eventBus,   // eventBus Viewer Merusuh
  db,         // SQLite DB instance (opsional, atau RC Module punya DB sendiri)
  config: {
    min_donation_amount: 10000,   // Minimum donasi untuk dapat RC
    amount_per_minute: 5000,      // Rp 5000 per menit
    default_duration_sec: 120,    // Default 2 menit jika tidak ada sisa
  }
});
```

#### Step 3 — RC Module listen ke event donasi

```js
// rc-module/api/server.js
module.exports = {
  init({ app, io, eventBus, config }) {
    
    // Mount routes RC di path /rc
    app.use('/rc', require('./routes/rc'));
    app.use('/rc/session', require('./routes/session'));
    app.use('/rc/queue', require('./routes/queue'));
    
    // Serve web controller
    app.use('/rc/controller', express.static(path.join(__dirname, '../web-client')));
    
    // Listen event donasi dari Viewer Merusuh
    eventBus.on('donation', async (donation) => {
      const { amount, viewer_name, platform } = donation;
      
      // Cek apakah nominal cukup
      if (amount < config.min_donation_amount) return;
      
      // Hitung durasi sewa
      const duration_sec = Math.floor((amount / config.amount_per_minute) * 60);
      
      // Cek RC yang available
      const availableRc = await fleetManager.getAvailable();
      
      if (availableRc) {
        // Langsung assign
        const session = await sessionManager.start({
          rc_id: availableRc.id,
          viewer_name,
          duration_sec,
          source: 'donation',
          donation_amount: amount,
        });
        
        // Broadcast ke OBS overlay dan dashboard
        io.emit('rc_session_start', {
          viewer_name,
          rc_name: availableRc.name,
          duration_sec,
          controller_url: `/rc/controller?token=${session.viewer_token}`,
        });
        
      } else {
        // Masukkan ke antrian
        await queueManager.enqueue({
          viewer_name,
          duration_sec,
          source: 'donation',
        });
        
        io.emit('rc_queued', { viewer_name, position: queuePosition });
      }
    });
  }
};
```

#### Step 4 — Tambah halaman RC di Dashboard React

```jsx
// dashboard/src/pages/RcPage.jsx — file baru
import { useState, useEffect } from 'react';

export default function RcPage() {
  const [fleet, setFleet] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [queue, setQueue] = useState({});

  useEffect(() => {
    // Fetch data awal
    fetch('/rc/api/fleet').then(r => r.json()).then(d => setFleet(d.data));
    fetch('/rc/api/session').then(r => r.json()).then(d => setSessions(d.data));
  }, []);

  return (
    <div className="page">
      <h1>RC Fleet Manager</h1>
      {/* Tabel RC, status, session aktif, queue */}
    </div>
  );
}
```

```jsx
// dashboard/src/App.jsx — tambahkan route
import RcPage from './pages/RcPage';
// ...
<Route path="/rc" element={<RcPage />} />
```

```jsx
// dashboard/src/components/Sidebar.jsx — tambahkan menu
<NavLink to="/rc">🚗 RC Control</NavLink>
```

#### Step 5 — Tambah overlay OBS untuk RC

Di `overlay/index.html`, tambahkan section yang muncul saat ada sesi RC:

```js
// Dalam overlay/index.html <script>
socket.on('rc_session_start', ({ viewer_name, rc_name, duration_sec }) => {
  showRcNotification(`${viewer_name} sedang kontrol ${rc_name} (${duration_sec}s)`);
});
```

---

### Opsi B — Proses Terpisah (Loosely Coupled)

RC Module berjalan sebagai server Node.js terpisah di port 3001.

**Keuntungan:**
- Tidak perlu modifikasi Viewer Merusuh sama sekali
- Bisa dimatikan/dihidupkan terpisah
- Lebih aman untuk eksperimen

**Cara:**

#### Di Viewer Merusuh — Tambah outgoing webhook

```js
// server/adapters/saweria.js atau trakteer.js
// Setelah eventBus.emit('donation', data), tambahkan:

try {
  await fetch('http://localhost:3001/webhook/donation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Key': process.env.RC_INTERNAL_KEY },
    body: JSON.stringify(data),
  });
} catch (err) {
  // RC Module mungkin tidak jalan, tidak apa-apa
  console.log('[RC Module] Tidak terhubung, skip.');
}
```

#### Di RC Module — Terima webhook

```js
// rc-module/api/routes/webhook.js
router.post('/donation', validateInternalKey, async (req, res) => {
  const donation = req.body;
  await handleDonation(donation);
  res.json({ success: true });
});
```

---

## Config Keys Tambahan di `.env` Viewer Merusuh

Untuk Opsi A (terintegrasi):

```env
# RC Module Settings
RC_MODULE_ENABLED=true
RC_MIN_DONATION=10000
RC_AMOUNT_PER_MINUTE=5000
RC_DEFAULT_DURATION=120
RC_MAX_QUEUE=5
```

Untuk Opsi B (terpisah):

```env
# RC Module Webhook
RC_MODULE_URL=http://localhost:3001
RC_INTERNAL_KEY=rahasia123
```

---

## Urutan Pengembangan yang Disarankan

```
1. ✅ Selesaikan Viewer Merusuh dulu (bug-bug yang ada)
2. ✅ Build RC Module simulator (Phase 2) — tanpa hardware
3. ⏳ Test integrasi Opsi B (terpisah) dulu — lebih aman
4. ⏳ Kalau stabil, pindah ke Opsi A (terintegrasi)
5. ⏳ Baru tambah hardware nyata (Phase 3+)
```

---

*Versi dokumen: 0.1.0*
