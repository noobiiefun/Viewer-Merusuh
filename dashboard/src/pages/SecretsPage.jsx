// dashboard/src/pages/SecretsPage.jsx
import { useState, useEffect } from 'react'
import { api } from '../utils/api'

export default function SecretsPage({ toast }) {
  const [schema, setSchema]     = useState([])
  const [values, setValues]     = useState({})
  const [revealed, setRevealed] = useState({})   // { KEY: true } = tampilkan plain
  const [revealing, setRevealing] = useState({}) // { KEY: true } = sedang fetch nilai asli
  const [testResults, setTestResults] = useState({}) // { KEY: { format, lastReceived } }
  const [testing, setTesting]   = useState({})   // { KEY: true } = sedang test
  const [status, setStatus]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [needsRestart, setNeedsRestart] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [envRes, statusRes] = await Promise.all([
        api.getEnv(),
        api.getEnvStatus(),
      ])
      setSchema(envRes.schema || [])
      setValues(envRes.data   || {})
      setStatus(statusRes)
    } catch (e) {
      toast.error('Gagal load konfigurasi: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const r = await api.saveEnv(values)
      toast.success(r.message)
      setNeedsRestart(true)
      loadAll()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateSecret(key) {
    try {
      const r = await api.generateSecret()
      setValues(v => ({ ...v, [key]: r.secret }))
      setRevealed(rv => ({ ...rv, [key]: true }))
      toast.success('Secret baru digenerate — jangan lupa simpan!')
    } catch { toast.error('Gagal generate secret') }
  }

  // ── Reveal: ambil nilai ASLI dari server, bukan cuma toggle tampilan ──
  // Nilai yang datang dari GET /api/env selalu ter-mask (4 char + titik),
  // jadi toggle type='text' saja tidak cukup — perlu fetch ulang nilai
  // aslinya lewat endpoint khusus /api/env/reveal/:key.
  async function toggleReveal(key) {
    const alreadyRevealed = !!revealed[key]

    // Kalau mau sembunyikan lagi, cukup toggle — tidak perlu fetch ulang
    if (alreadyRevealed) {
      setRevealed(rv => ({ ...rv, [key]: false }))
      return
    }

    // Kalau value saat ini bukan hasil mask (misalnya baru diketik/generate
    // di sesi ini), tidak perlu fetch — langsung tampilkan apa adanya
    const currentVal = values[key] || ''
    if (!currentVal.includes('•')) {
      setRevealed(rv => ({ ...rv, [key]: true }))
      return
    }

    setRevealing(rv => ({ ...rv, [key]: true }))
    try {
      const r = await api.revealEnvSecret(key)
      setValues(v => ({ ...v, [key]: r.value }))
      setRevealed(rv => ({ ...rv, [key]: true }))
    } catch (e) {
      toast.error('Gagal mengambil nilai asli: ' + e.message)
    } finally {
      setRevealing(rv => ({ ...rv, [key]: false }))
    }
  }

  async function handleTest(key) {
    setTesting(t => ({ ...t, [key]: true }))
    try {
      const r = await api.testEnvField(key)
      setTestResults(tr => ({ ...tr, [key]: r }))
    } catch (e) {
      toast.error('Gagal test: ' + e.message)
    } finally {
      setTesting(t => ({ ...t, [key]: false }))
    }
  }

  function setValue(key, val) {
    setValues(v => ({ ...v, [key]: val }))
    // Value baru diketik manual — bukan lagi hasil mask, jadi hapus
    // hasil test lama supaya tidak menyesatkan
    if (testResults[key]) setTestResults(tr => { const n = { ...tr }; delete n[key]; return n })
  }

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--text-3)', textAlign: 'center' }}>
      Memuat konfigurasi...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>🔐 Secrets & Konfigurasi</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
            Kelola API keys, port, dan konfigurasi sensitif tanpa buka file .env manual
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Menyimpan...' : '💾 Simpan Semua'}
        </button>
      </div>

      {/* Status banner */}
      {status && (
        <StatusBanner status={status} needsRestart={needsRestart} />
      )}

      {/* Restart notice */}
      {needsRestart && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--amber)' }}>Perlu restart server</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              Perubahan .env baru aktif setelah server di-restart. Tekan Ctrl+C lalu <code>npm run dev</code> lagi.
            </div>
          </div>
        </div>
      )}

      {/* Kategori form */}
      {schema.map(cat => (
        <div key={cat.category} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Category header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            paddingBottom: 12, borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 20 }}>{cat.icon}</span>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{cat.category}</div>
          </div>

          {/* Fields */}
          {cat.fields.map(field => (
            <FieldRow
              key={field.key}
              field={field}
              value={values[field.key] || ''}
              revealed={!!revealed[field.key]}
              revealing={!!revealing[field.key]}
              onToggleReveal={() => toggleReveal(field.key)}
              onChange={val => setValue(field.key, val)}
              onGenerate={() => handleGenerateSecret(field.key)}
              onTest={() => handleTest(field.key)}
              testing={!!testing[field.key]}
              testResult={testResults[field.key]}
            />
          ))}
        </div>
      ))}

      {/* File info */}
      <div style={{
        padding: '12px 16px', borderRadius: 8,
        background: 'var(--surface2)', border: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-3)',
      }}>
        📁 File disimpan di: <code style={{ color: 'var(--text-2)' }}>.env</code> (root folder project) — 
        sudah ada di <code>.gitignore</code>, tidak akan ter-commit ke GitHub.
      </div>

      {/* Tombol simpan bawah */}
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}
        style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
        {saving ? '⏳ Menyimpan...' : '💾 Simpan Semua Perubahan'}
      </button>
    </div>
  )
}

