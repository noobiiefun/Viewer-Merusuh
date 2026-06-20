// dashboard/src/pages/AhkPage.jsx
import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const KEY_PRESETS = {
  'Umum': ['e','f','g','q','r','v','z','x','c','m','t','b','h','j','k','l','n','o','p','u','i','y','w','a','s','d'],
  'Fungsi': ['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'],
  'Spesial': ['Space','Enter','Tab','Escape','BackSpace','Delete','Insert'],
  'Panah': ['Up','Down','Left','Right'],
  'Angka': ['1','2','3','4','5','6','7','8','9','0'],
  'Modifier': ['LCtrl','LShift','LAlt','RCtrl','RShift','RAlt'],
}

const MODIFIERS = [
  { value:'',       label:'— Tanpa Modifier' },
  { value:'LCtrl',  label:'Ctrl' },
  { value:'LShift', label:'Shift' },
  { value:'LAlt',   label:'Alt' },
]

const GAME_ICONS = ['🎮','🔫','🏎️','💥','⛏️','🌲','🎯','⚔️','🏹','🚗','✈️','🚀','🧟','🐉','🃏']
const EMPTY_KEY = { name:'', description:'', key:'', modifier:'', mode:'tap', repeat:1, interval_ms:200, hold_ms:0, category:'fps' }
const EMPTY_GROUP = { name:'FPS', game_name:'', icon:'🎮' }
const EMPTY_PRESET = { name:'', group_id:'', description:'' }

