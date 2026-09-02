import React, { useState, useEffect } from 'react'
import { loadSession, saveSession, clearSession } from './store.js'
import { LandingPage } from './components/LandingPage.jsx'
import { UserLogin } from './components/UserLogin.jsx'
import { AdminLogin } from './components/AdminLogin.jsx'
import { UserHub } from './components/UserHub.jsx'
import { AdminPanel } from './components/AdminPanel.jsx'
import { SpeedRound } from './components/SpeedRound.jsx'
import { StrategyRound } from './components/StrategyRound.jsx'

// Views: 'landing' | 'userLogin' | 'adminLogin' | 'userHub' | 'adminPanel' | 'speedRound' | 'strategyRound'

export default function App() {
  const [view, setView] = useState('landing')
  const [user, setUser] = useState(null) // { name, bitsId, id }
  const [soundEnabled, setSoundEnabled] = useState(true)

  // On mount, check for existing session
  useEffect(() => {
    const session = loadSession()
    if (session && session.bitsId) {
      setUser(session)
      // Don't auto-navigate — let user see landing and choose
    }
  }, [])

  const handleUserLogin = (userData) => {
    setUser(userData)
    saveSession(userData)
    setView('userHub')
  }

  const handleAdminLogin = () => {
    setView('adminPanel')
  }

  const handleLogout = () => {
    clearSession()
    setUser(null)
    setView('landing')
  }

  return (
    <div className="min-h-screen bg-[#060709] text-gray-200 relative">
      {view === 'landing' && (
        <LandingPage
          existingUser={loadSession()}
          onJoinRace={() => setView('userLogin')}
          onAdminLogin={() => setView('adminLogin')}
          onRestoreSession={(u) => { setUser(u); setView('userHub') }}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(p => !p)}
        />
      )}

      {view === 'userLogin' && (
        <UserLogin
          onLogin={handleUserLogin}
          onBack={() => setView('landing')}
        />
      )}

      {view === 'adminLogin' && (
        <AdminLogin
          onLogin={handleAdminLogin}
          onBack={() => setView('landing')}
        />
      )}

      {view === 'userHub' && user && (
        <UserHub
          user={user}
          onSpeedRound={() => setView('speedRound')}
          onStrategyRound={() => setView('strategyRound')}
          onLogout={handleLogout}
        />
      )}

      {view === 'adminPanel' && (
        <AdminPanel onLogout={() => setView('landing')} />
      )}

      {view === 'speedRound' && user && (
        <SpeedRound
          user={user}
          soundEnabled={soundEnabled}
          onBack={() => setView('userHub')}
        />
      )}

      {view === 'strategyRound' && user && (
        <StrategyRound
          user={user}
          soundEnabled={soundEnabled}
          onBack={() => setView('userHub')}
        />
      )}
    </div>
  )
}
