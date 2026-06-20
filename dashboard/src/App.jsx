// dashboard/src/App.jsx
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import SetupWizard from './components/SetupWizard'
import ToastContainer from './components/ToastContainer'
import DashboardPage from './pages/DashboardPage'
import VjoyPage     from './pages/VjoyPage'
import TestingPage  from './pages/TestingPage'
import SecretsPage  from './pages/SecretsPage'
import OverlayPage  from './pages/OverlayPage'
import AhkPage      from './pages/AhkPage'
import EffectsPage from './pages/EffectsPage'
import LogsPage from './pages/LogsPage'
import ConfigPage from './pages/ConfigPage'
import { useSocket } from './hooks/useSocket'
import { useToast } from './hooks/useToast'

export default function App() {
  const [page, setPage]           = useState('dashboard')
  const [showWizard, setShowWizard] = useState(false)

  // Cek apakah wizard perlu ditampilkan (first-time atau config belum lengkap)
  useEffect(() => {
    fetch('/api/env/status')
      .then(r => r.json())
      .then(data => {
        if (!data.envExists || !data.isReady) setShowWizard(true)
      })
      .catch(() => {})
  }, [])
  const { connected, lastDonation, lastEffect, lastTestLog } = useSocket()
  const { toasts, toast } = useToast()

  const content = {
    dashboard: <DashboardPage lastDonation={lastDonation} lastEffect={lastEffect} />,
    effects:   <EffectsPage toast={toast} />,
    logs:      <LogsPage lastDonation={lastDonation} />,
    vjoy:      <VjoyPage    toast={toast} />,
    testing:   <TestingPage toast={toast} lastEffect={lastEffect} lastTestLog={lastTestLog} />,
    overlay:   <OverlayPage toast={toast} />,
    ahk:       <AhkPage      toast={toast} />,
    secrets:   <SecretsPage toast={toast} />,
    config:    <ConfigPage toast={toast} />,
  }

  return (
    <>
    {showWizard && (
      <SetupWizard
        onComplete={() => setShowWizard(false)}
        currentPort={3000}
      />
    )}
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar page={page} onNav={setPage} connected={connected} />
      <main style={{ flex: 1, padding: 28, overflowY: 'auto', maxHeight: '100vh' }}>
        {content[page] || content.dashboard}
      </main>
      <ToastContainer toasts={toasts} />
    </div>
    </>
  )
}