// ── Komponen status banner ───────────────────────────────────────────
function StatusBanner({ status, needsRestart }) {
  const isReady = status.isReady && status.envExists

  return (
    <div style={{
      padding: '12px 16px', borderRadius: 8, display: 'flex', gap: 16,
      background: isReady ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${isReady ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
    }}>
      <div style={{ fontSize: 24 }}>{isReady ? '✅' : '⚠️'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: isReady ? 'var(--green)' : 'var(--red)' }}>
          {isReady
            ? 'Konfigurasi lengkap — server siap'
            : `${status.missing?.length || 0} field wajib belum diisi`}
        </div>
        {!status.envExists && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>
            File .env belum ada — akan dibuat saat kamu klik Simpan.
          </div>
        )}
        {status.missing?.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {status.missing.map(m => (
              <span key={m.key} className="badge badge-red">{m.label}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 6, display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)' }}>
          <span>Port: <strong style={{ color: 'var(--text)' }}>{status.port}</strong></span>
          <span>Mode: <strong style={{ color: 'var(--text)' }}>{status.nodeEnv}</strong></span>
        </div>
      </div>
    </div>
  )
}

// ── Komponen satu field ──────────────────────────────────────────────
function FieldRow({ field, value, revealed, revealing, onToggleReveal, onChange, onGenerate, onTest, testing, testResult }) {
  const isSecret   = field.type === 'secret'
  const isSelect   = field.type === 'select'
  const isNumber   = field.type === 'number'
  const isFilepath = field.type === 'filepath'
  const isMasked   = isSecret && value && value.includes('•') && !revealed

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <label style={{ margin: 0 }}>
          {field.label}
          {field.required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
        </label>
        {field.required && (
          <span className="badge badge-red" style={{ fontSize: 10 }}>Wajib</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {isSelect ? (
          <select className="select" value={value} onChange={e => onChange(e.target.value)}>
            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            className="input"
            type={isSecret && !revealed ? 'password' : isNumber ? 'number' : 'text'}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
            style={{
              fontFamily: (isFilepath || isSecret) ? 'monospace' : undefined,
              fontSize: isFilepath ? 12 : undefined,
              color: isMasked ? 'var(--text-3)' : undefined,
            }}
          />
        )}

        {/* Toggle show/hide untuk secret — sekarang fetch nilai asli ke server */}
        {isSecret && (
          <button className="btn btn-ghost" style={{ flexShrink: 0, padding: '0 10px' }}
            onClick={onToggleReveal} disabled={revealing}
            title={revealed ? 'Sembunyikan' : 'Tampilkan nilai asli'}>
            {revealing ? '⏳' : revealed ? '🙈' : '👁️'}
          </button>
        )}

        {/* Generate button untuk secret */}
        {isSecret && (
          <button className="btn btn-ghost" style={{ flexShrink: 0, padding: '0 10px' }}
            onClick={onGenerate} title="Generate random secret">
            🎲
          </button>
        )}

        {/* Test Koneksi — cuma untuk field yang testable (Saweria, Trakteer) */}
        {field.testable && (
          <button className="btn btn-ghost" style={{ flexShrink: 0, padding: '0 12px', whiteSpace: 'nowrap' }}
            onClick={onTest} disabled={testing}>
            {testing ? '⏳ Mengecek...' : '🔍 Test'}
          </button>
        )}
      </div>

      {field.hint && (
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
          {field.hint}
        </p>
      )}

      {isMasked && (
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
          🔒 Nilai disembunyikan. Klik 👁️ untuk lihat nilai asli yang tersimpan, atau ketik nilai baru untuk ganti.
        </p>
      )}

      {/* Hasil Test Koneksi */}
      {testResult && (
        <div style={{
          marginTop: 8, padding: '10px 12px', borderRadius: 8, fontSize: 12,
          background: testResult.format.valid ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${testResult.format.valid ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        }}>
          <div style={{ fontWeight: 600, color: testResult.format.valid ? 'var(--green)' : 'var(--red)' }}>
            {testResult.format.valid ? '✅' : '⚠️'} {testResult.format.message}
          </div>
          <div style={{ marginTop: 4, color: 'var(--text-2)' }}>
            {testResult.lastReceived
              ? `📩 Donasi asli terakhir diterima: ${testResult.lastReceived.created_at} dari ${testResult.lastReceived.donator_name} (Rp${testResult.lastReceived.amount})`
              : '📭 Belum pernah menerima donasi asli lewat webhook ini. Ini normal kalau belum ada yang donasi — cek lagi di sini setelah donasi pertama masuk.'}
          </div>
          <div style={{ marginTop: 4, color: 'var(--text-3)', fontStyle: 'italic' }}>
            Catatan: cek format saja tidak menjamin key benar 100% — Saweria/Trakteer tidak
            punya endpoint validasi langsung. Bukti paling akurat adalah baris "donasi asli terakhir" di atas.
          </div>
        </div>
      )}
    </div>
  )
}
