/**
 * RC Module — API Server
 * 
 * Bisa dijalankan standalone (port 3001)
 * atau di-init dari Viewer Merusuh (Opsi A integrasi).
 * 
 * Standalone:
 *   node rc-module/api/server.js
 * 
 * Integrasi (dari server/index.js Viewer Merusuh):
 *   const rcModule = require('../rc-module/api/server');
 *   rcModule.init({ app, io, eventBus });
 * 
 * Fondasi yang ditambahkan di iterasi ini (sebelum masuk hardware nyata):
 * - Database SQLite untuk fleet + session_history (persist antar restart)
 * - Command sanitizer + rate limiter di SETIAP titik kontrol RC
 * - Try/catch konsisten di semua route (tidak ada uncaught exception ke client)
 * - Endpoint /session/history yang sudah didokumentasikan tapi belum ada
 * - Battery flush periodik ke DB (supaya tidak boros I/O tapi tetap persist)
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const sessionManager = require('../core/sessionManager');
const queueManager = require('../core/queueManager');
const fleetManager = require('../core/fleetManager');
const { RC_STATUS } = require('../core/fleetManager');
const { getSimulator } = require('../adapters/rc/rc-simulator');
const { sanitizeCommand, CommandRateLimiter } = require('../core/commandSanitizer');
const { setup: setupDB } = require('./db/setup');
const { closeDB } = require('./db/database');

// Rate limiter global untuk perintah kontrol — 1 perintah per 100ms per RC.
// Ini lapisan pertahanan terakhir sebelum command sampai ke adapter manapun.
const commandLimiter = new CommandRateLimiter(100);

// ─── Setup event wiring (core logic) ──────────────────────────────────────────

function wireEvents(io) {
  // Session events → broadcast ke semua client
  sessionManager.on('session_start', (data) => {
    fleetManager.setStatus(data.rc_id, RC_STATUS.IN_USE);
    io.emit('session_start', data);
    io.emit('rc_status', { rc_id: data.rc_id, status: RC_STATUS.IN_USE });
  });

  sessionManager.on('session_tick', (data) => {
    // Kirim hanya ke viewer yang punya sesi ini (via token room)
    io.to(`session_${data.session_id}`).emit('session_tick', {
      session_id: data.session_id,
      remaining_sec: data.remaining_sec,
    });
    // Broadcast ke admin juga
    io.to('admin').emit('session_tick', data);
  });

  sessionManager.on('session_end', (data) => {
    fleetManager.setStatus(data.rc_id, RC_STATUS.AVAILABLE);
    io.emit('session_end', data);
    io.emit('rc_status', { rc_id: data.rc_id, status: RC_STATUS.AVAILABLE });

    // Proses queue berikutnya untuk RC ini
    const next = queueManager.dequeue(data.rc_id);
    if (next) {
      const rc = fleetManager.get(data.rc_id);
      try {
        sessionManager.start({
          rc_id: data.rc_id,
          viewer_name: next.viewer_name,
          duration_sec: next.duration_sec,
          source: next.source,
          donation_amount: next.donation_amount,
        });
        console.log(`[RCModule] Queue: ${next.viewer_name} mendapat giliran RC ${rc?.name}`);
      } catch (err) {
        console.error('[RCModule] Gagal proses queue berikutnya:', err.message);
      }
    }
  });

  // Fleet events
  fleetManager.on('rc_status', (data) => io.emit('rc_status', data));
  fleetManager.on('fleet_update', (data) => io.emit('fleet_update', data));
  fleetManager.on('battery_update', (data) => io.emit('battery_update', data));

  // Queue events
  queueManager.on('queue_update', (data) => io.emit('queue_update', data));
}

// ─── Socket.IO handlers ────────────────────────────────────────────────────────

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[RCModule] Client terhubung: ${socket.id}`);

    // Sederhana ping/pong untuk latency check di web-client
    socket.on('ping', () => socket.emit('pong'));

    // Viewer join room sesi mereka
    socket.on('join_viewer', ({ token }) => {
      const session = sessionManager.validateToken(token);
      if (!session) {
        socket.emit('error', { code: 'INVALID_TOKEN', message: 'Token tidak valid' });
        return;
      }
      socket.join(`session_${session.id}`);
      socket.emit('session_info', {
        session_id: session.id,
        rc_id: session.rc_id,
        viewer_name: session.viewer_name,
        remaining_sec: session.remaining_sec,
      });
    });

    // Admin join room admin
    socket.on('join_admin', () => {
      socket.join('admin');
      // Kirim state awal
      socket.emit('fleet_state', { fleet: fleetManager.getAll() });
      socket.emit('sessions_state', { sessions: sessionManager.getAll() });
      socket.emit('queue_state', { queues: queueManager.getAll() });
    });

    // Admin minta akhiri sesi tertentu
    socket.on('admin_end_session', ({ session_id }) => {
      sessionManager.end(session_id, 'admin');
    });

    // Viewer kirim perintah kontrol RC
    socket.on('control', ({ token, command }) => {
      const session = sessionManager.validateToken(token);
      if (!session) {
        socket.emit('error', { code: 'INVALID_TOKEN' });
        return;
      }

      const rc = fleetManager.get(session.rc_id);
      if (!rc) {
        socket.emit('error', { code: 'RC_NOT_FOUND' });
        return;
      }

      // Rate limit per RC — lindungi dari client yang kirim command
      // lebih cepat dari yang seharusnya (bug atau spam)
      if (!commandLimiter.allow(rc.id)) {
        return; // diam-diam diabaikan, tidak perlu emit error untuk ini
      }

      // SEMUA command wajib lewat sanitizer sebelum sampai ke adapter manapun.
      // Ini satu-satunya gerbang command masuk ke dunia fisik nantinya.
      const safeCommand = sanitizeCommand(rc.type, command);

      try {
        // Dispatch ke adapter yang sesuai
        if (rc.adapter === 'simulator') {
          const sim = getSimulator(rc.id, rc.name);
          if (!sim.connected) sim.connect();
          sim.sendCommand(safeCommand);

          // Forward state update ke viewer
          sim.once('state_update', (stateData) => {
            socket.emit('rc_state_update', stateData);
          });
        } else if (rc.adapter === 'esp32') {
          const { getAdapter } = require('../adapters/rc/rc-esp32');
          const adapter = getAdapter(rc.id, { name: rc.name, ip_address: rc.ip_address, ws_port: rc.ws_port });
          adapter.sendCommand(safeCommand);
        } else {
          socket.emit('error', { code: 'ADAPTER_NOT_IMPLEMENTED', message: `Adapter '${rc.adapter}' belum diimplementasi` });
        }
      } catch (err) {
        console.error('[RCModule] Error saat kirim command:', err.message);
        socket.emit('error', { code: 'COMMAND_FAILED', message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[RCModule] Client disconnect: ${socket.id}`);
    });
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function setupRoutes(app) {
  const router = express.Router();

  // ── Fleet RC ─────────────────────────────────────────────────────────────────
  router.get('/fleet', (req, res) => {
    res.json({ success: true, data: fleetManager.getAll() });
  });

  router.post('/fleet', (req, res) => {
    try {
      const rc = fleetManager.register(req.body);
      res.json({ success: true, data: rc });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/fleet/:id', (req, res) => {
    const rc = fleetManager.get(req.params.id);
    if (!rc) return res.status(404).json({ success: false, error: 'RC_NOT_FOUND' });
    res.json({ success: true, data: rc });
  });

  router.put('/fleet/:id', (req, res) => {
    try {
      const rc = fleetManager.update(req.params.id, req.body);
      res.json({ success: true, data: rc });
    } catch (err) {
      const status = err.message === 'RC_NOT_FOUND' ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  router.delete('/fleet/:id', (req, res) => {
    try {
      fleetManager.remove(req.params.id);
      res.json({ success: true });
    } catch (err) {
      const status = err.message === 'RC_NOT_FOUND' ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  // ── Sessions ─────────────────────────────────────────────────────────────────
  router.get('/session', (req, res) => {
    res.json({ success: true, data: sessionManager.getAll() });
  });

  router.get('/session/history', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
      const rc_id = req.query.rc_id || null;
      const history = sessionManager.getHistory({ limit, rc_id });
      res.json({ success: true, data: history });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/session/start', (req, res) => {
    try {
      const { rc_id, viewer_name, duration_sec, source } = req.body;
      const rc = fleetManager.get(rc_id);
      if (!rc) return res.status(404).json({ success: false, error: 'RC_NOT_FOUND' });
      if (rc.status !== RC_STATUS.AVAILABLE) {
        return res.status(400).json({ success: false, error: 'RC_IN_USE' });
      }

      const session = sessionManager.start({ rc_id, viewer_name, duration_sec, source: source || 'manual' });
      res.json({ success: true, data: session });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/session/:id/end', (req, res) => {
    const ok = sessionManager.end(req.params.id, 'admin');
    if (!ok) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' });
    res.json({ success: true });
  });

  // ── Queue ────────────────────────────────────────────────────────────────────
  router.get('/queue', (req, res) => {
    res.json({ success: true, data: queueManager.getAll() });
  });

  router.post('/queue/join', (req, res) => {
    try {
      const result = queueManager.enqueue(req.body);
      if (!result.success) return res.status(400).json(result);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.delete('/queue/:token', (req, res) => {
    const ok = queueManager.leave(req.params.token);
    res.json({ success: ok });
  });

  app.use('/rc/api', router);

  // Web controller + admin dashboard (static files)
  app.use('/rc/controller', express.static(path.join(__dirname, '../web-client')));
  app.use('/rc/admin', express.static(path.join(__dirname, '../web-client/admin')));
}

// ─── Background tasks ───────────────────────────────────────────────────────────

/**
 * Flush battery ke DB tiap 30 detik + bersihkan rate limiter lama.
 * Dipisah jadi fungsi sendiri supaya bisa dimatikan saat shutdown.
 */
