// dashboard/src/pages/VjoyPage.jsx
// Halaman status & testing vJoy/ViGEm virtual gamepad adapter

import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const ACTIONS = [
  { key: 'vjoy_brake',        icon: '🛑', label: 'Rem Penuh',         desc: 'Tahan trigger kiri (rem) penuh',           duration: 2000 },
  { key: 'vjoy_throttle',     icon: '🚀', label: 'Gas Penuh',          desc: 'Tahan trigger kanan (gas) penuh',          duration: 2000 },
  { key: 'vjoy_steer_left',   icon: '↩️', label: 'Steer Kiri',        desc: 'Paksa steer kiri penuh',                   duration: 2000 },
  { key: 'vjoy_steer_right',  icon: '↪️', label: 'Steer Kanan',       desc: 'Paksa steer kanan penuh',                  duration: 2000 },
  { key: 'vjoy_random_steer', icon: '🌀', label: 'Steer Acak',        desc: 'Steer kiri-kanan random chaos',            duration: 4000 },
  { key: 'vjoy_handbrake',    icon: '🅿️', label: 'Handbrake',         desc: 'Tekan tombol X (handbrake)',               duration: 2000 },
  { key: 'vjoy_drift_chaos',  icon: '💨', label: 'Drift Chaos',       desc: 'Gas penuh + steer acak bersamaan',         duration: 5000 },
  { key: 'vjoy_reverse',      icon: '🔄', label: 'Mundur Paksa',      desc: 'Trigger rem + stick bawah',                duration: 2000 },
  { key: 'vjoy_rumble',       icon: '📳', label: 'Rumble',            desc: 'Getarkan controller',                      duration: 2000 },
  { key: 'vjoy_disconnect',   icon: '🔌', label: 'Disconnect',        desc: 'Cabut-colok controller sesaat',            duration: 1500 },
]

function StatusBadge({ ok, label }) {
  return (
    <span className={`badge ${ok ? 'badge-green' : 'badge-red'}`}>
      {ok ? '✅' : '❌'} {label}
    </span>
  )
}

