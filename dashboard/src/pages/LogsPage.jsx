// dashboard/src/pages/LogsPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'

const PLATFORM_ICONS = { saweria: '🧋', trakteer: '☕', test: '🧪' }
const STATUS_BADGE = {
  processed: <span className="badge badge-green">✅ Proses</span>,
  queued:    <span className="badge badge-purple">⏳ Antri</span>,
  no_effect: <span className="badge badge-gray">—  No Efek</span>,
  cooldown:  <span className="badge badge-amber">⏳ Cooldown</span>,
}

function formatRp(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }
function formatDate(s) {
  return new Date(s + 'Z').toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
}

export default function LogsPage({ lastDonation }) {
  const [logs, setLogs]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [platform, setPlatform] = useState('')
  const [page, setPage]         = useState(0)
  const LIMIT = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: LIMIT, offset: page * LIMIT }
      if (platform) params.platform = platform
      const r = await api.getLogs(params)
      setLogs(r.data)
      setTotal(r.total)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [platform, page])

  useEffect(() => { load() }, [load])

  // Reload saat ada donasi baru
  useEffect(() => { if (lastDonation) load() }, [lastDonation])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>📋 Log Donasi</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
            {total} total donasi tercatat
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="select" style={{ width: 'auto' }} value={platform} onChange={e => { setPlatform(e.target.value); setPage(0) }}>
            <option value="">Semua Platform</option>
            <option value="saweria">🧋 Saweria</option>
            <option value="trakteer">☕ Trakteer</option>
            <option value="test">🧪 Test</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Memuat...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Donatur</th>
                <th>Platform</th>
                <th>Nominal</th>
                <th>Efek</th>
                <th>Status</th>
                <th>Pesan</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Belum ada log donasi.
                </td></tr>
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td style={{ paddingLeft: 20, fontWeight: 600 }}>{log.donator_name}</td>
                  <td>
                    <span style={{ fontSize: 16 }}>{PLATFORM_ICONS[log.platform] || '💜'}</span>
                    {' '}{log.platform}
                  </td>
                  <td style={{ color: 'var(--green)', fontWeight: 700 }}>{formatRp(log.amount)}</td>
                  <td>
                    {log.effect_name
                      ? <span className="badge badge-purple">⚡ {log.effect_name}</span>
                      : <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td>{STATUS_BADGE[log.status] || log.status}</td>
                  <td style={{ color: 'var(--text-2)', maxWidth: 160 }}>
                    <span className="truncate" style={{ display: 'block' }}>
                      {log.message || <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDate(log.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ lineHeight: '28px', color: 'var(--text-2)', fontSize: 13 }}>
            {page + 1} / {totalPages}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
