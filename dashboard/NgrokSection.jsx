/**
 * NgrokSection.jsx
 * Tempel komponen ini ke dalam dashboard/src/pages/ConfigPage.jsx,
 * diletakkan setelah section "Webhook URLs" (sebelum atau sesudah section "General").
 *
 * Cara pakai di ConfigPage.jsx:
 *   import NgrokSection from '../components/NgrokSection';
 *   ...
 *   <NgrokSection />
 *
 * Endpoint yang dipakai (tambahkan ke dashboard/src/utils/api.js, lihat catatan di bawah file):
 *   getNgrokStatus, saveNgrokToken, startNgrokTunnel, stopNgrokTunnel, testNgrokTunnel
 */

import { useEffect, useState, useCallback } from 'react';
import {
  getNgrokStatus,
  saveNgrokToken,
  startNgrokTunnel,
  stopNgrokTunnel,
  testNgrokTunnel,
} from '../utils/api';

const STATUS_BADGE = {
  stopped: { label: 'Belum Terhubung', color: '#6b7280' },
  starting: { label: 'Menghubungkan...', color: '#f59e0b' },
  connected: { label: 'Terhubung', color: '#22c55e' },
  error: { label: 'Error', color: '#ef4444' },
};

export default function NgrokSection() {
  const [token, setToken] = useState('');
  const [autostart, setAutostart] = useState(true);
  const [status, setStatus] = useState('stopped');
  const [url, setUrl] = useState(null);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await getNgrokStatus();
      if (res.success) {
        setStatus(res.data.status);
        setUrl(res.data.url);
        setTokenSaved(res.data.tokenSaved);
        setAutostart(res.data.autostart);
        if (res.data.error) setErrorMsg(res.data.error);
      }
    } catch (err) {
      // diam-diam gagal, biar gak ganggu UI tiap polling
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 4000); // polling status tiap 4 detik
    return () => clearInterval(interval);
  }, [refreshStatus]);

  async function handleSaveAndConnect() {
    setBusy(true);
    setErrorMsg(null);
    setTestResult(null);
    try {
      if (token.trim()) {
        await saveNgrokToken(token.trim(), autostart);
        setTokenSaved(true);
      }
      const res = await startNgrokTunnel();
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal memulai tunnel.');
      } else {
        setUrl(res.data.url);
        setStatus('connected');
        setToken(''); // kosongkan input setelah tersimpan (security)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setBusy(false);
      refreshStatus();
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await stopNgrokTunnel();
      setStatus('stopped');
      setUrl(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await testNgrokTunnel();
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setBusy(false);
    }
  }

  function handleCopyUrl() {
    if (url) navigator.clipboard.writeText(url);
  }

  const badge = STATUS_BADGE[status] || STATUS_BADGE.stopped;

  return (
    <div className="config-section">
      <div className="config-section-header">
        <span>🌐 Ngrok Tunnel</span>
        <span
          style={{
            marginLeft: 12,
            fontSize: 12,
            padding: '2px 10px',
            borderRadius: 999,
            background: `${badge.color}22`,
            color: badge.color,
            border: `1px solid ${badge.color}55`,
          }}
        >
          ● {badge.label}
        </span>
      </div>

      <p className="config-section-desc">
        Paste ngrok authtoken kamu di sini supaya server bisa diakses dari internet (buat OBS
        Browser Source remote, webhook Saweria/Trakteer, atau Client Module di jaringan
        berbeda) — tanpa perlu setting terpisah lagi.{' '}
        <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank" rel="noreferrer">
          Ambil token di sini
        </a>
        .
      </p>

      <div className="config-field">
        <label>Ngrok Authtoken</label>
        <input
          type="password"
          placeholder={tokenSaved ? '•••••••••••••••• (sudah tersimpan)' : 'Paste token ngrok di sini'}
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>

      <div className="config-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          id="ngrok-autostart"
          checked={autostart}
          onChange={(e) => setAutostart(e.target.checked)}
        />
        <label htmlFor="ngrok-autostart" style={{ margin: 0 }}>
          Otomatis konek ngrok saat aplikasi dibuka
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {status === 'connected' ? (
          <button className="btn btn-danger" onClick={handleDisconnect} disabled={busy}>
            Putuskan Koneksi
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleSaveAndConnect} disabled={busy}>
            {busy ? 'Menghubungkan...' : 'Simpan & Hubungkan'}
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={handleTest}
          disabled={busy || status !== 'connected'}
        >
          Test Koneksi
        </button>
      </div>

      {url && (
        <div className="config-field" style={{ marginTop: 14 }}>
          <label>URL Publik (gunakan ini di Saweria/Trakteer/Client Module)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" readOnly value={url} />
            <button className="btn btn-secondary" onClick={handleCopyUrl}>
              Copy
            </button>
          </div>
        </div>
      )}

      {testResult && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 13,
            background: testResult.ok ? '#22c55e22' : '#ef444422',
            color: testResult.ok ? '#22c55e' : '#ef4444',
          }}
        >
          {testResult.ok ? '✅ ' : '❌ '}
          {testResult.message}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 13,
            background: '#ef444422',
            color: '#ef4444',
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}
    </div>
  );
}
