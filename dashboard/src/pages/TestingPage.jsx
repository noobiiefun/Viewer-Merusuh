// dashboard/src/pages/TestingPage.jsx
import { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'

const PLATFORM_ICONS = { saweria: '🧋', trakteer: '☕', test: '🧪' }
const PLATFORM_COLORS = { saweria: '#FF6B35', trakteer: '#E63946', test: '#7c3aed' }
const ADAPTER_ICONS   = { ahk: '🖥️', vjoy: '🕹️', plugin: '🎮' }

function formatRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

// ── Preset nominal donasi ─────────────────────────────────────────────
const PRESETS = [1000, 2000, 5000, 10000, 15000, 20000, 50000, 100000]

export default function TestingPage({ toast, lastEffect }) {
  const [effects, setEffects]     = useState([])
  const [platforms, setPlatforms] = useState([])
  const [logs, setLogs]           = useState([])
  const [preview, setPreview]     = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [sending, setSending]     = useState(false)
  const [triggering, setTriggering] = useState(null)

  // Form state
  const [form, setForm] = useState({
    platform:    'test',
    donatorName: 'Test Viewer',
    amount:      '10000',
    message:     'merusuh!',
  })

  const previewTimer = useRef(null)
  const logsEndRef   = useRef(null)

  // Load data awal
  useEffect(() => {
    Promise.all([
      api.getEffects().then(r => setEffects(r.data)).catch(() => {}),
      api.testingPlatforms().then(r => setPlatforms(r.data)).catch(() => {}),
      api.testingLogs().then(r => setLogs(r.data)).catch(() => {}),
    ])
  }, [])

  // Live update logs saat ada efek baru
  useEffect(() => {
    if (!lastEffect) return
    api.testingLogs().then(r => setLogs(r.data)).catch(() => {})
  }, [lastEffect])

  // Preview efek saat nominal berubah (debounce 400ms)
  useEffect(() => {
    const amt = parseInt(form.amount)
    if (!amt || isNaN(amt)) { setPreview(null); return }
    clearTimeout(previewTimer.current)
    setLoadingPreview(true)
    previewTimer.current = setTimeout(async () => {
      try {
        const r = await api.testingPreview(amt)
        setPreview(r)
      } catch { setPreview(null) }
      setLoadingPreview(false)
    }, 400)
    return () => clearTimeout(previewTimer.current)
  }, [form.amount])

  // Kirim simulasi donasi
  async function handleDonate() {
    const amt = parseInt(form.amount)
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error('Masukkan nominal yang valid'); return
    }
    setSending(true)
    try {
      const r = await api.testingDonate({
        platform:    form.platform,
        donatorName: form.donatorName || 'Test Viewer',
        amount:      amt,
        message:     form.message,
      })
      toast.success(r.message)
      api.testingLogs().then(d => setLogs(d.data)).catch(() => {})
    } catch (e) { toast.error(e.message) }
    finally { setSending(false) }
  }

  // Trigger efek langsung
  async function handleDirectTrigger(effectId, effectName) {
    setTriggering(effectId)
    try {
      const r = await api.testingTrigger({ effectId })
      toast.success(`⚡ "${effectName}" di-trigger`)
      api.testingLogs().then(d => setLogs(d.data)).catch(() => {})
    } catch (e) { toast.error(e.message) }
    finally {
      setTimeout(() => setTriggering(null), 2000)
    }
  }

  // Clear logs
  async function handleClearLogs() {
    await api.testingClearLogs().catch(() => {})
    setLogs([])
    toast.info('Log dibersihkan')
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>🧪 Testing Area</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
          Simulasi donasi dan trigger efek tanpa perlu donasi sungguhan
        </p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Kolom kiri: form simulasi ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

          {/* Form donasi */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
              💰 Simulasi Donasi
            </div>

            {/* Platform selector */}
            <div style={{ marginBottom: 14 }}>
              <label>Platform</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {platforms.map(p => (
                  <button key={p.id} onClick={() => set('platform', p.id)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${form.platform === p.id ? p.color || 'var(--primary)' : 'var(--border)'}`,
                      background: form.platform === p.id ? `${p.color || 'var(--primary)'}18` : 'var(--surface2)',
                      color: form.platform === p.id ? (p.color || 'var(--primary)') : 'var(--text-2)',
                      fontWeight: form.platform === p.id ? 700 : 400,
                      fontSize: 13, transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <span>{p.name}</span>
                    {!p.configured && p.id !== 'test' && (
                      <span style={{ fontSize: 10, color: 'var(--amber)' }}>Belum dikonfigurasi</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Nominal */}
            <div style={{ marginBottom: 14 }}>
              <label>Nominal Donasi</label>
              <input
                className="input" type="number" value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="Rp 10.000"
                style={{ fontWeight: 700, fontSize: 16 }}
              />
              {/* Preset buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {PRESETS.map(p => (
                  <button key={p} onClick={() => set('amount', String(p))}
                    className="btn btn-ghost btn-sm"
                    style={{
                      background: form.amount === String(p) ? 'rgba(124,58,237,0.15)' : undefined,
                      color:      form.amount === String(p) ? 'var(--primary)' : undefined,
                      borderColor: form.amount === String(p) ? 'var(--primary)' : undefined,
                    }}>
                    {formatRp(p)}
                  </button>
                ))}
              </div>
            </div>

            {/* Nama donatur */}
            <div style={{ marginBottom: 14 }}>
              <label>Nama Donatur</label>
              <input className="input" value={form.donatorName}
                onChange={e => set('donatorName', e.target.value)}
                placeholder="Test Viewer" />
            </div>

            {/* Pesan */}
            <div style={{ marginBottom: 16 }}>
              <label>Pesan (opsional)</label>
              <input className="input" value={form.message}
                onChange={e => set('message', e.target.value)}
                placeholder="Pesan donasi..." />
            </div>

            {/* Preview efek */}
            <EffectPreview preview={preview} loading={loadingPreview} amount={form.amount} />

            {/* Tombol kirim */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 12, padding: '12px' }}
              onClick={handleDonate}
              disabled={sending}
            >
              {sending ? '⏳ Mengirim...' : `🚀 Kirim Simulasi Donasi`}
            </button>
          </div>

          {/* Direct trigger */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              ⚡ Trigger Efek Langsung
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 14 }}>
              Trigger efek tanpa melalui flow donasi — berguna untuk test adapter spesifik
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {effects.filter(e => e.is_active).map(e => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--surface2)',
                  border: triggering === e.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {ADAPTER_ICONS[e.adapter]} {e.adapter}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        ⏱ {(e.duration_ms / 1000).toFixed(1)}s
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--green)' }}>
                        {formatRp(e.min_amount)}+
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={triggering !== null}
                    onClick={() => handleDirectTrigger(e.id, e.name)}
                    style={{
                      flexShrink: 0,
                      background: triggering === e.id ? 'rgba(124,58,237,0.15)' : undefined,
                      color: triggering === e.id ? 'var(--primary)' : undefined,
                    }}
                  >
                    {triggering === e.id ? '⏳' : '▶'}
                  </button>
                </div>
              ))}
              {effects.filter(e => e.is_active).length === 0 && (
                <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                  Belum ada efek aktif. Tambahkan di halaman Efek.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Kolom kanan: log realtime ──────────────────────────────── */}
        <div style={{ width: 340, flexShrink: 0 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--green)',
                  boxShadow: '0 0 6px var(--green)',
                }} />
                Log Testing
              </div>
              {logs.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={handleClearLogs}>
                  🗑️ Clear
                </button>
              )}
            </div>

            <div style={{ maxHeight: 600, overflowY: 'auto', padding: '8px 0' }}>
              {logs.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  Belum ada aktivitas testing.<br />Kirim simulasi donasi untuk memulai.
                </div>
              ) : logs.map(log => (
                <LogEntry key={log.id} log={log} />
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Komponen preview efek ────────────────────────────────────────────
function EffectPreview({ preview, loading, amount }) {
  if (!amount || isNaN(parseInt(amount))) return null

  if (loading) {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 8,
        background: 'var(--surface2)', border: '1px solid var(--border)',
        color: 'var(--text-3)', fontSize: 13,
      }}>
        🔍 Mencari efek yang cocok...
      </div>
    )
  }

  if (!preview) return null

  if (!preview.matched) {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 8,
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        color: 'var(--text-2)', fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>😴</span>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>Tidak ada efek yang cocok</div>
          <div style={{ fontSize: 12 }}>Donasi akan diterima tapi tidak ada efek yang aktif untuk nominal ini.</div>
        </div>
      </div>
    )
  }

  const e = preview.effect
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 8,
      background: 'rgba(124,58,237,0.1)',
      border: '1px solid rgba(124,58,237,0.3)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        ⚡ Efek yang akan aktif
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{e.name}</div>
      {e.description && (
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{e.description}</div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
          {ADAPTER_ICONS[e.adapter]} <strong>{e.adapter}</strong>
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
          🎮 {e.gameTarget}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
          ⏱ {(e.durationMs / 1000).toFixed(1)}s
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          <code style={{ fontSize: 11 }}>{e.actionKey}</code>
        </span>
      </div>
    </div>
  )
}

// ── Komponen satu entry log ──────────────────────────────────────────
function LogEntry({ log }) {
  const isDonation = log.type === 'donation'
  const isTrigger  = log.type === 'direct_trigger'

  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid var(--border)',
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>
          {isDonation ? (PLATFORM_ICONS[log.platform] || '💜') : '⚡'}
        </span>
        <div style={{ flex: 1 }}>
          {isDonation ? (
            <span style={{ fontWeight: 600 }}>
              {log.donatorName}
              <span style={{ color: 'var(--green)', marginLeft: 8 }}>
                {formatRp(log.amount)}
              </span>
            </span>
          ) : (
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
              Direct: {log.effectName}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>
          {new Date(log.timestamp).toLocaleTimeString('id-ID')}
        </span>
      </div>

      {isDonation && log.matchedEffect ? (
        <div style={{
          marginLeft: 24, padding: '4px 8px', borderRadius: 6,
          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
          fontSize: 12,
        }}>
          <span style={{ color: 'var(--amber)' }}>⚡</span>
          {' '}<strong>{log.matchedEffect.name}</strong>
          <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>
            {ADAPTER_ICONS[log.matchedEffect.adapter]} {log.matchedEffect.adapter}
            {' · '}{(log.matchedEffect.durationMs / 1000).toFixed(1)}s
          </span>
        </div>
      ) : isDonation ? (
        <div style={{ marginLeft: 24, fontSize: 12, color: 'var(--text-3)' }}>
          Tidak ada efek yang cocok
        </div>
      ) : null}

      {isDonation && log.message && (
        <div style={{ marginLeft: 24, marginTop: 3, fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
          "{log.message}"
        </div>
      )}
    </div>
  )
}
