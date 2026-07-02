// dashboard/src/pages/ConfigPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../utils/api'

function Section({ title, children }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function CopyInput({ label, value }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" readOnly value={value} style={{ fontFamily: 'monospace', fontSize: 12 }} />
        <button className="btn btn-ghost btn-sm" onClick={copy} style={{ flexShrink: 0 }}>
          {copied ? '✅' : '📋'}
        </button>
      </div>
    </div>
  )
}

// ── Status badge helper ──────────────────────────────────────────────
const NGROK_BADGE = {
  stopped:  { label: 'Belum Terhubung', color: '#6b7280' },
  starting: { label: 'Menghubungkan…',  color: '#f59e0b' },
  connected:{ label: 'Terhubung',       color: '#22c55e' },
  error:    { label: 'Error',           color: '#ef4444' },
}

function NgrokSection({ toast }) {
  const [token,      setToken]      = useState('')
  const [autostart,  setAutostart]  = useState(false)
  const [status,     setStatus]     = useState('stopped')
  const [url,        setUrl]        = useState(null)
  const [tokenSaved, setTokenSaved] = useState(false)
  const [busy,       setBusy]       = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [errorMsg,   setErrorMsg]   = useState(null)
  const intervalRef = useRef(null)

  const refreshStatus = useCallback(async () => {
    try {
      const res = await api.getNgrokStatus()
      setStatus(res.data.status)
      setUrl(res.data.url || null)
      setTokenSaved(res.data.tokenSaved)
      setAutostart(res.data.autostart)
      if (res.data.error) setErrorMsg(res.data.error)
      else setErrorMsg(null)
    } catch (_) {}
  }, [])

  useEffect(() => {
    refreshStatus()
    intervalRef.current = setInterval(refreshStatus, 4000)
    return () => clearInterval(intervalRef.current)
  }, [refreshStatus])

  async function handleConnect() {
    setBusy(true); setErrorMsg(null); setTestResult(null)
    try {
      // Simpan token ke .env kalau ada isian baru
      if (token.trim()) {
        await api.saveNgrokToken({ authtoken: token.trim(), autostart })
        setTokenSaved(true)
        setToken('')
      } else if (!tokenSaved) {
        toast.error('Paste ngrok authtoken dulu sebelum connect.')
        return
      }
      const res = await api.startNgrok()
      setUrl(res.data.url)
      setStatus('connected')
      toast.success('Ngrok tunnel aktif!')
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memulai tunnel.')
      toast.error(err.message || 'Gagal memulai tunnel.')
    } finally {
      setBusy(false); refreshStatus()
    }
  }

  async function handleDisconnect() {
    setBusy(true)
    try {
      await api.stopNgrok()
      setStatus('stopped'); setUrl(null)
      toast.success('Tunnel diputus.')
    } catch (err) {
      toast.error(err.message)
    } finally { setBusy(false) }
  }

  async function handleSaveToken() {
    if (!token.trim()) { toast.error('Token tidak boleh kosong.'); return }
    setBusy(true)
    try {
      await api.saveNgrokToken({ authtoken: token.trim(), autostart })
      setTokenSaved(true); setToken('')
      toast.success('Token tersimpan.')
    } catch (err) {
      toast.error(err.message)
    } finally { setBusy(false) }
  }

  async function handleTest() {
    setBusy(true); setTestResult(null)
    try {
      const res = await api.testNgrok()
      setTestResult(res.data)
    } catch (err) {
      setTestResult({ ok: false, message: err.message })
    } finally { setBusy(false) }
  }

  async function handleAutostartToggle(checked) {
    setAutostart(checked)
    // Simpan perubahan autostart ke .env langsung (token kosong = pakai yang tersimpan)
    try {
      await api.saveNgrokToken({ authtoken: '', autostart: checked })
    } catch (_) {}
  }

  const badge = NGROK_BADGE[status] || NGROK_BADGE.stopped
  const isConnected = status === 'connected'

  return (
    <Section title="🌐 Ngrok Tunnel">
      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 12, padding: '3px 12px', borderRadius: 999, fontWeight: 600,
          background: `${badge.color}22`, color: badge.color, border: `1px solid ${badge.color}55`,
        }}>
          ● {badge.label}
        </span>
        {isConnected && url && (
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Tunnel aktif — webhook Saweria/Trakteer siap dipakai lewat URL publik
          </span>
        )}
      </div>

      <p style={{ color: 'var(--text-2)', fontSize: 13, margin: 0 }}>
        Hubungkan server ke internet langsung dari sini tanpa install ngrok terpisah.
        URL publik otomatis muncul dan bisa langsung dipasang ke Saweria / Trakteer.{' '}
        <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank" rel="noreferrer"
          style={{ color: 'var(--primary)' }}>
          Ambil authtoken →
        </a>
      </p>

      {/* Input token */}
      <div>
        <label>Ngrok Authtoken</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="password"
            placeholder={tokenSaved ? '•••••••••••••• (token sudah tersimpan, isi untuk ganti)' : 'Paste authtoken di sini…'}
            value={token}
            onChange={e => { setToken(e.target.value); setTestResult(null) }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
          {token.trim() && (
            <button className="btn btn-ghost btn-sm" onClick={handleSaveToken} disabled={busy} style={{ flexShrink: 0 }}>
              Simpan Token
            </button>
          )}
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>
          Token disimpan di file .env dan tidak pernah ditampilkan ulang setelah tersimpan.
        </p>
      </div>

      {/* Autostart toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          id="ngrok-autostart"
          checked={autostart}
          onChange={e => handleAutostartToggle(e.target.checked)}
        />
        <label htmlFor="ngrok-autostart" style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}>
          Otomatis konek ngrok saat aplikasi dibuka
        </label>
      </div>

      {/* Tombol connect/disconnect + test */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {isConnected ? (
          <button className="btn btn-danger" onClick={handleDisconnect} disabled={busy}>
            {busy ? '⏳ Memutus…' : '🔌 Putuskan Tunnel'}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleConnect} disabled={busy || (!token.trim() && !tokenSaved)}>
            {busy && status === 'starting' ? '⏳ Menghubungkan…' : '🌐 Hubungkan Ngrok'}
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={handleTest}
          disabled={busy || !isConnected}
          title={!isConnected ? 'Connect dulu sebelum test' : 'Test round-trip via URL publik ngrok'}
        >
          🔍 Test Koneksi
        </button>
      </div>

      {/* URL publik */}
      {isConnected && url && (
        <div>
          <label>URL Publik (gunakan ini di Saweria / Trakteer / Client Module)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" readOnly value={url} style={{ fontFamily: 'monospace', fontSize: 12 }} />
            <button className="btn btn-ghost btn-sm" onClick={() => {
              navigator.clipboard.writeText(url)
              toast.success('URL disalin!')
            }} style={{ flexShrink: 0 }}>📋</button>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>
            Webhook Saweria: <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: 4 }}>{url}/webhook/saweria</code>
            &nbsp;·&nbsp;
            Trakteer: <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: 4 }}>{url}/webhook/trakteer</code>
          </p>
        </div>
      )}

      {/* Hasil test */}
      {testResult && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13,
          background: testResult.ok ? '#22c55e1a' : '#ef44441a',
          color: testResult.ok ? '#22c55e' : '#ef4444',
          border: `1px solid ${testResult.ok ? '#22c55e44' : '#ef444444'}`,
        }}>
          {testResult.ok ? '✅ ' : '❌ '}{testResult.message}
        </div>
      )}

      {/* Error msg */}
      {errorMsg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13,
          background: '#ef44441a', color: '#ef4444',
          border: '1px solid #ef444444',
        }}>
          ⚠️ {errorMsg}
        </div>
      )}
    </Section>
  )
}

