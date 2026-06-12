// dashboard/src/components/Sidebar.jsx
const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'effects',   icon: '⚡', label: 'Efek' },
  { id: 'logs',      icon: '📋', label: 'Log Donasi' },
  { id: 'vjoy',      icon: '🕹️', label: 'vJoy Controller' },
  { id: 'config',    icon: '⚙️',  label: 'Konfigurasi' },
]

export default function Sidebar({ page, onNav, connected }) {
  return (
    <aside style={{
      width: 200, minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 0', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 16px 24px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
          🎮 Viewer<br/>
          <span style={{ color: 'var(--primary)' }}>Merusuh</span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: connected ? 'var(--green)' : 'var(--red)',
            boxShadow: connected ? '0 0 6px var(--green)' : 'none',
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
            {connected ? 'Terhubung' : 'Terputus'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => onNav(n.id)} style={{
            width: '100%', padding: '10px 16px',
            background: page === n.id ? 'rgba(124,58,237,0.15)' : 'transparent',
            border: 'none',
            borderLeft: page === n.id ? '3px solid var(--primary)' : '3px solid transparent',
            color: page === n.id ? 'var(--text)' : 'var(--text-2)',
            cursor: 'pointer', textAlign: 'left',
            fontSize: 13, fontWeight: page === n.id ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'all 0.15s',
          }}>
            <span>{n.icon}</span> {n.label}
          </button>
        ))}
      </nav>

      {/* Version */}
      <div style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: 11 }}>
        v1.0.0
      </div>
    </aside>
  )
}