export default function AhkPage({ toast }) {
  const [tab, setTab]         = useState('presets')  // presets | keys | groups
  const [groups, setGroups]   = useState([])
  const [presets, setPresets] = useState([])
  const [keys, setKeys]       = useState([])
  const [loading, setLoading] = useState(true)

  // modals
  const [keyModal,    setKeyModal]    = useState(null)
  const [groupModal,  setGroupModal]  = useState(null)
  const [presetModal, setPresetModal] = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(null)

  const [keyForm,    setKeyForm]    = useState(EMPTY_KEY)
  const [groupForm,  setGroupForm]  = useState(EMPTY_GROUP)
  const [presetForm, setPresetForm] = useState(EMPTY_PRESET)
  const [saving, setSaving]         = useState(false)
  const [testing, setTesting]       = useState(null)
  const [keyPickerOpen, setKeyPickerOpen] = useState(false)
  const [filterGroup, setFilterGroup] = useState('all')

  async function loadAll() {
    setLoading(true)
    try {
      const [g, p, k] = await Promise.all([api.getGroups(), api.getPresets(), api.getCustomKeys()])
      setGroups(g.data); setPresets(p.data); setKeys(k.data)
    } catch { toast.error('Gagal load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  // ── Keys CRUD ──
  async function saveKey() {
    if (!keyForm.name || !keyForm.key) { toast.error('Nama dan tombol wajib'); return }
    setSaving(true)
    try {
      if (keyModal==='create') await api.createCustomKey(keyForm)
      else await api.updateCustomKey(keyForm.id, keyForm)
      toast.success('Tersimpan!'); setKeyModal(null); loadAll()
    } catch(e) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function handleTestKey(k) {
    setTesting(k.id)
    try { const r = await api.testKey(k); toast.success(r.message) }
    catch(e) { toast.error(e.message) }
    setTimeout(() => setTesting(null), 1500)
  }

  // ── Groups CRUD ──
  async function saveGroup() {
    if (!groupForm.game_name) { toast.error('Nama game wajib'); return }
    setSaving(true)
    try {
      if (groupModal==='create') await api.createGroup(groupForm)
      else await api.updateGroup(groupForm.id, groupForm)
      toast.success('Game group tersimpan!'); setGroupModal(null); loadAll()
    } catch(e) { toast.error(e.message) } finally { setSaving(false) }
  }

  // ── Presets CRUD ──
  async function savePreset() {
    if (!presetForm.name) { toast.error('Nama preset wajib'); return }
    setSaving(true)
    try {
      if (presetModal==='create') await api.createPreset(presetForm)
      else await api.updatePreset(presetForm.id, presetForm)
      toast.success('Preset tersimpan!'); setPresetModal(null); loadAll()
    } catch(e) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function activatePreset(id) {
    try { await api.activatePreset(id); toast.success('Preset diaktifkan!'); loadAll() }
    catch(e) { toast.error(e.message) }
  }

  async function handleDelete() {
    if (!confirmDel) return
    try {
      if (confirmDel.type==='key')    await api.deleteCustomKey(confirmDel.item.id)
      if (confirmDel.type==='group')  await api.deleteGroup(confirmDel.item.id)
      if (confirmDel.type==='preset') await api.deletePreset(confirmDel.item.id)
      toast.success('Dihapus'); setConfirmDel(null); loadAll()
    } catch { toast.error('Gagal hapus') }
  }

  const setK = (k,v) => setKeyForm(f=>({...f,[k]:v}))
  const setG = (k,v) => setGroupForm(f=>({...f,[k]:v}))
  const setP = (k,v) => setPresetForm(f=>({...f,[k]:v}))

  const activePreset  = presets.find(p=>p.is_active)
  const filteredKeys  = filterGroup==='all' ? keys : keys.filter(k=>k.category===filterGroup)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800}}>🖥️ AHK Controller</h1>
          <p style={{color:'var(--text-2)',fontSize:13,marginTop:4}}>
            Kelola game group, preset setting, dan tombol keyboard custom
          </p>
        </div>
        {/* Preset aktif badge */}
        {activePreset && (
          <div style={{padding:'8px 14px',background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.25)',borderRadius:8,fontSize:13}}>
            <span style={{color:'var(--green)',fontWeight:700}}>🟢 Preset Aktif: </span>
            <span style={{color:'var(--text)'}}>{activePreset.name}</span>
            {activePreset.game_name && <span style={{color:'var(--text-3)',marginLeft:6}}>({activePreset.icon} {activePreset.game_name})</span>}
          </div>
        )}
      </div>

      {/* Tab */}
      <div style={{display:'flex',gap:0,background:'var(--surface2)',borderRadius:8,padding:4,width:'fit-content'}}>
        {[
          {id:'presets', label:'🎯 Preset Setting'},
          {id:'keys',    label:'⌨️ Tombol Custom'},
          {id:'groups',  label:'🎮 Game Group'},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:'7px 16px', borderRadius:6, border:'none', cursor:'pointer',
            background: tab===t.id ? 'var(--primary)' : 'transparent',
            color:      tab===t.id ? '#fff' : 'var(--text-2)',
            fontWeight: tab===t.id ? 700 : 400, fontSize:13, transition:'all .15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ TAB: PRESETS ══════════════════════════════════════════════ */}
      {tab==='presets' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p style={{color:'var(--text-2)',fontSize:13}}>
              Preset adalah kumpulan setting bernama. Aktifkan preset sesuai game yang sedang dimainkan.
            </p>
            <button className="btn btn-primary" onClick={()=>{setPresetForm(EMPTY_PRESET);setPresetModal('create')}}>
              + Buat Preset
            </button>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
            {presets.map(p=>(
              <div key={p.id} style={{
                padding:'16px', borderRadius:10,
                background: p.is_active ? 'rgba(34,197,94,.08)' : 'var(--surface)',
                border: `1px solid ${p.is_active ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
                transition:'all .2s',
              }}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:8}}>
                      {p.is_active && <span style={{color:'var(--green)'}}>🟢</span>}
                      {p.name}
                    </div>
                    {p.game_name && (
                      <div style={{fontSize:12,color:'var(--text-2)',marginTop:3}}>
                        {p.icon} {p.group_name} — {p.game_name}
                      </div>
                    )}
                    {p.description && <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>{p.description}</div>}
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {!p.is_active && (
                    <button className="btn btn-success btn-sm" onClick={()=>activatePreset(p.id)} style={{flex:1,justifyContent:'center'}}>
                      ▶ Aktifkan
                    </button>
                  )}
                  {p.is_active && (
                    <div style={{flex:1,fontSize:12,color:'var(--green)',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                      ✅ Sedang Aktif
                    </div>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setPresetForm({...p,group_id:p.group_id||''});setPresetModal('edit')}}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>setConfirmDel({type:'preset',item:p})}>🗑️</button>
                </div>
              </div>
            ))}
            {presets.length===0 && !loading && (
              <div style={{padding:40,textAlign:'center',color:'var(--text-3)',gridColumn:'1/-1'}}>
                Belum ada preset. Buat preset untuk menyimpan setting per game.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: KEYS ══════════════════════════════════════════════ */}
      {tab==='keys' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['all','fps','racing','action','survival','mmo','custom'].map(c=>(
                <button key={c} onClick={()=>setFilterGroup(c)}
                  className="btn btn-ghost btn-sm"
                  style={{
                    background:  filterGroup===c?'rgba(124,58,237,.2)':undefined,
                    color:       filterGroup===c?'var(--primary)':undefined,
                    borderColor: filterGroup===c?'var(--primary)':undefined,
                  }}>
                  {c==='all'?'🎮 Semua':c}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={()=>{setKeyForm(EMPTY_KEY);setKeyModal('create')}}>
              + Tambah Tombol
            </button>
          </div>

          <div style={{background:'rgba(124,58,237,.08)',border:'1px solid rgba(124,58,237,.2)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'var(--text-2)'}}>
            💡 Setelah buat tombol di sini, buka <strong>⚡ Efek</strong> → Tambah Efek → Adapter <strong>AutoHotkey</strong> → pilih tombol ini di dropdown Action Key.
          </div>

          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {loading ? <div style={{padding:40,textAlign:'center',color:'var(--text-3)'}}>Memuat...</div> : (
              <table className="table">
                <thead>
                  <tr>
                    <th style={{paddingLeft:20}}>Nama</th>
                    <th>Tombol</th>
                    <th>Mode</th>
                    <th>Action Key</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeys.length===0 ? (
                    <tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'var(--text-3)'}}>
                      Belum ada tombol custom.
                    </td></tr>
                  ) : filteredKeys.map(k=>(
                    <tr key={k.id}>
                      <td style={{paddingLeft:20}}>
                        <div style={{fontWeight:600}}>{k.name}</div>
                        {k.description && <div style={{fontSize:11,color:'var(--text-3)'}}>{k.description}</div>}
                        <span className="badge badge-gray" style={{fontSize:10,marginTop:3}}>{k.category}</span>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          {k.modifier && <>
                            <span style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:4,padding:'2px 7px',fontSize:11,fontFamily:'monospace'}}>{k.modifier}</span>
                            <span style={{color:'var(--text-3)',fontSize:12}}>+</span>
                          </>}
                          <span style={{background:'var(--primary)',color:'#fff',borderRadius:4,padding:'3px 10px',fontSize:13,fontFamily:'monospace',fontWeight:700}}>{k.key}</span>
                        </div>
                      </td>
                      <td style={{fontSize:12,color:'var(--text-2)'}}>
                        {k.mode==='hold' && `⏱ Hold ${k.hold_ms}ms`}
                        {k.mode==='tap'  && `🔘 ×${k.repeat} (${k.interval_ms}ms)`}
                        {k.mode==='combo'&& `🔗 ×${k.repeat}`}
                      </td>
                      <td>
                        <code style={{fontSize:11,background:'var(--surface2)',padding:'2px 8px',borderRadius:4,color:'var(--green)'}}>
                          custom_key_{k.id}
                        </code>
                      </td>
                      <td>
                        <label className="toggle">
                          <input type="checkbox" checked={!!k.is_active}
                            onChange={async()=>{await api.updateCustomKey(k.id,{is_active:k.is_active?0:1});loadAll()}} />
                          <div className="toggle-track"/><div className="toggle-thumb"/>
                        </label>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn btn-success btn-sm" disabled={testing===k.id} onClick={()=>handleTestKey(k)}>
                            {testing===k.id?'⏳':'▶ Test'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={()=>{setKeyForm({...k});setKeyModal('edit')}}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>setConfirmDel({type:'key',item:k})}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: GROUPS ══════════════════════════════════════════════ */}
      {tab==='groups' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p style={{color:'var(--text-2)',fontSize:13}}>Daftar game yang kamu mainkan. Digunakan untuk mengorganisasi preset dan tombol.</p>
            <button className="btn btn-primary" onClick={()=>{setGroupForm(EMPTY_GROUP);setGroupModal('create')}}>
              + Tambah Game
            </button>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
            {groups.map(g=>(
              <div key={g.id} style={{padding:'14px',borderRadius:10,background:'var(--surface)',border:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:28}}>{g.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14}}>{g.game_name}</div>
                  <div style={{fontSize:11,color:'var(--text-2)',marginTop:2}}>
                    <span className="badge badge-purple" style={{fontSize:10}}>{g.name}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setGroupForm({...g});setGroupModal('edit')}}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>setConfirmDel({type:'group',item:g})}>🗑️</button>
                </div>
              </div>
            ))}
            {groups.length===0&&!loading&&(
              <div style={{padding:40,textAlign:'center',color:'var(--text-3)',gridColumn:'1/-1'}}>Belum ada game group.</div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL: KEY ══════════════════════════════════════════════ */}
      {keyModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setKeyModal(null)}>
          <div className="modal" style={{maxWidth:500}}>
            <div className="modal-title">{keyModal==='create'?'+ Tambah Tombol':'✏️ Edit Tombol'}</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><label>Nama *</label><input className="input" placeholder="Buang Senjata (G)" value={keyForm.name} onChange={e=>setK('name',e.target.value)}/></div>
              <div><label>Deskripsi</label><input className="input" placeholder="Deskripsi singkat" value={keyForm.description} onChange={e=>setK('description',e.target.value)}/></div>
              <div style={{display:'flex',gap:10}}>
                <div style={{flex:1}}>
                  <label>Kategori</label>
                  <select className="select" value={keyForm.category} onChange={e=>setK('category',e.target.value)}>
                    {['fps','racing','action','survival','mmo','custom'].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label>Modifier</label>
                  <select className="select" value={keyForm.modifier} onChange={e=>setK('modifier',e.target.value)}>
                    {MODIFIERS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label>Tombol * <span style={{color:'var(--text-3)',fontWeight:400}}>(ketik atau pilih)</span></label>
                <input className="input" placeholder="g, Space, F1, LCtrl..." value={keyForm.key} onChange={e=>setK('key',e.target.value)}/>
                <button type="button" className="btn btn-ghost btn-sm" style={{marginTop:6}} onClick={()=>setKeyPickerOpen(!keyPickerOpen)}>
                  {keyPickerOpen?'▲ Tutup':'🎯 Pilih Tombol'}
                </button>
                {keyPickerOpen&&(
                  <div style={{marginTop:8,background:'var(--surface2)',borderRadius:8,padding:10,maxHeight:180,overflowY:'auto'}}>
                    {Object.entries(KEY_PRESETS).map(([grp,ks])=>(
                      <div key={grp} style={{marginBottom:8}}>
                        <div style={{fontSize:10,color:'var(--text-3)',fontWeight:700,marginBottom:5,textTransform:'uppercase'}}>{grp}</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                          {ks.map(k=>(
                            <button key={k} type="button" onClick={()=>{setK('key',k);setKeyPickerOpen(false)}}
                              className="btn btn-ghost btn-sm"
                              style={{fontFamily:'monospace',fontSize:12,
                                background:keyForm.key===k?'rgba(124,58,237,.25)':undefined,
                                borderColor:keyForm.key===k?'var(--primary)':undefined}}>
                              {k}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Mode */}
              <div>
                <label>Mode</label>
                <div style={{display:'flex',gap:8,marginTop:6}}>
                  {[{v:'tap',l:'🔘 Tap'},{v:'hold',l:'⏱ Hold'},{v:'combo',l:'🔗 Combo'}].map(m=>(
                    <button key={m.v} type="button" onClick={()=>setK('mode',m.v)}
                      className="btn btn-ghost" style={{flex:1,justifyContent:'center',
                        background:keyForm.mode===m.v?'rgba(124,58,237,.2)':undefined,
                        color:keyForm.mode===m.v?'var(--primary)':undefined,
                        borderColor:keyForm.mode===m.v?'var(--primary)':undefined}}>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
              {keyForm.mode==='hold'&&(
                <div><label>Durasi Hold (ms) — 0 = pakai dari setting efek</label>
                  <input className="input" type="number" value={keyForm.hold_ms} onChange={e=>setK('hold_ms',parseInt(e.target.value)||0)}/></div>
              )}
              {(keyForm.mode==='tap'||keyForm.mode==='combo')&&(
                <div style={{display:'flex',gap:10}}>
                  <div style={{flex:1}}><label>Jumlah Tekan</label><input className="input" type="number" min="1" value={keyForm.repeat} onChange={e=>setK('repeat',parseInt(e.target.value)||1)}/></div>
                  <div style={{flex:1}}><label>Jeda (ms)</label><input className="input" type="number" min="50" value={keyForm.interval_ms} onChange={e=>setK('interval_ms',parseInt(e.target.value)||200)}/></div>
                </div>
              )}
              {/* Preview */}
              <div style={{background:'var(--surface2)',borderRadius:8,padding:'8px 12px',fontSize:13}}>
                <span style={{color:'var(--text-3)'}}>Preview: </span>
                <strong style={{color:'var(--primary)'}}>{keyForm.modifier?`${keyForm.modifier}+`:''}{keyForm.key||'?'}</strong>
                <span style={{color:'var(--text-2)',marginLeft:8}}>
                  {keyForm.mode==='hold'&&`tahan ${keyForm.hold_ms||'N'}ms`}
                  {keyForm.mode==='tap'&&`×${keyForm.repeat} jeda ${keyForm.interval_ms}ms`}
                  {keyForm.mode==='combo'&&`combo ×${keyForm.repeat}`}
                </span>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary" onClick={saveKey} disabled={saving} style={{flex:1}}>
                  {saving?'⏳...':'💾 Simpan'}
                </button>
                <button className="btn btn-ghost" onClick={()=>setKeyModal(null)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: GROUP ══════════════════════════════════════════════ */}
      {groupModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setGroupModal(null)}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-title">{groupModal==='create'?'+ Tambah Game':'✏️ Edit Game'}</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><label>Nama Game *</label><input className="input" placeholder="Valorant, BeamNG.drive..." value={groupForm.game_name} onChange={e=>setG('game_name',e.target.value)}/></div>
              <div>
                <label>Kategori</label>
                <select className="select" value={groupForm.name} onChange={e=>setG('name',e.target.value)}>
                  {['FPS','Racing','Action','Survival','MMO','Strategy','Sports','Custom'].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label>Icon</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:6}}>
                  {GAME_ICONS.map(ic=>(
                    <button key={ic} type="button" onClick={()=>setG('icon',ic)} style={{
                      width:36,height:36,fontSize:20,borderRadius:6,cursor:'pointer',border:'none',
                      background:groupForm.icon===ic?'rgba(124,58,237,.25)':'var(--surface2)',
                      outline:groupForm.icon===ic?'2px solid var(--primary)':'none',
                    }}>{ic}</button>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary" onClick={saveGroup} disabled={saving} style={{flex:1}}>
                  {saving?'⏳...':'💾 Simpan'}
                </button>
                <button className="btn btn-ghost" onClick={()=>setGroupModal(null)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: PRESET ══════════════════════════════════════════════ */}
      {presetModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setPresetModal(null)}>
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-title">{presetModal==='create'?'+ Buat Preset':'✏️ Edit Preset'}</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><label>Nama Preset *</label><input className="input" placeholder="Setting Valorant, Racing Mode..." value={presetForm.name} onChange={e=>setP('name',e.target.value)}/></div>
              <div>
                <label>Game (opsional)</label>
                <select className="select" value={presetForm.group_id||''} onChange={e=>setP('group_id',e.target.value||null)}>
                  <option value="">— Tidak terikat game spesifik</option>
                  {groups.map(g=><option key={g.id} value={g.id}>{g.icon} {g.game_name} ({g.name})</option>)}
                </select>
              </div>
              <div><label>Deskripsi</label><input className="input" placeholder="Deskripsi preset ini" value={presetForm.description} onChange={e=>setP('description',e.target.value)}/></div>
              <div style={{background:'var(--surface2)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'var(--text-2)'}}>
                💡 Preset menyimpan nama setting kamu. Aktifkan preset sebelum streaming untuk menandai game apa yang sedang dimainkan.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary" onClick={savePreset} disabled={saving} style={{flex:1}}>
                  {saving?'⏳...':'💾 Simpan'}
                </button>
                <button className="btn btn-ghost" onClick={()=>setPresetModal(null)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CONFIRM DELETE ══ */}
      {confirmDel && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setConfirmDel(null)}>
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal-title">🗑️ Hapus?</div>
            <p style={{color:'var(--text-2)',marginBottom:20}}>
              Yakin hapus <strong>"{confirmDel.item.name || confirmDel.item.game_name}"</strong>?
            </p>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-danger" onClick={handleDelete} style={{flex:1}}>Hapus</button>
              <button className="btn btn-ghost" onClick={()=>setConfirmDel(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
