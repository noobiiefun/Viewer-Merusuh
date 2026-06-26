/**
 * avatar/server/index.js
 * ─────────────────────────────────────────────
 * Entry point Avatar Overlay module.
 *
 * Yang dilakukan:
 *   1. Load .env
 *   2. Inisialisasi SQLite (semua tabel)
 *   3. Buat Express app + HTTP server + Socket.IO
 *   4. Serve static files: /avatars, /overlay, /pick, /dashboard
 *   5. Mount routes (belum ada di fase ini, segera ditambah)
 *   6. Listen di port 3500
 *
 * Tahap ini: server sudah bisa jalan, DB sudah siap.
 * Routes dan poller akan ditambah di langkah berikutnya.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const path      = require('path');

const { setupDB } = require('./db/setup');

// ─── 1. Inisialisasi DB ───────────────────────────────────────────────────────
setupDB();

// ─── 2. Express + Socket.IO ──────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' }  // longgar untuk dev; bisa diperketat nanti
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── 3. Static Files ─────────────────────────────────────────────────────────
const PUBLIC = path.join(__dirname, '../public');

app.use('/avatars',   express.static(path.join(PUBLIC, 'avatars')));
app.use('/overlay',   express.static(path.join(PUBLIC, 'overlay')));
app.use('/pick',      express.static(path.join(PUBLIC, 'pick')));
app.use('/dashboard', express.static(path.join(PUBLIC, 'dashboard')));

// ─── 4. Routes ───────────────────────────────────────────────────────────────
// TODO (langkah berikutnya): uncomment setelah routes dibuat
// const apiRoutes   = require('./routes/api');
// const adminRoutes = require('./routes/admin');
// app.use('/api',   apiRoutes);
// app.use('/admin', adminRoutes);

// Placeholder endpoint — konfirmasi server jalan
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    module: 'Avatar Overlay',
    version: '0.1.0',
    endpoints: {
      overlay:   '/overlay',
      pick:      '/pick',
      dashboard: '/dashboard',
      avatars:   '/avatars/<filename>',
    }
  });
});

// ─── 5. Socket.IO ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Avatar IO] Client terhubung: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Avatar IO] Client putus: ${socket.id}`);
  });
});

// ─── 6. Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3500;

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       Avatar Overlay — v0.1.0            ║');
  console.log(`║  http://localhost:${PORT}                    ║`);
  console.log('║                                          ║');
  console.log(`║  Overlay   → /overlay                   ║`);
  console.log(`║  Pick      → /pick                      ║`);
  console.log(`║  Dashboard → /dashboard                  ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

// Export io supaya bisa dipakai ytPoller & tierEngine nanti
module.exports = { app, io };
