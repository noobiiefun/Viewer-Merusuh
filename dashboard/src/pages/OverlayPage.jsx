// dashboard/src/pages/OverlayPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../utils/api'

const POSITIONS = [
  { value: 'top-left',     label: '↖ Kiri Atas' },
  { value: 'top-right',    label: '↗ Kanan Atas' },
  { value: 'bottom-left',  label: '↙ Kiri Bawah' },
  { value: 'bottom-right', label: '↘ Kanan Bawah' },
]

function Section({ title, children }) {
  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <h3 style={{ fontSize:14, fontWeight:700, paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Row({ label, hint, children }) {
  return (
    <div>
      <label style={{ marginBottom:4 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>{hint}</p>}
    </div>
  )
}

function ColorRow({ label, cfgKey, cfg, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <label style={{ flex:1, margin:0 }}>{label}</label>
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <input type="color" value={cfg[cfgKey] || '#000000'}
          onChange={e => onChange(cfgKey, e.target.value)}
          style={{ width:36, height:28, borderRadius:4, border:'1px solid var(--border)', cursor:'pointer', background:'none' }} />
        <input className="input" value={cfg[cfgKey] || ''}
          onChange={e => onChange(cfgKey, e.target.value)}
          style={{ width:90, fontFamily:'monospace', fontSize:12 }} />
      </div>
    </div>
  )
}

export default function OverlayPage({ toast }) {
  const [cfg, setCfg]         = useState({})
  const [effects, setEffects] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [tab, setTab]         = useState('notif')  // 'notif' | 'pricelist' | 'preview'
  const [testNotif, setTestNotif] = useState(false)
  const previewRef = useRef(null)

  const serverPort = window.location.port || '3000'
  const overlayURL = `http://localhost:${serverPort}/overlay`

  useEffect(() => {
    Promise.all([api.getConfig(), api.getEffects()])
      .then(([c, e]) => {
        setCfg(c.data || {})
        setEffects(e.data || [])
      })
      .catch(() => toast.error('Gagal load config'))
      .finally(() => setLoading(false))
  }, [])

  const set = useCallback((k, v) => setCfg(prev => ({ ...prev, [k]: v })), [])

  async function handleSave() {
    setSaving(true)
    try {
      await api.saveConfig(cfg)
      toast.success('Konfigurasi overlay disimpan!')
      // Reload preview
      if (previewRef.current) previewRef.current.src = overlayURL + '?t=' + Date.now()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function handleTestNotif() {
    setTestNotif(true)
    try {
      await api.testDonation({ amount: 10000, donatorName: 'Preview Viewer', message: 'Test overlay!', platform: 'test' })
      toast.info('Test notif dikirim — lihat preview')
    } catch (e) { toast.error(e.message) }
    setTimeout(() => setTestNotif(false), 2000)
  }

  function copyURL() {
    navigator.clipboard.writeText(overlayURL)
    toast.success('URL overlay disalin!')
  }

  // Hitung durasi tampil price list
  const pages   = Math.max(1, Math.ceil(effects.filter(e=>e.is_active).length / (parseInt(cfg.pricelist_items_per_page)||5)))
  const rotateSec = parseInt(cfg.pricelist_rotate_sec) || 10
  const showSec   = pages * rotateSec + 20
  const hideMin   = parseInt(cfg.pricelist_hide_after_min) || 5

  if (loading) return <div style={{ padding:40, color:'var(--text-3)', textAlign:'center' }}>Memuat...</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800 }}>📺 Overlay Editor</h1>
          <p style={{ color:'var(--text-2)', fontSize:13, marginTop:4 }}>
            Kustomisasi tampilan notifikasi dan price list di OBS
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={copyURL}>📋 Copy URL OBS</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Menyimpan...' : '💾 Simpan'}
          </button>
        </div>
      </div>

      {/* URL Box */}
      <div style={{ padding:'10px 14px', background:'var(--surface2)', borderRadius:8, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:12, color:'var(--text-3)' }}>URL OBS:</span>
        <code style={{ flex:1, fontSize:12, color:'var(--green)' }}>{overlayURL}</code>
        <button className="btn btn-ghost btn-sm" onClick={copyURL}>Copy</button>
        <a href={overlayURL} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Buka ↗</a>
      </div>

      {/* Tab */}
      <div style={{ display:'flex', gap:8, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[
          { id:'notif',     label:'🔔 Notifikasi' },
          { id:'pricelist', label:'📋 Price List' },
          { id:'preview',   label:'👁️ Preview OBS' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'8px 16px', background:'transparent', border:'none',
            borderBottom: tab===t.id ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab===t.id ? 'var(--text)' : 'var(--text-2)',
            fontWeight: tab===t.id ? 700 : 400,
            cursor:'pointer', fontSize:13, transition:'all .15s',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:20 }}>

        {/* ── Settings panel ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16 }}>

          {/* TAB: NOTIFIKASI */}
          {tab === 'notif' && <>
            <Section title="📍 Posisi Notifikasi">
              <Row label="Posisi di layar">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
                  {POSITIONS.map(p => (
                    <button key={p.value} onClick={() => set('notif_position', p.value)}
                      className="btn btn-ghost"
                      style={{
                        justifyContent:'center',
                        background: cfg.notif_position===p.value ? 'rgba(124,58,237,.2)' : undefined,
                        color:      cfg.notif_position===p.value ? 'var(--primary)' : undefined,
                        borderColor:cfg.notif_position===p.value ? 'var(--primary)' : undefined,
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </Row>
            </Section>

            <Section title="🎨 Warna Notifikasi">
              <ColorRow label="Warna background"    cfgKey="notif_bg"           cfg={cfg} onChange={set} />
              <Row label="Opacity background" hint="0.0 (transparan) — 1.0 (solid)">
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <input type="range" min="0" max="1" step="0.05"
                    value={parseFloat(cfg.notif_bg_opacity||'0.92')}
                    onChange={e => set('notif_bg_opacity', e.target.value)}
                    style={{ flex:1, accentColor:'var(--primary)' }} />
                  <span style={{ width:36, fontSize:12, color:'var(--primary)', fontWeight:700, textAlign:'center' }}>
                    {parseFloat(cfg.notif_bg_opacity||'0.92').toFixed(2)}
                  </span>
                </div>
              </Row>
              <ColorRow label="Warna garis kiri (aksen)" cfgKey="notif_border"       cfg={cfg} onChange={set} />
              <ColorRow label="Warna teks nama"           cfgKey="notif_text"         cfg={cfg} onChange={set} />
              <ColorRow label="Warna nominal donasi"      cfgKey="notif_amount_color" cfg={cfg} onChange={set} />
              <ColorRow label="Warna nama efek"           cfgKey="notif_effect_color" cfg={cfg} onChange={set} />
            </Section>

            <Section title="⏱️ Durasi Notifikasi">
              <Row label="Durasi tampil" hint={`Saat ini: ${((parseInt(cfg.notification_duration_ms)||5000)/1000).toFixed(1)} detik`}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <input type="range" min="1000" max="30000" step="500"
                    value={parseInt(cfg.notification_duration_ms)||5000}
                    onChange={e => set('notification_duration_ms', e.target.value)}
                    style={{ flex:1, accentColor:'var(--primary)' }} />
                  <span style={{ width:48, fontSize:13, color:'var(--primary)', fontWeight:700, textAlign:'center' }}>
                    {((parseInt(cfg.notification_duration_ms)||5000)/1000).toFixed(1)}s
                  </span>
                </div>
              </Row>
            </Section>

            <button className="btn btn-success" onClick={handleTestNotif} disabled={testNotif}
              style={{ alignSelf:'flex-start' }}>
              {testNotif ? '⏳ Mengirim...' : '🧪 Test Notifikasi'}
            </button>
          </>}

          {/* TAB: PRICE LIST */}
          {tab === 'pricelist' && <>
            <Section title="⚙️ Pengaturan Utama">
              <Row label="Tampilkan price list">
                <label className="toggle" style={{ marginTop:6 }}>
                  <input type="checkbox"
                    checked={cfg.pricelist_show==='true'||cfg.pricelist_show===true}
                    onChange={e => set('pricelist_show', e.target.checked ? 'true' : 'false')} />
                  <div className="toggle-track" /><div className="toggle-thumb" />
                </label>
              </Row>
              <Row label="Posisi di layar">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
                  {POSITIONS.map(p => (
                    <button key={p.value} onClick={() => set('pricelist_position', p.value)}
                      className="btn btn-ghost"
                      style={{
                        justifyContent:'center',
                        background: cfg.pricelist_position===p.value ? 'rgba(124,58,237,.2)' : undefined,
                        color:      cfg.pricelist_position===p.value ? 'var(--primary)' : undefined,
                        borderColor:cfg.pricelist_position===p.value ? 'var(--primary)' : undefined,
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Judul">
                <input className="input" value={cfg.pricelist_title||''}
                  onChange={e => set('pricelist_title', e.target.value)} />
              </Row>
              <Row label="Sub-judul">
                <input className="input" value={cfg.pricelist_subtitle||''}
                  onChange={e => set('pricelist_subtitle', e.target.value)} />
              </Row>
            </Section>

            <Section title="🎨 Warna Price List">
              <ColorRow label="Warna judul"         cfgKey="pricelist_title_color"  cfg={cfg} onChange={set} />
              <ColorRow label="Warna badge (harga)" cfgKey="pricelist_badge_bg"     cfg={cfg} onChange={set} />
              <ColorRow label="Teks badge"          cfgKey="pricelist_badge_text"   cfg={cfg} onChange={set} />
              <ColorRow label="Warna blok nama efek"cfgKey="pricelist_label_bg"     cfg={cfg} onChange={set} />
              <ColorRow label="Teks nama efek"      cfgKey="pricelist_label_text"   cfg={cfg} onChange={set} />
              <ColorRow label="Warna titik navigasi"cfgKey="pricelist_nav_color"    cfg={cfg} onChange={set} />
            </Section>

            <Section title="⏱️ Timing & Rotasi">
              <Row label="Item per halaman" hint="Berapa efek ditampilkan sekaligus">
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <input type="range" min="2" max="10" step="1"
                    value={parseInt(cfg.pricelist_items_per_page)||5}
                    onChange={e => set('pricelist_items_per_page', e.target.value)}
                    style={{ flex:1, accentColor:'var(--primary)' }} />
                  <span style={{ width:30, fontSize:13, color:'var(--primary)', fontWeight:700, textAlign:'center' }}>
                    {parseInt(cfg.pricelist_items_per_page)||5}
                  </span>
                </div>
              </Row>
              <Row label="Jeda rotasi (detik)" hint="Min 5 — Max 30 detik">
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <input type="range" min="5" max="30" step="1"
                    value={rotateSec}
                    onChange={e => set('pricelist_rotate_sec', e.target.value)}
                    style={{ flex:1, accentColor:'var(--primary)' }} />
                  <span style={{ width:36, fontSize:13, color:'var(--primary)', fontWeight:700, textAlign:'center' }}>
                    {rotateSec}s
                  </span>
                </div>
              </Row>
              <Row label="Sembunyikan setelah (menit)" hint="Min 1 — Max 15 menit">
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <input type="range" min="1" max="15" step="1"
                    value={hideMin}
                    onChange={e => set('pricelist_hide_after_min', e.target.value)}
                    style={{ flex:1, accentColor:'var(--primary)' }} />
                  <span style={{ width:36, fontSize:13, color:'var(--primary)', fontWeight:700, textAlign:'center' }}>
                    {hideMin}m
                  </span>
                </div>
              </Row>

              {/* Kalkulasi durasi tampil */}
              <div style={{ background:'var(--surface2)', borderRadius:8, padding:'12px 14px' }}>
                <div style={{ fontSize:12, color:'var(--text-2)', fontWeight:600, marginBottom:8 }}>
                  📊 Kalkulasi durasi tampil:
                </div>
                <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.8 }}>
                  Efek aktif: <strong style={{color:'var(--text)'}}>{effects.filter(e=>e.is_active).length}</strong> efek
                  → <strong style={{color:'var(--text)'}}>{pages}</strong> halaman<br/>
                  Durasi tampil: <strong style={{color:'var(--primary)'}}>{pages} × {rotateSec}s + 20s = {showSec}s ({(showSec/60).toFixed(1)} menit)</strong><br/>
                  Setelah tampil, sembunyi selama: <strong style={{color:'var(--amber)'}}>{hideMin} menit</strong><br/>
                  Lalu muncul lagi otomatis.
                </div>
              </div>
            </Section>
          </>}

          {/* TAB: PREVIEW */}
          {tab === 'preview' && (
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:12 }}>👁️ Preview Overlay (Live dari OBS)</div>
              <p style={{ fontSize:12, color:'var(--text-2)', marginBottom:14 }}>
                Ini adalah tampilan sebenarnya yang akan muncul di OBS.
                Simpan config dulu agar perubahan terlihat di preview.
              </p>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => previewRef.current && (previewRef.current.src = overlayURL+'?t='+Date.now())}>
                  🔄 Refresh Preview
                </button>
                <button className="btn btn-success btn-sm" onClick={handleTestNotif} disabled={testNotif}>
                  {testNotif ? '⏳...' : '🧪 Test Notif'}
                </button>
              </div>
              <div style={{ position:'relative', width:'100%', paddingBottom:'56.25%', background:'#1a1a2e', borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
                <iframe
                  ref={previewRef}
                  src={overlayURL}
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none', background:'transparent' }}
                  title="Overlay Preview"
                />
                {/* Grid pattern untuk liat transparansi */}
                <div style={{
                  position:'absolute', inset:0, zIndex:-1, pointerEvents:'none',
                  backgroundImage:'linear-gradient(45deg,#2a2a3a 25%,transparent 25%,transparent 75%,#2a2a3a 75%),linear-gradient(45deg,#2a2a3a 25%,#1a1a2e 25%,#1a1a2e 75%,#2a2a3a 75%)',
                  backgroundSize:'20px 20px',
                  backgroundPosition:'0 0,10px 10px',
                }} />
              </div>
              <p style={{ fontSize:11, color:'var(--text-3)', marginTop:10 }}>
                💡 Background kotak-kotak = transparan (akan hilang di OBS). Untuk OBS: tambahkan sebagai Browser Source, URL: <code>{overlayURL}</code>
              </p>
            </div>
          )}
        </div>

        {/* ── Mini preview (notif + pricelist) — selalu tampil di kanan ── */}
        {tab !== 'preview' && (
          <div style={{ width:280, flexShrink:0 }}>
            <div className="card" style={{ position:'sticky', top:20 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Live Preview</div>
              <MiniPreview cfg={cfg} effects={effects} />
              <p style={{ fontSize:11, color:'var(--text-3)', marginTop:10, textAlign:'center' }}>
                Preview approx — tidak 100% akurat
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mini preview komponen ──────────────────────────────────────────
function MiniPreview({ cfg, effects }) {
  const activeEffects = effects.filter(e => e.is_active).sort((a,b) => a.min_amount-b.min_amount)
  const perPage = parseInt(cfg.pricelist_items_per_page)||5
  const slice   = activeEffects.slice(0, perPage)

  function hex2rgba(hex, op) {
    try {
      const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16)
      return `rgba(${r},${g},${b},${op})`
    } catch { return hex }
  }

  function formatRp(n) { return 'Rp '+Number(n||0).toLocaleString('id-ID') }

  const notifBg = hex2rgba(cfg.notif_bg||'#0d0f14', cfg.notif_bg_opacity||'0.92')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Notif preview */}
      <div>
        <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6 }}>Notifikasi:</div>
        <div style={{
          display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
          background: notifBg,
          borderRadius:8, borderLeft:`3px solid ${cfg.notif_border||'#7c3aed'}`,
          border:`1px solid rgba(255,255,255,0.08)`,
        }}>
          <span style={{ fontSize:18 }}>🧋</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:9, color:cfg.notif_border||'#7c3aed', fontWeight:700, textTransform:'uppercase' }}>SAWERIA</div>
            <div style={{ fontSize:12, fontWeight:700, color:cfg.notif_text||'#fff' }}>Nama Viewer</div>
            <div style={{ fontSize:11, color:cfg.notif_amount_color||'#86efac', fontWeight:600 }}>Rp 10.000</div>
            <div style={{ fontSize:10, color:cfg.notif_effect_color||'#fbbf24' }}>⚡ Rem Mendadak</div>
          </div>
        </div>
      </div>

      {/* Price list preview */}
      {cfg.pricelist_show !== 'false' && (
        <div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6 }}>Price List:</div>
          <div style={{ fontSize:13, fontWeight:800, color:cfg.pricelist_title_color||'#fff', textAlign:'center', marginBottom:2 }}>
            {cfg.pricelist_title||'Viewer Merusuh'}
          </div>
          <div style={{ fontSize:10, color:cfg.pricelist_title_color||'#fff', opacity:.7, textAlign:'center', marginBottom:8 }}>
            {cfg.pricelist_subtitle||'List Harga Merusuh'}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {slice.length === 0 ? (
              <div style={{ fontSize:11, color:'var(--text-3)', textAlign:'center' }}>Belum ada efek aktif</div>
            ) : slice.map(item => (
              <div key={item.id} style={{ display:'flex', borderRadius:99 }}>
                <div style={{
                  fontSize:10, fontWeight:700, padding:'4px 10px',
                  background:cfg.pricelist_badge_bg||'#000',
                  color:cfg.pricelist_badge_text||'#fff',
                  borderRadius:'99px 0 0 99px', minWidth:72, textAlign:'center',
                }}>
                  {formatRp(item.min_amount)}
                </div>
                <div style={{
                  fontSize:11, fontWeight:600, padding:'4px 12px',
                  background:cfg.pricelist_label_bg||'#1e2330',
                  color:cfg.pricelist_label_text||'#fff',
                  borderRadius:'0 99px 99px 0', flex:1,
                }}>
                  {item.name}
                </div>
              </div>
            ))}
            {activeEffects.length > perPage && (
              <div style={{ fontSize:10, color:'var(--text-3)', textAlign:'center', marginTop:4 }}>
                +{activeEffects.length - perPage} efek lagi (rotasi otomatis)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
