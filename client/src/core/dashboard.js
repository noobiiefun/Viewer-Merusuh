'use strict';

/**
 * Web Dashboard — v0.5.1 (patch: menu koneksi)
 *
 * Perubahan dari v0.5.0:
 *  - Serve connection.html dari file (bukan buildHTML inline)
 *  - bus.on('conn:status') → tangkap field baru: socketId, reconnects, effectCount, connectedAt
 *  - /api/state → return data lengkap (socketId, reconnects, connectedAt, config)
 *  - /api/set-server → terima serverUrl + clientName + logLevel + clientSecret
 *  - [BARU] POST /api/reconnect
 *  - [BARU] POST /api/disconnect
 *  - [BARU] GET  /api/ping?url=...
 */

const http    = require('http');
const https   = require('https');
const path    = require('path');
const bus     = require('./eventBus');
const { discoverServers } = require('./discovery');

const DASHBOARD_PORT = parseInt(process.env.DASHBOARD_PORT || '3002', 10);

// Path ke connection.html (ada di folder dashboard/ di root project)
const HTML_PATH = path.resolve(__dirname, '..', '..', 'dashboard', 'connection.html');

// ─── State yang dibagikan ke UI ────────────────────────────────────────────

const state = {
  connection: {
    status:      'disconnected',
    socketId:    null,
    serverUrl:   process.env.SERVER_URL || '',
    reconnects:  0,
    effectCount: 0,
    connectedAt: null,
    since:       null,
  },
  adapters: {},   // name → { enabled, status, errorCount }
  effectLog: [],  // maks 100 entri terbaru
  stats: {
    effectsReceived: 0,
    effectsExecuted: 0,
    connectedAt:     null,
  },
};

// ─── SSE Clients ───────────────────────────────────────────────────────────

const sseClients = new Set();

function sendSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch { sseClients.delete(res); }
  }
}

// ─── Listen ke event bus ───────────────────────────────────────────────────

bus.on('conn:status', (data) => {
  const { status, socketId, serverUrl, reconnects, effectCount, connectedAt } = data;

  state.connection.status      = status      || state.connection.status;
  state.connection.socketId    = socketId    ?? state.connection.socketId;
  state.connection.serverUrl   = serverUrl   || state.connection.serverUrl;
  state.connection.reconnects  = reconnects  ?? state.connection.reconnects;
  state.connection.effectCount = effectCount ?? state.connection.effectCount;

  if (status === 'connected') {
    state.connection.connectedAt = connectedAt || new Date().toISOString();
    state.connection.since       = Date.now();
    state.stats.connectedAt      = Date.now();
  }
  if (status === 'disconnected') {
    state.connection.socketId    = null;
    state.connection.connectedAt = null;
    state.connection.since       = null;
  }

  sendSSE('conn', state.connection);
});

bus.on('effect', (payload) => {
  state.stats.effectsReceived++;
  state.connection.effectCount = state.stats.effectsReceived;
  const entry = {
    id:        payload.id,
    name:      payload.name || payload.action,
    adapter:   payload.adapter,
    action:    payload.action,
    params:    payload.params,
    duration_ms: payload.duration_ms,
    donation:  payload.donation,
    timestamp: Date.now(),
  };
  state.effectLog.unshift(entry);
  if (state.effectLog.length > 100) state.effectLog.pop();
  sendSSE('effect', entry);
});

bus.on('adapter:status', ({ name, enabled, error }) => {
  state.adapters[name] = { enabled, error: error || null, updatedAt: Date.now() };
  sendSSE('adapter', { name, ...state.adapters[name] });
});

