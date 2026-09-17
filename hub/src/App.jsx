import React, { useState, useEffect, useRef } from 'react'
import { loadSession, saveSession, clearSession, loadAdminSession, saveAdminSession, clearAdminSession } from './store.js'
import { supabase } from './supabase.js'
import { LandingPage } from './components/LandingPage.jsx'
import { UserLogin } from './components/UserLogin.jsx'
import { AdminLogin } from './components/AdminLogin.jsx'
import { UserHub } from './components/UserHub.jsx'
import { AdminPanel } from './components/AdminPanel.jsx'
import { SpeedRound } from './components/SpeedRound.jsx'
import { StrategyRound } from './components/StrategyRound.jsx'
import { FinalRound } from './components/FinalRound.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-900 text-white min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-4">React App Crashed</h1>
          <pre className="whitespace-pre-wrap bg-black/50 p-4 rounded text-sm mb-4">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white text-red-900 font-bold rounded">Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [view, setView] = useState('landing')
  const [user, setUser] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [authSession, setAuthSession] = useState(null)
  const [isProcessingAuth, setIsProcessingAuth] = useState(false)
  // Prevent double-firing of onAuthStateChange
  const authHandledRef = useRef(false)

  useEffect(() => {
    // 1. First restore from localStorage — fast, no flicker
    const adminSession = loadAdminSession()
    if (adminSession && adminSession.email) {
      setView('adminPanel')
      return
    }

    const localSession = loadSession()
    if (localSession && localSession.bitsId) {
      setUser(localSession)
      setView('userHub') // actually go to userHub instead of staying on landing
      // Don't call auth at all — we're already logged in from cache
      return
    }

    // 2. Only process OAuth callback if there's a login_intent (user just clicked Sign In)
    const intent = localStorage.getItem('login_intent')
    if (!intent) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authHandledRef.current) {
        authHandledRef.current = true
        handleAuthSession(session)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!authHandledRef.current) {
        authHandledRef.current = true
        handleAuthSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSession = async (session) => {
    if (!session) return

    setIsProcessingAuth(true)
    const email = session.user.email
    const intent = localStorage.getItem('login_intent')

    // --- DOMAIN ALLOWLIST ---
    const ALLOWED_DOMAINS = ['pilani.bits-pilani.ac.in', 'bits-pilani.ac.in', 'hyderabad.bits-pilani.ac.in', 'goa.bits-pilani.ac.in']
    const emailDomain = email.split('@')[1]
    const isAllowedDomain = ALLOWED_DOMAINS.some(d => emailDomain === d)

    // Fetch the open-access toggle from DB
    const { data: settingsRow } = await supabase.from('hub_settings').select('allow_any_email').eq('id', 1).single()
    const openAccess = settingsRow?.allow_any_email || false

    if (intent === 'admin') {
      const { data: adminCheck } = await supabase.from('admin_users').select('*').eq('email', email).single()
      if (adminCheck) {
        saveAdminSession(adminCheck)
        setView('adminPanel')
      } else {
        alert('Unauthorized admin email. Access denied.')
        await supabase.auth.signOut()
        setView('landing')
      }
      localStorage.removeItem('login_intent')
    } else if (intent === 'user') {
      if (!openAccess && !isAllowedDomain) {
        alert(`Access restricted to BITS Pilani students only.\nYour email (${email}) is not from an allowed domain.`)
        await supabase.auth.signOut()
        setView('landing')
        setIsProcessingAuth(false)
        return
      }
      const { data: playerCheck } = await supabase.from('hub_users').select('*').eq('email', email).single()
      if (playerCheck) {
        handleUserLogin(playerCheck)
      } else {
        setAuthSession(session)
        setView('userLogin')
      }
      localStorage.removeItem('login_intent')
    }
    setIsProcessingAuth(false)
  }

  // Listen for admin removing this user
  useEffect(() => {
    if (!user || !user.id) return

    const channel = supabase.channel('user-delete-watch')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'hub_users' }, (payload) => {
        if (payload.old && payload.old.id === user.id) {
          alert("Your registration has been removed by an admin. You have been logged out.")
          clearSession()
          supabase.auth.signOut()
          setUser(null)
          setView('landing')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const handleUserLogin = (userData) => {
    const normalized = { ...userData, bitsId: userData.bitsId || userData.bits_id }
    setUser(normalized)
    saveSession(normalized)
    setView('userHub')
  }

  const handleLogout = async () => {
    clearSession()
    clearAdminSession()
    await supabase.auth.signOut()
    setUser(null)
    authHandledRef.current = false
    setView('landing')
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#060709] text-gray-200 relative">
      {view === 'landing' && (
        <LandingPage
          existingUser={loadSession()}
          onJoinRace={() => { localStorage.setItem('login_intent', 'user'); setView('userLogin'); }}
          onAdminLogin={() => { localStorage.setItem('login_intent', 'admin'); setView('adminLogin'); }}
          onRestoreSession={(u) => { setUser(u); setView('userHub') }}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(p => !p)}
        />
      )}

      {view === 'userLogin' && (
        <UserLogin
          authSession={authSession}
          onLogin={handleUserLogin}
          onBack={() => setView('landing')}
        />
      )}

      {view === 'adminLogin' && (
        <AdminLogin
          onBack={() => setView('landing')}
        />
      )}

      {view === 'userHub' && user && (
        <UserHub
          user={user}
          onSpeedRound={() => setView('speedRound')}
          onFinalRound={() => setView('finalRound')}
          onStrategyRound={() => setView('strategyRound')}
          onLogout={handleLogout}
        />
      )}

      {view === 'adminPanel' && (
        <AdminPanel onLogout={handleLogout} />
      )}

      {view === 'speedRound' && user && (
        <SpeedRound user={user} onBack={() => setView('userHub')} onLogout={handleLogout} />
      )}

      {view === 'finalRound' && user && (
        <FinalRound user={user} onBack={() => setView('userHub')} onLogout={handleLogout} />
      )}

      {view === 'strategyRound' && user && (
        <StrategyRound user={user} onBack={() => setView('userHub')} />
      )}

      {isProcessingAuth && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white font-teko text-xl tracking-widest uppercase">Authenticating...</p>
        </div>
      )}
      </div>
    </ErrorBoundary>
  )
}