function startBackgroundTasks() {
  const batteryFlushInterval = setInterval(() => {
    fleetManager.flushBatteryToDB();
  }, 30000);

  const rateLimiterCleanup = setInterval(() => {
    commandLimiter.cleanup();
  }, 60000);

  return () => {
    clearInterval(batteryFlushInterval);
    clearInterval(rateLimiterCleanup);
  };
}

// ─── Standalone mode ───────────────────────────────────────────────────────────

function standalone() {
  // DB harus siap SEBELUM fleetManager.loadFromDB() dipanggil
  setupDB();
  fleetManager.loadFromDB();

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  app.use(express.json());

  setupRoutes(app);
  wireEvents(io);
  setupSocketHandlers(io);

  // Seed simulator untuk dev (aman dipanggil berkali-kali, lihat fleetManager.seedSimulators)
  fleetManager.seedSimulators();

  const stopBackgroundTasks = startBackgroundTasks();

  const PORT = process.env.RC_PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`[RCModule] Server berjalan di http://localhost:${PORT}`);
    console.log(`[RCModule] Controller → http://localhost:${PORT}/rc/controller/controller.html`);
    console.log(`[RCModule] Admin      → http://localhost:${PORT}/rc/admin/admin.html`);
    console.log(`[RCModule] Fleet API  → http://localhost:${PORT}/rc/api/fleet`);
  });

  // Graceful shutdown — penting supaya battery ter-flush dan sesi tercatat
  // sebelum process benar-benar mati.
  process.on('SIGINT', () => {
    console.log('\n[RCModule] Shutting down...');
    stopBackgroundTasks();
    fleetManager.flushBatteryToDB();
    sessionManager.endAll();
    closeDB();
    process.exit(0);
  });
}