bus.on('log', (entry) => {
  sendSSE('log', entry);
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function sendJSON(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// Patch satu key di .env
function _patchEnvFile(key, value) {
  try {
    const fs      = require('fs');
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    let content = fs.readFileSync(envPath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
  } catch {}
}

// Patch banyak key sekaligus
function _patchEnvMultiple(pairs) {
  try {
    const fs      = require('fs');
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    let content = fs.readFileSync(envPath, 'utf8');
    for (const [key, value] of Object.entries(pairs)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    }
    fs.writeFileSync(envPath, content, 'utf8');
  } catch {}
}

// Proxy GET ke URL lain (untuk /api/ping)
function proxyGet(targetUrl) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(targetUrl); }
    catch (e) { return reject(new Error('URL tidak valid')); }

    const client  = parsed.protocol === 'https:' ? https : http;
    const t0      = Date.now();

    const req = client.request({
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      timeout:  7000,
    }, (proxyRes) => {
      const chunks = [];
      proxyRes.on('data', c => chunks.push(c));
      proxyRes.on('end', () => {
        const ms   = Date.now() - t0;
        const body = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try { parsed = JSON.parse(body); } catch { parsed = { raw: body }; }
        resolve({ ok: true, ms, status: proxyRes.statusCode, ...parsed });
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

// ─── Referensi ke modul lain ───────────────────────────────────────────────

let _adapterManager = null;
let _connection     = null;

// ─── HTTP Server ───────────────────────────────────────────────────────────

function createServer() {
  return http.createServer(async (req, res) => {
    const rawUrl  = req.url || '/';
    const urlPath = rawUrl.split('?')[0];
    const query   = Object.fromEntries(new URLSearchParams(rawUrl.includes('?') ? rawUrl.split('?')[1] : ''));

    // ── Halaman utama ─────────────────────────────────────────────────────
    if (req.method === 'GET' && (urlPath === '/' || urlPath === '/index.html')) {
      try {
        const fs   = require('fs');
        const html = fs.readFileSync(HTML_PATH, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      } catch (err) {
        // Fallback: tampilkan pesan error jika file tidak ditemukan
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(`Dashboard HTML tidak ditemukan.\nExpected: ${HTML_PATH}\nError: ${err.message}`);
      }
    }

    // ── SSE stream ────────────────────────────────────────────────────────
    if (req.method === 'GET' && urlPath === '/api/events') {
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(':ok\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    // ── State snapshot ────────────────────────────────────────────────────
    if (req.method === 'GET' && urlPath === '/api/state') {
      const connState = _connection ? _connection.getState() : state.connection;
      return sendJSON(res, 200, {
        connection: {
          ...state.connection,
          ...connState,
        },
        adapters: state.adapters,
        effectLog: state.effectLog,
        stats: state.stats,
        adapterStats: _adapterManager ? _adapterManager.getStats() : {},
        config: {
          serverUrl:    process.env.SERVER_URL    || '',
          clientName:   process.env.CLIENT_NAME   || 'GamePC',
          logLevel:     process.env.LOG_LEVEL     || 'info',
          clientSecret: !!(process.env.CLIENT_SECRET),
        },
      });
    }

    // ── LAN Discovery ─────────────────────────────────────────────────────
    if (req.method === 'GET' && urlPath === '/api/discover') {
      try {
        const servers = await discoverServers();
        return sendJSON(res, 200, { servers });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── Ping (proxy ke server target) ─────────────────────────────────────
    if (req.method === 'GET' && urlPath === '/api/ping') {
      const targetUrl = query.url;
      if (!targetUrl) return sendJSON(res, 400, { error: 'Parameter url diperlukan' });
      try {
        const cleanUrl = targetUrl.replace(/\/$/, '') + '/api/status';
        const result   = await proxyGet(cleanUrl);
        return sendJSON(res, 200, result);
      } catch (err) {
        return sendJSON(res, 502, { ok: false, error: err.message });
      }
    }

    // ── Set server + config ───────────────────────────────────────────────
    if (req.method === 'POST' && urlPath === '/api/set-server') {
      try {
        const body = await parseBody(req);

        // Support format lama ({ url }) dan format baru ({ serverUrl, ... })
        const serverUrl    = body.serverUrl || body.url;
        const clientName   = body.clientName;
        const logLevel     = body.logLevel;
        const clientSecret = body.clientSecret;

        if (!serverUrl) return sendJSON(res, 400, { error: 'serverUrl diperlukan' });

        // Update state
        state.connection.serverUrl = serverUrl;

        // Patch .env
        const patches = { SERVER_URL: serverUrl };
        if (clientName)   patches.CLIENT_NAME   = clientName;
        if (logLevel)     patches.LOG_LEVEL     = logLevel;
        if (clientSecret) patches.CLIENT_SECRET = clientSecret;
        _patchEnvMultiple(patches);

        // Trigger reconnect jika connection tersedia
        if (_connection && typeof _connection.reconnect === 'function') {
          setTimeout(() => _connection.reconnect(), 300);
        }

        return sendJSON(res, 200, { ok: true, serverUrl, note: 'Config disimpan. Reconnect dipicu.' });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    // ── Reconnect ─────────────────────────────────────────────────────────
    if (req.method === 'POST' && urlPath === '/api/reconnect') {
      try {
        if (!_connection) return sendJSON(res, 503, { error: 'Connection belum siap' });
        if (typeof _connection.reconnect === 'function') {
          _connection.reconnect();
        } else {
          _connection.disconnect();
          setTimeout(() => _connection.connect(), 500);
        }
        return sendJSON(res, 200, { ok: true, message: 'Reconnect dipicu' });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── Disconnect ────────────────────────────────────────────────────────
    if (req.method === 'POST' && urlPath === '/api/disconnect') {
      try {
        if (!_connection) return sendJSON(res, 503, { error: 'Connection belum siap' });
        _connection.disconnect();
        return sendJSON(res, 200, { ok: true, message: 'Koneksi diputus' });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── Toggle adapter ────────────────────────────────────────────────────
    if (req.method === 'POST' && urlPath.startsWith('/api/adapter/')) {
      const name = urlPath.replace('/api/adapter/', '');
      try {
        const { enabled } = await parseBody(req);
        if (!_adapterManager) return sendJSON(res, 503, { error: 'AdapterManager belum siap' });

        const adapter = _adapterManager.adapters
          ? _adapterManager.adapters.get(name)
          : null;

        if (!adapter) return sendJSON(res, 404, { error: `Adapter "${name}" tidak ditemukan` });

        if (enabled && typeof adapter.init === 'function') {
          await adapter.init();
        } else if (!enabled && typeof adapter.destroy === 'function') {
          await adapter.destroy();
        }

        state.adapters[name] = { ...state.adapters[name], enabled: !!enabled };
        bus.emit('adapter:status', { name, enabled: !!enabled });
        return sendJSON(res, 200, { ok: true, name, enabled });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    res.writeHead(404);
    res.end('Not found');
  });
}

// ─── Interface ─────────────────────────────────────────────────────────────

let server = null;

const dashboard = {
  async init(adapterManager, connection) {
    _adapterManager = adapterManager;
    _connection     = connection;

    server = createServer();
    await new Promise((resolve, reject) => {
      server.listen(DASHBOARD_PORT, '127.0.0.1', resolve);
      server.on('error', err => {
        if (err.code === 'EADDRINUSE') {
          console.error(`[Dashboard] Port ${DASHBOARD_PORT} sudah dipakai. Ganti DASHBOARD_PORT di .env`);
        }
        reject(err);
      });
    });

    console.log(`[Dashboard] Web UI aktif → http://localhost:${DASHBOARD_PORT}`);
  },

  emitConn:    (data) => bus.emit('conn:status', data),
  emitEffect:  (data) => bus.emit('effect', data),
  emitAdapter: (data) => bus.emit('adapter:status', data),
  emitLog:     (data) => bus.emit('log', data),

  setAdapterState(name, enabled, error = null) {
    state.adapters[name] = { enabled, error, updatedAt: Date.now() };
  },

  async destroy() {
    if (server) {
      await new Promise(resolve => server.close(resolve));
      server = null;
    }
  },
};

module.exports = dashboard;
