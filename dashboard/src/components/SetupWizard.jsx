// dashboard/src/components/SetupWizard.jsx
// Muncul otomatis saat pertama kali buka jika config belum lengkap
// Panduan step-by-step untuk non-developer

import { useState } from 'react'
import { api } from '../utils/api'

const STEPS = [
  { id: 'welcome',   icon: '🎮', title: 'Selamat Datang!' },
  { id: 'port',      icon: '🖥️', title: 'Port Server' },
  { id: 'platform',  icon: '💰', title: 'Platform Donasi' },
  { id: 'ahk',       icon: '⚡', title: 'AutoHotkey' },
  { id: 'obs',       icon: '📺', title: 'OBS Overlay' },
  { id: 'test',      icon: '🧪', title: 'Test Koneksi' },
  { id: 'done',      icon: '✅', title: 'Selesai!' },
]

export default function SetupWizard({ onComplete, currentPort = 3000 }) {
  const [step, setStep]         = useState(0)
  const [values, setValues]     = useState({ PORT: String(currentPort), NODE_ENV: 'development' })
  const [saving, setSaving]     = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting]   = useState(false)

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1
  const isFirst = step === 0

  function set(k, v) { setValues(prev => ({ ...prev, [k]: v })) }

  async function handleNext() {
    // Simpan perubahan setiap langkah
    if (step > 0 && step < STEPS.length - 1) {
      setSaving(true)
      try { await api.saveEnv(values) } catch {}
      setSaving(false)
    }
    if (isLast) { onComplete(); return }
    setStep(s => s + 1)
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const r = await api.testingDonate({
        platform: 'test', donatorName: 'Setup Wizard',
        amount: 10000, message: 'Test dari Setup Wizard!'
      })
      setTestResult({ ok: true, msg: r.message, effect: r.matchedEffect })
    } catch (e) {
      setTestResult({ ok: false, msg: e.message })
    }
    setTesting(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: '32px',
        width: '100%', maxWidth: 520,
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= step ? 'var(--primary)' : 'var(--surface2)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Step icon + title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>{current.icon}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{current.title}</h2>
          <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 4 }}>
            Langkah {step + 1} dari {STEPS.length}
          </div>
        </div>

        {/* Step content */}
        <div style={{ marginBottom: 28 }}>
          <StepContent
            stepId={current.id}
            values={values}
            set={set}
            currentPort={currentPort}
            testResult={testResult}
            testing={testing}
            onTest={handleTest}
          />
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isFirst && (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}
              style={{ width: 80 }}>
              ← Kembali
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={saving}
            style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
          >
            {saving ? '⏳ Menyimpan...'
              : isLast ? '🎉 Mulai Streaming!'
              : 'Lanjut →'}
          </button>
        </div>

        {/* Skip wizard */}
        {!isLast && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button onClick={onComplete} style={{
              background: 'none', border: 'none', color: 'var(--text-3)',
              cursor: 'pointer', fontSize: 12,
            }}>
              Lewati wizard — saya sudah tahu cara konfigurasi
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Konten tiap step ─────────────────────────────────────────────────
function StepContent({ stepId, values, set, currentPort, testResult, testing, onTest }) {
  switch (stepId) {

    case 'welcome':
      return (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 20 }}>
            Viewer Merusuh adalah platform interaktif yang menghubungkan donasi kamu
            dengan efek di dalam game. Viewer donate → game langsung bereaksi!
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {[
              { icon: '🧋', label: 'Saweria' },
              { icon: '☕', label: 'Trakteer' },
              { icon: '🖥️', label: 'AutoHotkey' },
              { icon: '🕹️', label: 'vJoy/ViGEm' },
              { icon: '🎮', label: 'GTA 5 & BeamNG' },
            ].map(item => (
              <div key={item.label} style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--surface2)', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 16 }}>
            Wizard ini akan memandu kamu menyiapkan semua konfigurasi dalam beberapa menit.
          </p>
        </div>
      )

    case 'port':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Server berjalan di port tertentu. Default: <strong>3000</strong>.
            Ganti jika port tersebut sudah dipakai aplikasi lain.
          </p>
          <div>
            <label>Port Server</label>
            <input className="input" type="number"
              value={values.PORT || '3000'}
              onChange={e => set('PORT', e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Setelah simpan, server perlu di-restart. Dashboard akan bisa diakses di{' '}
              <code>http://localhost:{values.PORT || 3000}/dashboard</code>
            </p>
          </div>
          <div>
            <label>Mode</label>
            <select className="select" value={values.NODE_ENV || 'development'}
              onChange={e => set('NODE_ENV', e.target.value)}>
              <option value="development">Development — Testing endpoint aktif, log verbose</option>
              <option value="production">Production — Lebih ketat, testing dinonaktifkan</option>
            </select>
          </div>
        </div>
      )

    case 'platform':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Isi API key platform donasi yang kamu gunakan. Bisa diisi sekarang atau nanti.
          </p>

          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '14px' }}>
            <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🧋</span> Saweria
            </div>
            <label>Stream Key</label>
            <input className="input" type="password"
              placeholder="Saweria Dashboard → Stream Key"
              value={values.SAWERIA_STREAM_KEY || ''}
              onChange={e => set('SAWERIA_STREAM_KEY', e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Ambil di: <strong>saweria.co/dashboard</strong> → Stream Key
            </p>
          </div>

          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '14px' }}>
            <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>☕</span> Trakteer
            </div>
            <label>API Key</label>
            <input className="input" type="password"
              placeholder="Trakteer → Manage → Integration"
              value={values.TRAKTEER_API_KEY || ''}
              onChange={e => set('TRAKTEER_API_KEY', e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Ambil di: <strong>trakteer.id/manage/integration</strong>
            </p>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
            💡 Biarkan kosong untuk skip — bisa diisi nanti di menu Secrets & Config
          </p>
        </div>
      )

    case 'ahk':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            AutoHotkey digunakan untuk inject input keyboard/mouse ke game.
            Wajib untuk efek Racing, Action, FPS, dan Survival.
          </p>
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8, padding: 14,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--amber)', marginBottom: 8 }}>
              Install AutoHotkey v2 jika belum:
            </div>
            <a href="https://www.autohotkey.com/download/" target="_blank" rel="noreferrer"
              style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>
              → Download AutoHotkey v2
            </a>
          </div>
          <div>
            <label>Path AutoHotkey.exe</label>
            <input className="input"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              value={values.AHK_EXE_PATH || 'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe'}
              onChange={e => set('AHK_EXE_PATH', e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Sesuaikan jika AutoHotkey diinstall di folder lain
            </p>
          </div>
        </div>
      )

    case 'obs':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Tambahkan overlay notifikasi ke OBS agar penonton bisa lihat efek yang aktif.
          </p>
          {[
            { n: '1', text: 'Di OBS, klik tombol + di panel Sources' },
            { n: '2', text: 'Pilih Browser Source' },
            { n: '3', text: <>Set URL: <code style={{ background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4 }}>http://localhost:{values.PORT || 3000}/overlay</code></> },
            { n: '4', text: 'Width: 400 — Height: 600' },
            { n: '5', text: '"Shutdown source when not visible" → OFF' },
            { n: '6', text: 'Klik OK dan posisikan di pojok layar' },
          ].map(item => (
            <div key={item.n} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>{item.n}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', paddingTop: 2 }}>{item.text}</div>
            </div>
          ))}
        </div>
      )

    case 'test':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Kirim simulasi donasi untuk memastikan semuanya berjalan dengan benar.
          </p>
          <button className="btn btn-primary" onClick={onTest} disabled={testing}
            style={{ justifyContent: 'center', padding: '14px', fontSize: 15 }}>
            {testing ? '⏳ Mengirim...' : '🚀 Kirim Test Donasi Rp 10.000'}
          </button>
          {testResult && (
            <div style={{
              padding: '14px 16px', borderRadius: 8, textAlign: 'left',
              background: testResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${testResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
              <div style={{ fontWeight: 700, color: testResult.ok ? 'var(--green)' : 'var(--red)', marginBottom: 6 }}>
                {testResult.ok ? '✅ Berhasil!' : '❌ Gagal'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{testResult.msg}</div>
              {testResult.effect && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amber)' }}>
                  ⚡ Efek: <strong>{testResult.effect.name}</strong> ({testResult.effect.adapter})
                </div>
              )}
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Cek OBS overlay — seharusnya muncul notifikasi donasi
          </p>
        </div>
      )

    case 'done':
      return (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 20 }}>
            Viewer Merusuh sudah siap! Mulai streaming dan biarkan viewer merusuh saat main game.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            {[
              { icon: '⚡', text: 'Kelola efek di menu Efek' },
              { icon: '🧪', text: 'Test donasi di menu Testing Area' },
              { icon: '🔐', text: 'Update API key di menu Secrets & Config' },
              { icon: '📋', text: 'Pantau log donasi di menu Log Donasi' },
            ].map(item => (
              <div key={item.text} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8,
              }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return null
  }
}