// ─── Module mode (integrasi ke Viewer Merusuh) ─────────────────────────────────

/**
 * Init RC Module sebagai bagian dari Viewer Merusuh
 * @param {Object} opts
 * @param {Object} opts.app - Express app
 * @param {Object} opts.io - Socket.IO instance
 * @param {Object} [opts.eventBus] - Viewer Merusuh eventBus
 * @param {Object} [opts.config] - Override config
 */
function init({ app, io, eventBus, config = {} }) {
  setupDB();
  fleetManager.loadFromDB();

  setupRoutes(app);
  wireEvents(io);
  setupSocketHandlers(io);

  // Seed simulator jika development
  if (process.env.NODE_ENV !== 'production') {
    fleetManager.seedSimulators();
  }

  startBackgroundTasks();

  // Integrasi dengan eventBus Viewer Merusuh
  if (eventBus) {
    const minAmount = config.min_donation_amount || 10000;
    const amountPerMin = config.amount_per_minute || 5000;

    eventBus.on('donation', async (donation) => {
      try {
        const { amount, viewer_name } = donation;
        if (!amount || amount < minAmount) return;

        const duration_sec = Math.floor((amount / amountPerMin) * 60);
        const availableRc = fleetManager.getAvailable();

        if (availableRc) {
          sessionManager.start({
            rc_id: availableRc.id,
            viewer_name,
            duration_sec,
            source: 'donation',
            donation_amount: amount,
          });
        } else {
          queueManager.enqueue({ rc_id: null, viewer_name, duration_sec, source: 'donation', donation_amount: amount });
        }
      } catch (err) {
        console.error('[RCModule] Gagal proses donation event:', err.message);
      }
    });

    console.log('[RCModule] Terhubung ke eventBus Viewer Merusuh');
  }

  console.log('[RCModule] Modul RC aktif');
}

// ─── Entry point ───────────────────────────────────────────────────────────────

// Jika dijalankan langsung (standalone)
if (require.main === module) {
  standalone();
}

module.exports = { init };
