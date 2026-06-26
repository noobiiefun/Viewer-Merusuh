'use strict';

/**
 * Plugin Adapter — Step 4
 * HTTP server lokal untuk game plugin polling (GTA5, BeamNG, dll)
 *
 * Alur:
 *   1. Viewer Merusuh SERVER emit event 'effect' via Socket.IO
 *   2. Client menerima → plugin adapter simpan ke queue
 *   3. Game plugin (Lua/Python/C#) poll GET /api/plugin/pending
 *   4. Game plugin eksekusi efek, lalu konfirmasi POST /api/plugin/complete/:id
 *
 * Port default: 3001 (PLUGIN_LOCAL_PORT di .env)
 */

const http    = require('http');
const logger  = require('../utils/logger');

// ─── Config ────────────────────────────────────────────────────────────────

const PORT         = parseInt(process.env.PLUGIN_LOCAL_PORT  || '3001', 10);
const PLUGIN_TOKEN = process.env.PLUGIN_TOKEN || '';          // opsional, bisa kosong
const QUEUE_MAX    = 50;                                       // maks efek dalam queue
const EFFECT_TTL   = parseInt(process.env.PLUGIN_EFFECT_TTL || '30000', 10); // 30 detik

// ─── State ─────────────────────────────────────────────────────────────────

/** @type {Map<string, EffectEntry>} */
const queue = new Map();

let server    = null;
let enabled   = false;
let effectSeq = 0;

/**
 * @typedef {Object} EffectEntry
 * @property {string} id
 * @property {string} action
 * @property {object} params
 * @property {number} duration_ms
 * @property {object} donation
 * @property {number} queuedAt
 * @property {'pending'|'sent'|'done'|'expired'} status
 */

// ─── Queue helpers ─────────────────────────────────────────────────────────

function generateId() {
  return `eff_${Date.now()}_${++effectSeq}`;
}

/** Hapus efek yang sudah kadaluarsa dari queue */
function evictExpired() {
  const now = Date.now();
  for (const [id, entry] of queue.entries()) {
    if (entry.status !== 'done' && now - entry.queuedAt > EFFECT_TTL) {
      entry.status = 'expired';
      queue.delete(id);
      logger.warn(`[Plugin] Efek expired: ${id} action="${entry.action}"`);
    }
  }
}

/** Ambil semua efek berstatus 'pending', ubah ke 'sent' */
function dequeuePending() {
  evictExpired();
  const pending = [];
  for (const [id, entry] of queue.entries()) {
    if (entry.status === 'pending') {
      entry.status = 'sent';
      pending.push({ id, action: entry.action, params: entry.params, duration_ms: entry.duration_ms, donation: entry.donation });
    }
  }
  return pending;
}

function markDone(id) {
  const entry = queue.get(id);
  if (!entry) return false;
  entry.status = 'done';
  queue.delete(id);
  return true;
}

