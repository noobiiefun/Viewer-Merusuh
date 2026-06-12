// dashboard/src/App.jsx
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ToastContainer from './components/ToastContainer'
import DashboardPage from './pages/DashboardPage'
import VjoyPage from './pages/VjoyPage'
import EffectsPage from './pages/EffectsPage'
import LogsPage from './pages/LogsPage'
import ConfigPage from './pages/ConfigPage'
import { useSocket } from './hooks/useSocket'
import { useToast } from './hooks/useToast'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const { connected, lastDonation, lastEffect } = useSocket()
  const { toasts, toast } = useToast()

  const content = {
    dashboard: <DashboardPage lastDonation={lastDonation} lastEffect={lastEffect} />,
    effects:   <EffectsPage toast={toast} />,
    logs:      <LogsPage lastDonation={lastDonation} />,
    vjoy:      <VjoyPage toast={toast} />,
    config:    <ConfigPage toast={toast} />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar page={page} onNav={setPage} connected={connected} />
      <main style={{ flex: 1, padding: 28, overflowY: 'auto', maxHeight: '100vh' }}>
        {content[page] || content.dashboard}
      </main>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
