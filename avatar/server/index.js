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
 *   5. Mount routes /api dan /admin
 *   6. Inisialisasi YtPoller dan pasang ke app.locals
 *   7. Listen di port 3500
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');

const { setupDB } = require('./db/setup');
const YtPoller    = require('./core/ytPoller');

// ─── 1. Inisialisasi DB ───────────────────────────────────────────────────────
setupDB();

// ─── 2. Express + Socket.IO ──────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' }  // longgar untuk dev; perketat untuk production
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── 3. Static Files ─────────────────────────────────────────────────────────
const PUBLIC = path.join(__dirname, '../public');

app.use('/avatars',   express.static(path.join(PUBLIC, 'avatars')));
app.use('/overlay',   express.static(path.join(PUBLIC, 'overlay')));
app.use('/pick',      express.static(path.join(PUBLIC, 'pick')));
app.use('/dashboard', express.static(path.join(PUBLIC, 'dashboard')));

// ─── 4. YtPoller — inisialisasi dan simpan ke app.locals ─────────────────────
// app.locals.polling  → state { isPolling, videoId } dibaca oleh /api/status
// app.locals.poller   → instance YtPoller, dipakai oleh /admin/polling/start|stop
const poller = new YtPoller(io, app);

app.locals.polling = { isPolling: false, videoId: null };
app.locals.poller  = poller;

// ─── 5. Routes ───────────────────────────────────────────────────────────────
const apiRoutes   = require('./routes/api');
const adminRoutes = require('./routes/admin');
app.use('/api',   apiRoutes);
app.use('/admin', adminRoutes);

// Root — konfirmasi server jalan
app.get('/', (_req, res) => {
  res.json({
    status:  'ok',
    module:  'Avatar Overlay',
    version: '0.1.0',
    endpoints: {
      overlay:   '/overlay',
      pick:      '/pick',
      dashboard: '/dashboard',
      avatars:   '/avatars/<filename>',
      api:       '/api/status',
    }
  });
});

// ─── 6. Socket.IO ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Avatar IO] Client terhubung: ${socket.id}`);

  // Kirim state polling terkini ke client yang baru connect
  socket.emit('polling_status', app.locals.polling);

  socket.on('disconnect', () => {
    console.log(`[Avatar IO] Client putus: ${socket.id}`);
  });
});

// ─── 7. Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3500;

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       Avatar Overlay — v0.1.0            ║');
  console.log(`║  http://localhost:${PORT}                    ║`);
  console.log('║                                          ║');
  console.log('║  Overlay   → /overlay                   ║');
  console.log('║  Pick      → /pick                      ║');
  console.log('║  Dashboard → /dashboard                  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

module.exports = { app, io, poller };
