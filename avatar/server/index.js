/**
 * avatar/server/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Entry point Avatar Module.
 *
 * DUA MODE:
 *
 * A) STANDALONE — jalankan langsung:
 *      cd avatar && node server/index.js
 *    Server berdiri sendiri di PORT (default 3500).
 *
 * B) INTEGRATED — di-require oleh server utama Viewer Merusuh:
 *      const avatarModule = require('../avatar/server');
 *      avatarModule.init({ app, io, eventBus });
 *    Avatar module mount route-nya ke Express app utama,
 *    pakai io yang sama, dan hook ke eventBus.
 *
 * Cara bedakan: jika require.main === module → standalone.
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const http    = require('http');
const path    = require('path');
const { Server } = require('socket.io');

const { initDB }  = require('./db/setup');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public'); // GET /api/viewers/check, /api/avatars, POST /api/viewers/pick
const ytPoller    = require('./core/ytPoller');
const { initViewerMerusuhIntegration } = require('./integration/viewerMerusuh');

// ─── Mount routes ke Express app ─────────────────────────────────────────────
function mountRoutes(app, io) {
  // Static: sprite PNG
  app.use('/avatars', express.static(path.join(__dirname, '../public/avatars')));

  // Static: dashboard, overlay, pick pages
  app.use('/dashboard', express.static(path.join(__dirname, '../public/dashboard')));
  app.use('/overlay',   express.static(path.join(__dirname, '../public/overlay')));
  app.use('/pick',      express.static(path.join(__dirname, '../public/pick')));

  // REST API
  app.use('/admin', adminRoutes);
  app.use('/api',   publicRoutes);

  // Expose io ke routes (untuk broadcast di admin.js)
  app.set('io', io);

  // Expose poller ke routes
  app.locals.poller = ytPoller;
}

// ─── Setup Socket.IO events ───────────────────────────────────────────────────
function initSocketEvents(io) {
  io.on('connection', (socket) => {
    // Kirim status polling saat client connect
    const stats = ytPoller.getStats ? ytPoller.getStats() : { isRunning: false };
    socket.emit('polling_status', stats);
  });

  // YtPoller emit events ke io langsung — set io ke poller
  if (ytPoller.setIo) ytPoller.setIo(io);
}

// ─── MODE B: Init dari server utama ──────────────────────────────────────────
function init({ app, io, eventBus }) {
  console.log('[Avatar] Initializing in INTEGRATED mode...');

  // Init DB
  initDB();

  // Mount routes ke app utama
  mountRoutes(app, io);

  // Init Socket events
  initSocketEvents(io);

  // Hook ke eventBus Viewer Merusuh
  if (eventBus) {
    initViewerMerusuhIntegration(eventBus, io);
  } else {
    console.warn('[Avatar] eventBus tidak diberikan — integrasi donasi otomatis tidak aktif.');
  }

  console.log('[Avatar] Ready. Routes mounted ke server utama.');
  return { ytPoller };
}

// ─── MODE A: Standalone ───────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.AVATAR_PORT || process.env.PORT || 3500;

  const app    = express();
  const server = http.createServer(app);
  const io     = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  initDB();
  mountRoutes(app, io);
  initSocketEvents(io);

  // Redirect root → dashboard
  app.get('/', (req, res) => res.redirect('/dashboard'));

  server.listen(PORT, () => {
    console.log(`[Avatar] Standalone server running at http://localhost:${PORT}`);
    console.log(`[Avatar]   Dashboard : http://localhost:${PORT}/dashboard`);
    console.log(`[Avatar]   Overlay   : http://localhost:${PORT}/overlay`);
    console.log(`[Avatar]   Pick page : http://localhost:${PORT}/pick`);
  });
}

module.exports = { init };