// ─── HTTP Server ───────────────────────────────────────────────────────────

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type':  'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function checkAuth(req) {
  if (!PLUGIN_TOKEN) return true; // token tidak dikonfigurasi → semua boleh
  const auth = req.headers['authorization'] || '';
  return auth === `Bearer ${PLUGIN_TOKEN}`;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Authorization,Content-Type' });
      return res.end();
    }

    // Auth check
    if (!checkAuth(req)) {
      return sendJSON(res, 401, { error: 'Unauthorized' });
    }

    const url = req.url.split('?')[0];

    // ── GET /api/plugin/pending ──────────────────────────────
    // Game plugin poll ini untuk mengambil efek yang masuk
    if (req.method === 'GET' && url === '/api/plugin/pending') {
      const effects = dequeuePending();
      logger.debug(`[Plugin] Poll → ${effects.length} efek dikirim ke plugin`);
      return sendJSON(res, 200, { effects });
    }

    // ── POST /api/plugin/complete/:id ────────────────────────
    // Game plugin konfirmasi efek sudah dieksekusi
    if (req.method === 'POST' && url.startsWith('/api/plugin/complete/')) {
      const id = url.replace('/api/plugin/complete/', '');
      const ok = markDone(id);
      if (ok) {
        logger.info(`[Plugin] ✓ Efek selesai dikonfirmasi: ${id}`);
        return sendJSON(res, 200, { ok: true, id });
      } else {
        logger.warn(`[Plugin] Konfirmasi untuk ID tidak dikenal: ${id}`);
        return sendJSON(res, 404, { error: 'Effect not found', id });
      }
    }

    // ── GET /api/plugin/queue ────────────────────────────────
    // Debug: lihat isi queue saat ini
    if (req.method === 'GET' && url === '/api/plugin/queue') {
      evictExpired();
      return sendJSON(res, 200, {
        size:    queue.size,
        effects: [...queue.values()],
      });
    }

    // ── GET /api/plugin/status ───────────────────────────────
    // Health check / info
    if (req.method === 'GET' && url === '/api/plugin/status') {
      return sendJSON(res, 200, {
        status:    'ok',
        port:      PORT,
        queueSize: queue.size,
        auth:      !!PLUGIN_TOKEN,
        effectTtl: EFFECT_TTL,
      });
    }

    // ── POST /api/plugin/clear ───────────────────────────────
    // Kosongkan queue (panic button)
    if (req.method === 'POST' && url === '/api/plugin/clear') {
      const size = queue.size;
      queue.clear();
      logger.warn(`[Plugin] Queue dikosongkan manual (${size} efek dihapus)`);
      return sendJSON(res, 200, { ok: true, cleared: size });
    }

    return sendJSON(res, 404, { error: 'Not found' });
  });
}

// ─── Interface Adapter ─────────────────────────────────────────────────────

const pluginAdapter = {
  name: 'plugin',

  async init() {
    if (server) return true;

    server = createServer();

    await new Promise((resolve, reject) => {
      server.listen(PORT, '127.0.0.1', () => resolve());
      server.on('error', err => {
        if (err.code === 'EADDRINUSE') {
          logger.error(`[Plugin] Port ${PORT} sudah dipakai. Ganti PLUGIN_LOCAL_PORT di .env`);
        } else {
          logger.error('[Plugin] Server error:', err.message);
        }
        reject(err);
      });
    }).catch(err => {
      logger.error('[Plugin] Gagal start HTTP server:', err.message);
      server = null;
      enabled = false;
      return false;
    });

    if (!server) return false;

    enabled = true;
    logger.info(`[Plugin] HTTP server aktif di http://127.0.0.1:${PORT}`);
    logger.info(`[Plugin] Endpoint:`);
    logger.info(`[Plugin]   GET  http://127.0.0.1:${PORT}/api/plugin/pending`);
    logger.info(`[Plugin]   POST http://127.0.0.1:${PORT}/api/plugin/complete/:id`);
    logger.info(`[Plugin]   GET  http://127.0.0.1:${PORT}/api/plugin/status`);
    if (PLUGIN_TOKEN) {
      logger.info(`[Plugin] Auth aktif — plugin harus kirim header: Authorization: Bearer <token>`);
    } else {
      logger.warn(`[Plugin] Auth dinonaktifkan (PLUGIN_TOKEN kosong) — semua request diterima`);
    }
    return true;
  },

  /**
   * Dipanggil oleh AdapterManager saat event 'effect' masuk dari server
   */
  async execute({ action, params = {}, duration_ms = 0, donation = {} } = {}) {
    if (!enabled) {
      logger.warn('[Plugin] Adapter belum aktif.');
      return;
    }

    if (queue.size >= QUEUE_MAX) {
      logger.warn(`[Plugin] Queue penuh (${QUEUE_MAX}). Efek dibuang: ${action}`);
      return;
    }

    const id = generateId();
    /** @type {EffectEntry} */
    const entry = {
      id,
      action,
      params,
      duration_ms,
      donation,
      queuedAt: Date.now(),
      status:   'pending',
    };

    queue.set(id, entry);
    logger.info(`[Plugin] Efek masuk queue: ${id} action="${action}" (queue size: ${queue.size})`);
  },

  async destroy() {
    if (server) {
      await new Promise(resolve => server.close(resolve));
      server  = null;
      enabled = false;
      queue.clear();
      logger.info('[Plugin] HTTP server dimatikan.');
    }
  },
};

module.exports = pluginAdapter;
