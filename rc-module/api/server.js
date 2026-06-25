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
      sessionManager.start({
        rc_id: data.rc_id,
        viewer_name: next.viewer_name,
        duration_sec: next.duration_sec,
        source: next.source,
        donation_amount: next.donation_amount,
      });
      console.log(`[RCModule] Queue: ${next.viewer_name} mendapat giliran RC ${rc?.name}`);
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

      // Dispatch ke adapter yang sesuai
      if (rc.adapter === 'simulator') {
        const sim = getSimulator(rc.id, rc.name);
        if (!sim.connected) sim.connect();
        sim.sendCommand(command);

        // Forward state update ke viewer
        sim.once('state_update', (stateData) => {
          socket.emit('rc_state_update', stateData);
        });
      } else if (rc.adapter === 'esp32') {
        // TODO Phase 3: kirim ke ESP32 adapter
        const { getAdapter } = require('../adapters/rc/rc-esp32');
        const adapter = getAdapter(rc.id, { name: rc.name, ip_address: rc.ip_address, ws_port: rc.ws_port });
        adapter.sendCommand(command);
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

  // Fleet RC
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
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.delete('/fleet/:id', (req, res) => {
    try {
      fleetManager.remove(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Sessions
  router.get('/session', (req, res) => {
    res.json({ success: true, data: sessionManager.getAll() });
  });

  router.post('/session/start', (req, res) => {
    const { rc_id, viewer_name, duration_sec, source } = req.body;
    const rc = fleetManager.get(rc_id);
    if (!rc) return res.status(404).json({ success: false, error: 'RC_NOT_FOUND' });
    if (rc.status === RC_STATUS.IN_USE) return res.status(400).json({ success: false, error: 'RC_IN_USE' });

    const session = sessionManager.start({ rc_id, viewer_name, duration_sec, source: source || 'manual' });
    res.json({ success: true, data: session });
  });

  router.post('/session/:id/end', (req, res) => {
    const ok = sessionManager.end(req.params.id, 'admin');
    if (!ok) return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' });
    res.json({ success: true });
  });

  // Queue
  router.get('/queue', (req, res) => {
    res.json({ success: true, data: queueManager.getAll() });
  });

  router.post('/queue/join', (req, res) => {
    const result = queueManager.enqueue(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json({ success: true, data: result });
  });

  router.delete('/queue/:token', (req, res) => {
    const ok = queueManager.leave(req.params.token);
    res.json({ success: ok });
  });

  app.use('/rc/api', router);

  // Web controller (viewer)
  app.use('/rc/controller', express.static(path.join(__dirname, '../web-client')));
}

// ─── Standalone mode ───────────────────────────────────────────────────────────

function standalone() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  app.use(express.json());

  setupRoutes(app);
  wireEvents(io);
  setupSocketHandlers(io);

  // Seed simulator untuk dev
  fleetManager.seedSimulators();

  const PORT = process.env.RC_PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`[RCModule] Server berjalan di http://localhost:${PORT}`);
    console.log(`[RCModule] Admin  → http://localhost:${PORT}/rc/controller/admin.html`);
    console.log(`[RCModule] Fleet  → http://localhost:${PORT}/rc/api/fleet`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    sessionManager.endAll();
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
  setupRoutes(app);
  wireEvents(io);
  setupSocketHandlers(io);

  // Seed simulator jika development
  if (process.env.NODE_ENV !== 'production') {
    fleetManager.seedSimulators();
  }

  // Integrasi dengan eventBus Viewer Merusuh
  if (eventBus) {
    const minAmount = config.min_donation_amount || 10000;
    const amountPerMin = config.amount_per_minute || 5000;

    eventBus.on('donation', async (donation) => {
      const { amount, viewer_name } = donation;
      if (amount < minAmount) return;

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
        queueManager.enqueue({ viewer_name, duration_sec, source: 'donation', donation_amount: amount });
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
