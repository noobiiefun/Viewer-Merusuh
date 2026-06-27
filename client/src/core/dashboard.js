'use strict';

/**
 * Web Dashboard — Step 5
 * HTTP server lokal yang menyajikan UI monitoring di http://localhost:3002
 *
 * Fitur:
 *   - Status koneksi real-time (connected / disconnected / reconnecting)
 *   - Log efek masuk real-time via SSE (Server-Sent Events)
 *   - Toggle adapter on/off
 *   - Scan & pilih server di LAN
 *   - Tampilan queue plugin adapter
 */

const http    = require('http');
const path    = require('path');
const bus     = require('./eventBus');
const { discoverServers } = require('./discovery');

const DASHBOARD_PORT = parseInt(process.env.DASHBOARD_PORT || '3002', 10);

// ─── State yang dibagikan ke UI ────────────────────────────────────────────

const state = {
  connection: {
    status:    'disconnected',
    serverUrl: process.env.SERVER_URL || '',
    since:     null,
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

bus.on('conn:status', ({ status, serverUrl }) => {
  state.connection.status    = status;
  state.connection.serverUrl = serverUrl || state.connection.serverUrl;
  state.connection.since     = status === 'connected' ? Date.now() : state.connection.since;
  if (status === 'connected') state.stats.connectedAt = Date.now();
  sendSSE('conn', state.connection);
});

bus.on('effect', (payload) => {
  state.stats.effectsReceived++;
  const entry = {
    id:        payload.id,
    name:      payload.name || payload.action,
    adapter:   payload.adapter,
    action:    payload.action,
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

// ─── HTML UI ───────────────────────────────────────────────────────────────

function buildHTML() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Viewer Merusuh — Dashboard</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0f0f13;
    --surface:  #1a1a24;
    --border:   #2a2a3a;
    --accent:   #7c6fff;
    --green:    #4ade80;
    --yellow:   #fbbf24;
    --red:      #f87171;
    --text:     #e2e8f0;
    --muted:    #64748b;
    --radius:   10px;
  }

  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 24px;
  }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
  }

  header h1 {
    font-size: 1.4rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--accent), #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  header .version {
    font-size: 0.75rem;
    color: var(--muted);
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 99px;
  }

  .grid {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 800px) {
    .grid { grid-template-columns: 1fr; }
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    margin-bottom: 16px;
  }

  .card h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin-bottom: 14px;
  }

  /* ── Status Badge ── */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 99px;
  }
  .badge::before { content: ''; width: 8px; height: 8px; border-radius: 50%; }
  .badge.connected    { background: #052e16; color: var(--green);  }
  .badge.connected::before { background: var(--green); box-shadow: 0 0 6px var(--green); animation: pulse 2s infinite; }
  .badge.disconnected { background: #2d1515; color: var(--red);    }
  .badge.disconnected::before { background: var(--red); }
  .badge.reconnecting { background: #2d2010; color: var(--yellow); }
  .badge.reconnecting::before { background: var(--yellow); animation: pulse 1s infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

  .conn-url {
    font-size: 0.8rem;
    color: var(--muted);
    margin-top: 8px;
    word-break: break-all;
  }

  /* ── Stats ── */
  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 4px;
  }

  .stat {
    background: var(--bg);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .stat .val { font-size: 1.6rem; font-weight: 700; color: var(--accent); line-height: 1; }
  .stat .lbl { font-size: 0.72rem; color: var(--muted); margin-top: 2px; }

  /* ── Adapters ── */
  .adapter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }
  .adapter-row:last-child { border-bottom: none; }
  .adapter-name { font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .adapter-err  { font-size: 0.72rem; color: var(--red); margin-top: 2px; }

  /* Toggle switch */
  .toggle { position: relative; width: 44px; height: 24px; cursor: pointer; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle .slider {
    position: absolute; inset: 0;
    background: var(--border);
    border-radius: 99px;
    transition: .2s;
  }
  .toggle .slider::before {
    content: '';
    position: absolute;
    width: 18px; height: 18px;
    left: 3px; top: 3px;
    background: white;
    border-radius: 50%;
    transition: .2s;
  }
  .toggle input:checked + .slider { background: var(--accent); }
  .toggle input:checked + .slider::before { transform: translateX(20px); }

  /* ── LAN Discovery ── */
  .discover-btn {
    width: 100%;
    padding: 8px;
    background: transparent;
    border: 1px solid var(--accent);
    color: var(--accent);
    border-radius: 7px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background .15s;
    margin-bottom: 10px;
  }
  .discover-btn:hover { background: rgba(124,111,255,0.1); }
  .discover-btn:disabled { opacity: 0.4; cursor: default; }

  .server-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: var(--bg);
    border-radius: 7px;
    margin-bottom: 6px;
    font-size: 0.82rem;
  }
  .server-item .use-btn {
    padding: 3px 10px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.78rem;
  }

  .discover-status { font-size: 0.78rem; color: var(--muted); margin-top: 4px; }

  /* ── Effect Log ── */
  #effect-log {
    max-height: 420px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .effect-entry {
    background: var(--bg);
    border-left: 3px solid var(--accent);
    border-radius: 0 7px 7px 0;
    padding: 8px 12px;
    font-size: 0.82rem;
    animation: slideIn .2s ease;
  }
  .effect-entry.ahk    { border-color: #34d399; }
  .effect-entry.vjoy   { border-color: #60a5fa; }
  .effect-entry.plugin { border-color: #f59e0b; }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .effect-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 3px;
  }
  .effect-name   { font-weight: 600; }
  .effect-badge  {
    font-size: 0.68rem; padding: 1px 6px;
    background: rgba(255,255,255,0.08);
    border-radius: 4px;
    text-transform: uppercase;
  }
  .effect-time   { font-size: 0.7rem; color: var(--muted); margin-left: auto; }
  .effect-donor  { color: var(--muted); }
  .effect-donor span { color: var(--yellow); font-weight: 600; }

  .log-empty { color: var(--muted); font-size: 0.85rem; text-align: center; padding: 40px 0; }

  /* ── Console log ── */
  #console-log {
    background: var(--bg);
    border-radius: 8px;
    padding: 10px 12px;
    max-height: 180px;
    overflow-y: auto;
    font-family: 'Consolas', monospace;
    font-size: 0.75rem;
    line-height: 1.6;
  }
  .log-line.error { color: var(--red); }
  .log-line.warn  { color: var(--yellow); }
  .log-line.info  { color: var(--text); }
  .log-line.debug { color: var(--muted); }
</style>
</head>
<body>

<header>
  <h1>⚡ Viewer Merusuh</h1>
  <span class="version">CLIENT v0.5.0</span>
</header>

<div class="grid">

  <!-- ── Kolom kiri ── -->
  <div>

    <!-- Koneksi -->
    <div class="card">
      <h2>Koneksi Server</h2>
      <span id="conn-badge" class="badge disconnected">Disconnected</span>
      <p id="conn-url" class="conn-url">—</p>
      <div class="stats-row" style="margin-top:14px">
        <div class="stat">
          <div class="val" id="stat-received">0</div>
          <div class="lbl">Efek Diterima</div>
        </div>
        <div class="stat">
          <div class="val" id="stat-uptime">—</div>
          <div class="lbl">Uptime</div>
        </div>
      </div>
    </div>

    <!-- Adapters -->
    <div class="card">
      <h2>Adapter</h2>
      <div id="adapter-list">
        <p style="color:var(--muted);font-size:.83rem">Memuat...</p>
      </div>
    </div>

    <!-- LAN Discovery -->
    <div class="card">
      <h2>Auto-Discovery LAN</h2>
      <button class="discover-btn" id="discover-btn" onclick="startDiscover()">🔍 Scan Server di LAN</button>
      <div id="discover-results"></div>
      <p id="discover-status" class="discover-status"></p>
    </div>

  </div>

  <!-- ── Kolom kanan ── -->
  <div>

    <!-- Effect Log -->
    <div class="card">
      <h2>Log Efek Real-time</h2>
      <div id="effect-log">
        <p class="log-empty">Belum ada efek masuk. Menunggu donasi...</p>
      </div>
    </div>

    <!-- Console -->
    <div class="card">
      <h2>Console</h2>
      <div id="console-log"></div>
    </div>

  </div>

</div>

<script>
// ── State ──────────────────────────────────────────────────────────────────

let connectedAt   = null;
let effectCount   = 0;
const adapters    = {};

// ── SSE ───────────────────────────────────────────────────────────────────

const sse = new EventSource('/api/events');

sse.addEventListener('conn', e => {
  const d = JSON.parse(e.data);
  updateConn(d);
});

sse.addEventListener('effect', e => {
  const d = JSON.parse(e.data);
  effectCount++;
  document.getElementById('stat-received').textContent = effectCount;
  prependEffect(d);
});

sse.addEventListener('adapter', e => {
  const d = JSON.parse(e.data);
  adapters[d.name] = d;
  renderAdapters();
});

sse.addEventListener('log', e => {
  const d = JSON.parse(e.data);
  appendLog(d);
});

sse.onerror = () => {
  appendLog({ level: 'warn', message: 'SSE terputus — mencoba reconnect...' });
};

// ── Conn ──────────────────────────────────────────────────────────────────

function updateConn(d) {
  const badge = document.getElementById('conn-badge');
  badge.className = 'badge ' + d.status;
  const labels = { connected: 'Connected', disconnected: 'Disconnected', reconnecting: 'Reconnecting...' };
  badge.textContent = labels[d.status] || d.status;
  document.getElementById('conn-url').textContent = d.serverUrl || '—';
  if (d.status === 'connected' && d.since) connectedAt = d.since;
  if (d.status !== 'connected') connectedAt = null;
}

// ── Adapters ──────────────────────────────────────────────────────────────

function renderAdapters() {
  const el = document.getElementById('adapter-list');
  if (!Object.keys(adapters).length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:.83rem">Tidak ada adapter aktif.</p>';
    return;
  }
  el.innerHTML = Object.entries(adapters).map(([name, a]) => \`
    <div class="adapter-row">
      <div>
        <div class="adapter-name">\${name}</div>
        \${a.error ? \`<div class="adapter-err">\${a.error}</div>\` : ''}
      </div>
      <label class="toggle" title="\${a.enabled ? 'Nonaktifkan' : 'Aktifkan'} \${name}">
        <input type="checkbox" \${a.enabled ? 'checked' : ''}
          onchange="toggleAdapter('\${name}', this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  \`).join('');
}

async function toggleAdapter(name, enabled) {
  try {
    await fetch('/api/adapter/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
  } catch(e) {
    appendLog({ level: 'error', message: 'Gagal toggle adapter: ' + e.message });
  }
}

// ── Effect log ────────────────────────────────────────────────────────────

function prependEffect(d) {
  const log = document.getElementById('effect-log');
  const empty = log.querySelector('.log-empty');
  if (empty) empty.remove();

  const time  = new Date(d.timestamp).toLocaleTimeString('id-ID');
  const donor = d.donation ? \`dari <span>\${d.donation.username}</span> (Rp \${(d.donation.amount||0).toLocaleString('id-ID')})\` : '';

  const el = document.createElement('div');
  el.className = 'effect-entry ' + (d.adapter || '');
  el.innerHTML = \`
    <div class="effect-header">
      <span class="effect-name">\${d.name || d.action}</span>
      <span class="effect-badge">\${d.adapter || '?'}</span>
      <span class="effect-time">\${time}</span>
    </div>
    \${donor ? \`<div class="effect-donor">\${donor}</div>\` : ''}
  \`;
  log.prepend(el);

  // Batas 50 entri di DOM
  const entries = log.querySelectorAll('.effect-entry');
  if (entries.length > 50) entries[entries.length - 1].remove();
}

// ── Console log ───────────────────────────────────────────────────────────

function appendLog(d) {
  const el  = document.getElementById('console-log');
  const div = document.createElement('div');
  div.className = 'log-line ' + (d.level || 'info');
  const ts = new Date().toLocaleTimeString('id-ID');
  div.textContent = \`[\${ts}] \${d.message}\`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  // Batas 200 baris
  const lines = el.querySelectorAll('.log-line');
  if (lines.length > 200) lines[0].remove();
}

// ── LAN Discovery ─────────────────────────────────────────────────────────

async function startDiscover() {
  const btn    = document.getElementById('discover-btn');
  const status = document.getElementById('discover-status');
  const results = document.getElementById('discover-results');

  btn.disabled    = true;
  btn.textContent = '⏳ Scanning...';
  status.textContent = 'Mengirim broadcast UDP ke subnet...';
  results.innerHTML = '';

  try {
    const res  = await fetch('/api/discover');
    const data = await res.json();

    if (!data.servers || data.servers.length === 0) {
      status.textContent = 'Tidak ada server ditemukan di jaringan ini.';
    } else {
      status.textContent = data.servers.length + ' server ditemukan:';
      results.innerHTML = data.servers.map(s => \`
        <div class="server-item">
          <div>
            <strong>\${s.name}</strong>
            <div style="color:var(--muted);font-size:.75rem">\${s.url}</div>
          </div>
          <button class="use-btn" onclick="useServer('\${s.url}')">Gunakan</button>
        </div>
      \`).join('');
    }
  } catch(e) {
    status.textContent = 'Gagal scan: ' + e.message;
  }

  btn.disabled    = false;
  btn.textContent = '🔍 Scan Server di LAN';
}

async function useServer(url) {
  try {
    await fetch('/api/set-server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    appendLog({ level: 'info', message: 'Server diubah ke: ' + url + ' — restart client untuk menerapkan.' });
    document.getElementById('discover-status').textContent = '✓ Server dipilih. Restart client untuk konek.';
  } catch(e) {
    appendLog({ level: 'error', message: 'Gagal set server: ' + e.message });
  }
}

// ── Uptime timer ──────────────────────────────────────────────────────────

setInterval(() => {
  const el = document.getElementById('stat-uptime');
  if (!connectedAt) { el.textContent = '—'; return; }
  const sec = Math.floor((Date.now() - connectedAt) / 1000);
  const h   = Math.floor(sec / 3600);
  const m   = Math.floor((sec % 3600) / 60);
  const s   = sec % 60;
  el.textContent = h > 0
    ? \`\${h}j \${m}m\`
    : m > 0 ? \`\${m}m \${s}s\` : \`\${s}s\`;
}, 1000);

// ── Init: load state awal ─────────────────────────────────────────────────

(async () => {
  try {
    const res  = await fetch('/api/state');
    const data = await res.json();

    updateConn(data.connection);
    effectCount = data.stats.effectsReceived || 0;
    document.getElementById('stat-received').textContent = effectCount;
    if (data.connection.status === 'connected') connectedAt = data.connection.since;

    // Adapters
    Object.assign(adapters, data.adapters || {});
    renderAdapters();

    // Effect log history
    (data.effectLog || []).reverse().forEach(prependEffect);

  } catch(e) {
    appendLog({ level: 'warn', message: 'Gagal load state awal: ' + e.message });
  }
})();
</script>
</body>
</html>`;
}

// ─── HTTP Request Handler ──────────────────────────────────────────────────

function sendJSON(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

// Referensi ke adapterManager — diisi saat init()
let _adapterManager = null;
let _connection     = null;

function createServer() {
  return http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];

    // ── Halaman utama ──────────────────────────────────────
    if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
      const html = buildHTML();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    // ── SSE stream ─────────────────────────────────────────
    if (req.method === 'GET' && url === '/api/events') {
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

    // ── State snapshot ─────────────────────────────────────
    if (req.method === 'GET' && url === '/api/state') {
      return sendJSON(res, 200, state);
    }

    // ── LAN Discovery ──────────────────────────────────────
    if (req.method === 'GET' && url === '/api/discover') {
      try {
        const servers = await discoverServers();
        return sendJSON(res, 200, { servers });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    }

    // ── Set server URL ─────────────────────────────────────
    if (req.method === 'POST' && url === '/api/set-server') {
      try {
        const { url: serverUrl } = await parseBody(req);
        if (!serverUrl) return sendJSON(res, 400, { error: 'url diperlukan' });
        // Simpan ke state (diterapkan saat restart)
        state.connection.serverUrl = serverUrl;
        // Coba tulis ulang ke .env (best-effort)
        _patchEnvFile('SERVER_URL', serverUrl);
        return sendJSON(res, 200, { ok: true, serverUrl, note: 'Restart client untuk menerapkan perubahan.' });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    // ── Toggle adapter ─────────────────────────────────────
    if (req.method === 'POST' && url.startsWith('/api/adapter/')) {
      const name = url.replace('/api/adapter/', '');
      try {
        const { enabled } = await parseBody(req);
        if (!_adapterManager) return sendJSON(res, 503, { error: 'AdapterManager belum siap' });

        const adapter = _adapterManager.adapters.get(name);
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

// ─── Patch .env file ───────────────────────────────────────────────────────

function _patchEnvFile(key, value) {
  try {
    const fs      = require('fs');
    const envPath = require('path').resolve(process.cwd(), '.env');
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

// ─── Interface ─────────────────────────────────────────────────────────────

let server = null;

const dashboard = {
  /**
   * @param {object} adapterManager
   * @param {object} connection
   */
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

  /** Emit event dari luar (misal dari connection.js atau adapterManager) */
  emitConn:    (data) => bus.emit('conn:status', data),
  emitEffect:  (data) => bus.emit('effect', data),
  emitAdapter: (data) => bus.emit('adapter:status', data),
  emitLog:     (data) => bus.emit('log', data),

  /** Update state adapters (dipanggil saat init adapter selesai) */
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