export default function ConfigPage({ toast }) {
  const [cfg, setCfg]         = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const host = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : window.location.origin

  useEffect(() => {
    api.getConfig().then(r => { setCfg(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api.saveConfig(cfg)
      toast.success('Konfigurasi disimpan!')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }))

  if (loading) return <div style={{ color: 'var(--text-3)', padding: 40 }}>Memuat konfigurasi...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>⚙️ Konfigurasi</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>Setting server dan integrasi platform</p>
      </div>

      {/* Webhook URLs */}
      <Section title="🔗 Webhook URLs">
        <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
          Copy URL di bawah ini ke dashboard Saweria / Trakteer kamu.
          Jika server berjalan lokal, gunakan ngrok/localtunnel untuk expose ke internet.
        </p>
        <CopyInput label="Saweria Webhook URL"  value={`${host}/webhook/saweria`} />
        <CopyInput label="Trakteer Webhook URL" value={`${host}/webhook/trakteer`} />
        <CopyInput label="OBS Overlay URL"      value={`${host}/overlay`} />
      </Section>

      {/* Ngrok */}
      <NgrokSection toast={toast} />

      {/* General */}
      <Section title="🎮 General">
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label>Nominal Donasi Minimum (Rp)</label>
            <input className="input" type="number"
              value={cfg.min_donation_amount || '1000'}
              onChange={e => set('min_donation_amount', e.target.value)}
              placeholder="1000" />
            <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>
              Donasi di bawah nominal ini diabaikan
            </p>
          </div>
          <div style={{ flex: 1 }}>
            <label>Mode Queue Efek</label>
            <select className="select" value={cfg.queue_mode || 'sequential'}
              onChange={e => set('queue_mode', e.target.value)}>
              <option value="sequential">Sequential — efek antri satu per satu</option>
              <option value="parallel">Parallel — efek langsung dijalankan bersamaan</option>
            </select>
            <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>
              Sequential: 3 donasi = 3 efek berurutan. Parallel: langsung semua.
            </p>
          </div>
        </div>

        {/* Durasi Notifikasi */}
        <div>
          <label>Durasi Notifikasi OBS (detik)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              className="input"
              type="range"
              min="1" max="30" step="0.5"
              style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
              value={(parseInt(cfg.notification_duration_ms) || 5000) / 1000}
              onChange={e => set('notification_duration_ms', String(parseFloat(e.target.value) * 1000))}
            />
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '6px 14px', fontWeight: 700,
              color: 'var(--primary)', minWidth: 60, textAlign: 'center',
            }}>
              {((parseInt(cfg.notification_duration_ms) || 5000) / 1000).toFixed(1)}s
            </div>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>
            Berapa lama notif donasi tampil di OBS. Overlay sync otomatis tiap 30 detik.
          </p>
        </div>
      </Section>

      {/* OBS Overlay */}
      <Section title="📺 OBS Overlay">
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label>Tema Overlay</label>
            <select className="select" value={cfg.overlay_theme || 'dark'}
              onChange={e => set('overlay_theme', e.target.value)}>
              <option value="dark">Dark (default)</option>
              <option value="light">Light</option>
              <option value="neon">Neon</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Posisi Notifikasi</label>
            <select className="select" value={cfg.overlay_position || 'bottom-right'}
              onChange={e => set('overlay_position', e.target.value)}>
              <option value="bottom-right">Kanan Bawah</option>
              <option value="bottom-left">Kiri Bawah</option>
              <option value="top-right">Kanan Atas</option>
              <option value="top-left">Kiri Atas</option>
            </select>
          </div>
        </div>

        {/* OBS setup guide */}
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>📋 Cara Setup OBS Overlay:</p>
          <ol style={{ color: 'var(--text-2)', fontSize: 13, paddingLeft: 16, lineHeight: 2 }}>
            <li>Buka OBS → klik <strong>+</strong> di panel Sources</li>
            <li>Pilih <strong>Browser Source</strong></li>
            <li>Set URL: <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: 4 }}>{host}/overlay</code></li>
            <li>Width: <strong>400</strong>, Height: <strong>600</strong></li>
            <li>Centang <strong>"Shutdown source when not visible"</strong> → OFF</li>
            <li>Centang <strong>"Refresh browser when scene becomes active"</strong> → ON</li>
          </ol>
        </div>
      </Section>

      {/* AutoHotkey */}
      <Section title="🤖 AutoHotkey">
        <div>
          <label>Path AutoHotkey.exe</label>
          <input className="input" style={{ fontFamily: 'monospace', fontSize: 12 }}
            value={cfg.ahk_exe_path || 'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe'}
            onChange={e => set('ahk_exe_path', e.target.value)}
            placeholder="C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe" />
          <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>
            Sesuaikan jika AutoHotkey diinstall di folder lain. Perlu restart server setelah ganti.
          </p>
        </div>
      </Section>

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? '⏳ Menyimpan...' : '💾 Simpan Konfigurasi'}
      </button>
    </div>
  )
}
