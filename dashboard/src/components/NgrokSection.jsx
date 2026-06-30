// dashboard/src/components/NgrokSection.jsx
import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'

export default function NgrokSection() {
  const [status, setStatus]       = useState(null)
  const [token, setToken]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [msg, setMsg]             = useState(null)

  const loadStatus = useCallback(async () => {
    try {
      const r = await api.getNgrokStatus()
      setStatus(r)
    } catch {
      setStatus({ connected: false, hasToken: false })
    }
  }, [])

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 5000)
    return () => clearInterval(interval)
  }, [loadStatus])

  async function handleConnect() {
    setLoading(true)
    setMsg(null)
    try {
      const r = await api.startNgrok(token ? { authtoken: token } : {})
      setMsg({ type: 'success', text: `Tunnel aktif: ${r.url}` })
      setToken('') // kosongkan input setelah tersimpan
      await loadStatus()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    setLoading(true)
    setMsg(null)
    try {
      await api.stopNgrok()
      setMsg({ type: 'success', text: 'Tunnel dimatikan' })
      await loadStatus()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await api.pingNgrokTarget()
      setTestResult({ ok: true, text: `Reachable! Round-trip via ${r.url} berhasil.` })
    } catch (err) {
      setTestResult({ ok: false, text: err.message })
    } finally {
      setTesting(false)
    }
  }

  async function handleAutostartToggle(e) {
    const enabled = e.target.checked
    try {
      await api.setNgrokAutostart(enabled)
      setStatus(s => ({ ...s, autostart: enabled }))
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  function copyUrl() {
    if (status?.url) {
      navigator.clipboard.writeText(status.url)
      setMsg({ type: 'success', text: 'URL disalin!' })
    }
  }

  return (
    <div className="card">
      <h3>🌐 Ngrok Tunnel</h3>
      <p className="hint">
        Expose server kamu ke internet supaya webhook Saweria/Trakteer bisa masuk
        tanpa perlu install ngrok manual atau setting port forwarding router.
      </p>

      {/* Status indicator */}
      <div className="config-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: status?.connected ? '#22c55e' : '#6b7280',
          }}
        />
        <strong>{status?.connected ? 'Terhubung' : 'Tidak terhubung'}</strong>
        {status?.starting && <span style={{ opacity: 0.7 }}>(menyambungkan...)</span>}
      </div>

      {/* URL publik aktif */}
      {status?.connected && status?.url && (
        <div className="config-field">
          <label>URL Publik</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={status.url} readOnly />
            <button className="btn btn-secondary" onClick={copyUrl} type="button">
              Salin
            </button>
          </div>
          <p className="hint">
            Pasang URL ini (+ <code>/webhook/saweria</code> atau <code>/webhook/trakteer</code>)
            di dashboard platform donasi kamu.
          </p>
        </div>
      )}

      {/* Input authtoken — hanya tampil kalau belum connected */}
      {!status?.connected && (
        <div className="config-field">
          <label>Ngrok Authtoken</label>
          <input
            className="input"
            type="password"
            placeholder={status?.hasToken ? '•••••• (sudah tersimpan, kosongkan untuk pakai yang lama)' : 'Tempel authtoken di sini'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="hint">
            Ambil gratis di{' '}
            <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank" rel="noreferrer">
              dashboard.ngrok.com/get-started/your-authtoken
            </a>
          </p>
        </div>
      )}

      {/* Tombol aksi */}
      <div className="config-field" style={{ display: 'flex', gap: 8 }}>
        {!status?.connected ? (
          <button className="btn btn-primary" onClick={handleConnect} disabled={loading}>
            {loading ? 'Menyambungkan...' : 'Simpan & Hubungkan'}
          </button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={handleDisconnect} disabled={loading}>
              {loading ? 'Memutus...' : 'Putuskan'}
            </button>
            <button className="btn btn-primary" onClick={handleTest} disabled={testing}>
              {testing ? 'Mengetes...' : 'Test Koneksi'}
            </button>
          </>
        )}
      </div>

      {/* Autostart toggle */}
      <div className="config-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          id="ngrok-autostart"
          checked={!!status?.autostart}
          onChange={handleAutostartToggle}
        />
        <label htmlFor="ngrok-autostart" style={{ margin: 0 }}>
          Otomatis konek ngrok saat aplikasi dibuka
        </label>
      </div>

      {/* Pesan hasil aksi */}
      {msg && (
        <p className={msg.type === 'error' ? 'text-error' : 'text-success'}>
          {msg.text}
        </p>
      )}

      {/* Hasil test koneksi */}
      {testResult && (
        <p className={testResult.ok ? 'text-success' : 'text-error'}>
          {testResult.text}
        </p>
      )}
    </div>
  )
}
