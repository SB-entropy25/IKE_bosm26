import React, { useState } from 'react'
import { ChevronLeft, ShieldAlert } from 'lucide-react'

export function AdminLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    if (username === 'admin' && password === 'admin') {
      onLogin()
    } else {
      setError('Invalid credentials. Please contact race director.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(225,6,0,0.08) 0%, transparent 60%)' }} />

      <div className="relative z-10 w-full max-w-sm">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-6 font-inter">
          <ChevronLeft className="w-4 h-4" /> Back to Landing
        </button>

        <div className="glass-card-bright p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-600/10 border border-red-500/20 mb-3">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="font-teko text-3xl font-bold text-white tracking-wide">RACE CONTROL</h2>
            <p className="text-xs text-gray-500 font-inter mt-1">Authorized FIA Personnel Only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 transition font-inter"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 transition font-inter"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center font-inter bg-red-950/40 p-2 rounded-lg border border-red-900/50">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-teko text-xl font-bold tracking-wider uppercase text-white transition-all bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500"
            >
              AUTHENTICATE
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