export default function VjoyPage({ toast }) {
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(null)  // action_key yang sedang di-test

  useEffect(() => {
    api.getStatus().then(r => { setStatus(r); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function testAction(action) {
    if (testing) return
    setTesting(action.key)
    try {
      await api.testDonation({
        amount:      50000,  // nominal tinggi agar pasti ada efek
        donatorName: 'vJoy Tester',
        message:     `Test: ${action.label}`,
        platform:    'test',
      })
      toast.info(`Test "${action.label}" dikirim — lihat console server`)
    } catch (e) {
      toast.error(`Gagal: ${e.message}`)
    }
    // Tunggu durasi aksi + buffer
    await new Promise(r => setTimeout(r, action.duration + 500))
    setTesting(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>🕹️ vJoy / ViGEm Controller</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
          Virtual gamepad adapter untuk racing game dengan controller
        </p>
      </div>

      {/* Status Card */}
      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Status Driver</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>ViGEmBus Driver</div>
              <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 2 }}>
                Driver kernel Windows untuk virtual controller
              </div>
            </div>
            <StatusBadge ok={true} label="Perlu cek manual" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>vigemclient (npm)</div>
              <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 2 }}>
                Node.js binding ke ViGEmBus
              </div>
            </div>
            <StatusBadge ok={!loading} label={loading ? 'Loading...' : 'Terinstall'} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Virtual Xbox 360 Controller</div>
              <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 2 }}>
                Controller virtual yang terdeteksi oleh game
              </div>
            </div>
            <StatusBadge ok={!loading} label={loading ? 'Loading...' : 'Lihat log server'} />
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="card" style={{ borderLeft: '3px solid var(--amber)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--amber)' }}>
          ⚠️ Setup Wajib (Windows)
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              step: '1',
              title: 'Install ViGEmBus Driver',
              desc: 'Download dan install driver kernel dari GitHub Releases.',
              link: 'https://github.com/nefarius/ViGEmBus/releases',
              linkText: 'Download ViGEmBus →',
            },
            {
              step: '2',
              title: 'Restart PC (wajib)',
              desc: 'Setelah install driver, PC harus direstart agar driver aktif.',
            },
            {
              step: '3',
              title: 'Install npm dependency',
              desc: 'Jalankan di folder viewer-merusuh:',
              code: 'npm install',
            },
            {
              step: '4',
              title: 'Restart server',
              desc: 'Jalankan ulang server — jika berhasil, log akan menampilkan:',
              code: '🎮 [vJoy] ViGEmBus terhubung — virtual Xbox 360 controller aktif',
            },
            {
              step: '5',
              title: 'Setting di game',
              desc: 'Buka setting controller di game (BeamNG, Forza, dll) → controller baru "Xbox 360 Controller" akan terdeteksi → assign axis dan tombol sesuai kebutuhan.',
            },
          ].map(item => (
            <div key={item.step} style={{
              display: 'flex', gap: 12,
              padding: '10px 12px',
              background: 'var(--surface2)', borderRadius: 8,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1,
              }}>{item.step}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 3 }}>{item.desc}</div>
                {item.code && (
                  <code style={{
                    display: 'block', marginTop: 6,
                    background: 'var(--bg)', padding: '6px 10px', borderRadius: 6,
                    fontSize: 12, color: 'var(--green)',
                    border: '1px solid var(--border)',
                  }}>{item.code}</code>
                )}
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer" style={{
                    display: 'inline-block', marginTop: 6,
                    color: 'var(--primary)', fontSize: 12, fontWeight: 600,
                    textDecoration: 'none',
                  }}>{item.linkText}</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Test Panel */}
      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🧪 Test Actions</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 16 }}>
          Klik tombol untuk simulasi aksi via test donasi. Pastikan game sudah berjalan dan
          virtual controller terhubung. Lihat log di console server untuk konfirmasi.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {ACTIONS.map(action => (
            <div key={action.key} style={{
              background: 'var(--surface2)', borderRadius: 8,
              padding: '12px 14px',
              border: testing === action.key ? '1px solid var(--primary)' : '1px solid var(--border)',
              transition: 'border-color 0.2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{action.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{action.label}</div>
                  <div style={{ color: 'var(--text-2)', fontSize: 11, marginTop: 2 }}>{action.desc}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
                    ⏱ {action.duration / 1000}s
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center',
                  background: testing === action.key ? 'rgba(124,58,237,0.15)' : undefined,
                  color: testing === action.key ? 'var(--primary)' : undefined,
                }}
                disabled={!!testing}
                onClick={() => testAction(action)}
              >
                {testing === action.key ? '⏳ Testing...' : '▶ Test'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mapping Guide */}
      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
          🗺️ Mapping Controller per Game
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 14 }}>
          Virtual controller muncul sebagai Xbox 360 Controller. Berikut mapping default di game populer:
        </p>
        <table className="table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 16 }}>Action Key</th>
              <th>Input Controller</th>
              <th>BeamNG.drive</th>
              <th>Forza Horizon</th>
              <th>NFS</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['vjoy_brake',        'Left Trigger',  'Rem',       'Rem',       'Rem'],
              ['vjoy_throttle',     'Right Trigger', 'Gas',       'Gas',       'Gas'],
              ['vjoy_steer_left',   'Left Stick ←',  'Steer kiri','Steer kiri','Steer kiri'],
              ['vjoy_steer_right',  'Left Stick →',  'Steer kanan','Steer kanan','Steer kanan'],
              ['vjoy_handbrake',    'Button X',      'Handbrake', 'Handbrake', 'Handbrake'],
              ['vjoy_disconnect',   'Disconnect',    'Input lost','Input lost', 'Input lost'],
            ].map(([key, input, beamng, forza, nfs]) => (
              <tr key={key}>
                <td style={{ paddingLeft: 16 }}>
                  <code style={{ fontSize: 11, background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>
                    {key}
                  </code>
                </td>
                <td style={{ color: 'var(--amber)', fontSize: 12, fontWeight: 600 }}>{input}</td>
                <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{beamng}</td>
                <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{forza}</td>
                <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{nfs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
