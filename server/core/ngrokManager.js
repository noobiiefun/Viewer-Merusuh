/**
 * ngrokManager.js
 * Mengelola lifecycle tunnel ngrok (start/stop/status) menggunakan SDK resmi @ngrok/ngrok.
 * Tidak perlu user download ngrok.exe terpisah — binary di-manage otomatis oleh package ini.
 *
 * State tunnel disimpan in-memory (hilang saat server restart, makanya ada NGROK_AUTOSTART
 * di .env supaya tunnel otomatis nyala lagi tiap server start kalau token sudah disimpan).
 */

const eventBus = require('./eventBus');

let ngrokLib = null; // lazy require, supaya server tetap jalan walau package belum ke-install
let currentListener = null;
let state = {
  status: 'stopped', // 'stopped' | 'starting' | 'connected' | 'error'
  url: null,
  startedAt: null,
  error: null,
};

function getNgrokLib() {
  if (!ngrokLib) {
    try {
      ngrokLib = require('@ngrok/ngrok');
    } catch (err) {
      throw new Error(
        "Package '@ngrok/ngrok' belum terinstall. Jalankan: npm install @ngrok/ngrok"
      );
    }
  }
  return ngrokLib;
}

function getState() {
  return { ...state };
}

function setState(patch) {
  state = { ...state, ...patch };
  eventBus.emit('ngrok_status', getState());
}

/**
 * Mulai tunnel ngrok ke port lokal server.
 * @param {object} opts
 * @param {string} opts.authtoken - ngrok authtoken
 * @param {number} opts.port - port lokal yang mau di-tunnel (default: PORT server, biasanya 3000)
 */
async function start({ authtoken, port }) {
  if (!authtoken) {
    throw new Error('Authtoken ngrok belum diisi.');
  }
  if (currentListener) {
    // sudah jalan, stop dulu sebelum start ulang (misal token berubah)
    await stop();
  }

  setState({ status: 'starting', error: null });

  try {
    const ngrok = getNgrokLib();
    const listener = await ngrok.forward({
      addr: port,
      authtoken,
    });

    currentListener = listener;
    const url = listener.url();

    setState({
      status: 'connected',
      url,
      startedAt: Date.now(),
      error: null,
    });

    return { url };
  } catch (err) {
    setState({ status: 'error', error: err.message || String(err) });
    throw err;
  }
}

async function stop() {
  if (currentListener) {
    try {
      await currentListener.close();
    } catch (_) {
      // ignore close error, tetap reset state
    }
    currentListener = null;
  }
  setState({ status: 'stopped', url: null, startedAt: null, error: null });
}

/**
 * Test apakah tunnel benar-benar reachable dari internet.
 * Hit endpoint /api/ngrok/ping-target (lihat routes/ngrok.js) lewat URL publik ngrok itu sendiri.
 */
async function testConnection() {
  if (!state.url) {
    throw new Error('Tunnel belum aktif. Connect dulu sebelum test.');
  }

  const target = `${state.url}/api/ngrok/ping-target`;

  // Pakai global fetch (Node 18+)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(target, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, message: `Server merespons status ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, message: 'Tunnel aktif dan bisa diakses dari internet.', data };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { ok: false, message: 'Timeout — tunnel tidak merespons dalam 10 detik.' };
    }
    return { ok: false, message: err.message || 'Gagal connect ke tunnel.' };
  }
}

module.exports = { start, stop, getState, testConnection };
