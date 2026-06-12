// dashboard/src/pages/DashboardPage.jsx
import { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'

function StatCard({ icon, label, value, color = 'var(--primary)' }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function formatRp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}d lalu`
  if (s < 3600) return `${Math.floor(s/60)}m lalu`
  return `${Math.floor(s/3600)}j lalu`
}

export default function DashboardPage({ lastDonation, lastEffect }) {
  const [status, setStatus] = useState(null)
  const [feed, setFeed] = useState([])
  const feedRef = useRef([])

  const [queue, setQueue] = useState({ length: 0, isProcessing: false, items: [] })

  useEffect(() => {
    api.getStatus().then(d => setStatus(d)).catch(() => {})
    api.getQueue().then(d => setQueue(d.data)).catch(() => {})
    const t = setInterval(() => {
      api.getStatus().then(d => setStatus(d)).catch(() => {})
      api.getQueue().then(d => setQueue(d.data)).catch(() => {})
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // Tambah ke live feed saat ada efek baru
  useEffect(() => {
    if (!lastEffect) return
    const item = { ...lastEffect, _id: Date.now() }
    feedRef.current = [item, ...feedRef.current].slice(0, 30)
    setFeed([...feedRef.current])
  }, [lastEffect])

  const uptime = status ? (() => {
    const s = status.uptime
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return `${h}j ${m}m`
  })() : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
          Status server dan aktivitas real-time
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard icon="⚡" label="Efek Aktif"       value={status?.activeEffects ?? '—'} color="var(--primary)" />
        <StatCard icon="💰" label="Total Donasi"     value={status?.totalDonations ?? '—'} color="var(--green)" />
        <StatCard icon="⏱️"  label="Uptime Server"   value={uptime} color="var(--amber)" />
        <StatCard icon="🟢" label="Status"           value={status ? 'Online' : '...'} color="var(--green)" />
        <StatCard icon="⏳" label="Antrian Efek"     value={queue.length} color={queue.length > 0 ? 'var(--amber)' : 'var(--text-2)'} />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Live feed */}
        <div className="card" style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2s infinite' }} />
            Live Feed
          </div>
          {feed.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              Belum ada aktivitas.<br/>Tunggu donasi masuk atau kirim test donasi.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {feed.map(item => (
                <div key={item._id} style={{
                  background: 'var(--surface2)', borderRadius: 8,
                  padding: '10px 12px', display: 'flex', gap: 12, alignItems: 'flex-start',
                  borderLeft: '3px solid var(--primary)',
                }}>
                  <div style={{ fontSize: 20 }}>🎮</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {item.donation?.donatorName}
                      <span style={{ color: 'var(--green)', marginLeft: 8, fontWeight: 700 }}>
                        {formatRp(item.donation?.amount)}
                      </span>
                    </div>
                    <div style={{ color: 'var(--amber)', fontSize: 12, marginTop: 2 }}>
                      ⚡ {item.name}
                    </div>
                    {item.donation?.message && (
                      <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>
                        "{item.donation.message}"
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                    {timeAgo(item._id)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test panel */}
        <TestPanel />
      </div>
    </div>
  )
}

function TestPanel() {
  const [amount, setAmount]   = useState('10000')
  const [name, setName]       = useState('Test Viewer')
  const [msg, setMsg]         = useState('merusuh!')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)

  async function send() {
    setLoading(true); setResult(null)
    try {
      const r = await api.testDonation({ amount: parseInt(amount), donatorName: name, message: msg })
      setResult({ ok: true, msg: r.message })
    } catch (e) {
      setResult({ ok: false, msg: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ width: 260, flexShrink: 0 }}>
      <div style={{ fontWeight: 700, marginBottom: 16 }}>🧪 Test Donasi</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label>Nominal (Rp)</label>
          <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div>
          <label>Nama Viewer</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label>Pesan</label>
          <input className="input" value={msg} onChange={e => setMsg(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={send} disabled={loading}>
          {loading ? '⏳ Mengirim...' : '🚀 Kirim Test'}
        </button>
        {result && (
          <div style={{
            padding: '8px 12px', borderRadius: 6, fontSize: 12,
            background: result.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: result.ok ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${result.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            {result.ok ? '✅' : '❌'} {result.msg}
          </div>
        )}
      </div>
    </div>
  )
}
