// dashboard/src/pages/EffectsPage.jsx
import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const GROUPS = ['racing', 'action', 'fps', 'survival', 'global']
const GROUP_ICONS = { racing: '🏎️', action: '💥', fps: '🔫', survival: '🌲', global: '🌐' }

function formatRp(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }

const EMPTY_FORM = {
  name: '', description: '', min_amount: '', max_amount: '',
  game_target: 'racing', adapter: 'ahk', action_key: '',
  duration_ms: 3000, cooldown_ms: 5000, is_active: 1,
}

export default function EffectsPage({ toast }) {
  const [effects, setEffects]     = useState([])
  const [allActions, setAllActions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)  // null | 'create' | 'edit'
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [filterGroup, setFilterGroup] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [ef, ak] = await Promise.all([api.getEffects(), api.getActions ? api.getActions() : api.getAhkActions()])
      setEffects(ef.data)
      setAllActions(ak.data)
    } catch { toast.error('Gagal memuat efek') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(EMPTY_FORM)
    setModal('create')
  }

  function openEdit(effect) {
    setForm({ ...effect, max_amount: effect.max_amount ?? '' })
    setModal('edit')
  }

  async function handleSave() {
    if (!form.name || !form.min_amount || !form.action_key) {
      toast.error('Nama, nominal min, dan action key wajib diisi'); return
    }
    setSaving(true)
    try {
      const body = {
        ...form,
        min_amount:  parseInt(form.min_amount),
        max_amount:  form.max_amount ? parseInt(form.max_amount) : null,
        duration_ms: parseInt(form.duration_ms),
        cooldown_ms: parseInt(form.cooldown_ms),
      }
      if (modal === 'create') await api.createEffect(body)
      else await api.updateEffect(form.id, body)
      toast.success(modal === 'create' ? 'Efek berhasil dibuat!' : 'Efek berhasil diupdate!')
      setModal(null)
      load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function handleToggle(id) {
    try {
      await api.toggleEffect(id)
      setEffects(prev => prev.map(e => e.id === id ? { ...e, is_active: e.is_active ? 0 : 1 } : e))
    } catch { toast.error('Gagal toggle efek') }
  }

  async function handleDelete(id) {
    try {
      await api.deleteEffect(id)
      toast.success('Efek dihapus')
      setConfirmDelete(null)
      load()
    } catch { toast.error('Gagal hapus efek') }
  }

  const filtered = filterGroup === 'all' ? effects : effects.filter(e => e.game_target === filterGroup)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>⚡ Manajemen Efek</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
            Atur mapping donasi → aksi game
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Tambah Efek</button>
      </div>

      {/* Filter grup */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['all', ...GROUPS].map(g => (
          <button key={g} onClick={() => setFilterGroup(g)}
            className="btn btn-ghost btn-sm"
            style={{ background: filterGroup === g ? 'rgba(124,58,237,0.2)' : undefined,
                     color: filterGroup === g ? 'var(--primary)' : undefined,
                     borderColor: filterGroup === g ? 'var(--primary)' : undefined }}>
            {g === 'all' ? '🎮 Semua' : `${GROUP_ICONS[g] || '🎮'} ${g}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Memuat...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{paddingLeft:20}}>Nama Efek</th>
                <th>Nominal Donasi</th>
                <th>Target Game</th>
                <th>Action Key</th>
                <th>Durasi</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Belum ada efek. Klik "Tambah Efek" untuk mulai.
                </td></tr>
              ) : filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ paddingLeft: 20 }}>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    {e.description && <div style={{ color: 'var(--text-2)', fontSize: 12 }}>{e.description}</div>}
                  </td>
                  <td>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>{formatRp(e.min_amount)}</span>
                    {e.max_amount ? <span style={{ color: 'var(--text-3)' }}> – {formatRp(e.max_amount)}</span>
                      : <span style={{ color: 'var(--text-3)' }}> +</span>}
                  </td>
                  <td>
                    <span className="badge badge-purple">
                      {GROUP_ICONS[e.game_target] || '🎮'} {e.game_target}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex', flexDirection:'column', gap:3}}>
                      <code style={{ background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{e.action_key}</code>
                      <span style={{fontSize:10, color: e.adapter==='vjoy' ? 'var(--amber)' : 'var(--text-3)'}}>
                        {e.adapter === 'vjoy' ? '🕹️ vJoy' : '🖥️ AHK'}
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{(e.duration_ms / 1000).toFixed(1)}s</td>
                  <td>
                    <label className="toggle">
                      <input type="checkbox" checked={!!e.is_active} onChange={() => handleToggle(e.id)} />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(e)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-title">{modal === 'create' ? '+ Tambah Efek Baru' : '✏️ Edit Efek'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label>Nama Efek *</label>
                <input className="input" placeholder="misal: Rem Mendadak" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label>Deskripsi</label>
                <input className="input" placeholder="Deskripsi singkat efek ini" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>Nominal Min (Rp) *</label>
                  <input className="input" type="number" placeholder="5000" value={form.min_amount}
                    onChange={e => setForm(f => ({ ...f, min_amount: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Nominal Max (Rp) — kosongkan = tak terbatas</label>
                  <input className="input" type="number" placeholder="9999" value={form.max_amount}
                    onChange={e => setForm(f => ({ ...f, max_amount: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>Target Game</label>
                  <select className="select" value={form.game_target}
                    onChange={e => setForm(f => ({ ...f, game_target: e.target.value }))}>
                    {GROUPS.map(g => <option key={g} value={g}>{GROUP_ICONS[g]} {g}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Adapter</label>
                  <select className="select" value={form.adapter}
                    onChange={e => setForm(f => ({ ...f, adapter: e.target.value, action_key: '' }))}>
                    <option value="ahk">🖥️ AutoHotkey (keyboard/mouse)</option>
                    <option value="vjoy">🕹️ vJoy / ViGEm (controller)</option>
                  </select>
                </div>
              </div>
              <div>
                <label>Action Key * — aksi yang akan dijalankan</label>
                <select className="select" value={form.action_key}
                  onChange={e => setForm(f => ({ ...f, action_key: e.target.value }))}>
                  <option value="">-- Pilih Action --</option>
                  {allActions.filter(a => a.adapter === form.adapter).map(a => (
                    <option key={a.action_key} value={a.action_key}>
                      [{a.group}] {a.action_key}{a.description ? ' — ' + a.description : ''}
                    </option>
                  ))}
                  <option value="__custom__">-- Ketik manual --</option>
                </select>
                {(form.action_key === '__custom__' || (!allActions.find(a => a.action_key === form.action_key) && form.action_key !== '')) && (
                  <input className="input" style={{ marginTop: 6 }} placeholder="nama_action_key"
                    value={form.action_key === '__custom__' ? '' : form.action_key}
                    onChange={e => setForm(f => ({ ...f, action_key: e.target.value }))} />
                )}
                {form.adapter === 'vjoy' && (
                  <p style={{ color: 'var(--amber)', fontSize: 11, marginTop: 6 }}>
                    ⚠️ vJoy memerlukan ViGEmBus driver terinstall di Windows. <a href="https://github.com/nefarius/ViGEmBus/releases" target="_blank" style={{color:'var(--primary)'}}>Download di sini</a>
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>Durasi (ms)</label>
                  <input className="input" type="number" value={form.duration_ms}
                    onChange={e => setForm(f => ({ ...f, duration_ms: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Cooldown (ms)</label>
                  <input className="input" type="number" value={form.cooldown_ms}
                    onChange={e => setForm(f => ({ ...f, cooldown_ms: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                  {saving ? '⏳ Menyimpan...' : '💾 Simpan'}
                </button>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-title">🗑️ Hapus Efek?</div>
            <p style={{ color: 'var(--text-2)', marginBottom: 20 }}>
              Yakin ingin menghapus efek <strong>"{confirmDelete.name}"</strong>? Aksi ini tidak bisa dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)} style={{ flex: 1 }}>
                Hapus
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
