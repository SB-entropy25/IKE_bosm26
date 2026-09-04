import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { validateBitsId } from '../store.js'
import { ChevronLeft, User, Hash, AlertCircle, CheckCircle2 } from 'lucide-react'

export function UserLogin({ authSession, onLogin, onBack }) {
  const [name, setName] = useState('')
  const [bitsId, setBitsId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authSession && authSession.user) {
      setName(authSession.user.user_metadata?.full_name || '')
    }
  }, [authSession])

  const handleGoogleSignIn = () => {
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  const handleCompleteRegistration = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!bitsId.trim()) { setError('Please enter your BITS ID.'); return }
    if (!validateBitsId(bitsId.trim())) {
      setError('Invalid BITS ID format. Expected: 2022a7ps0855p (4 digits + alphanumeric + letter)')
      return
    }

    setLoading(true)
    try {
      const email = authSession.user.email

      // Check if this BITS ID is already registered to someone else
      const { data: existingBitsId } = await supabase
        .from('hub_users')
        .select('*')
        .eq('bits_id', bitsId.trim().toLowerCase())
        .single()
        
      if (existingBitsId) {
        throw new Error('This BITS ID is already registered to another account.')
      }

      const { data: newUser, error: insertErr } = await supabase
        .from('hub_users')
        .insert([{ email: email, name: name.trim(), bits_id: bitsId.trim().toLowerCase() }])
        .select()
        .single()

      if (insertErr) throw insertErr

      // Create blank score rows
      await supabase.from('speed_scores').upsert([
        { bits_id: newUser.bits_id, name: newUser.name, score: 0 }
      ], { onConflict: 'bits_id' })

      await supabase.from('strategy_scores').upsert([
        { bits_id: newUser.bits_id, name: newUser.name, score: 0 }
      ], { onConflict: 'bits_id' })

      onLogin(newUser)
    } catch (err) {
      setError(err.message || 'Registration failed. Check network or try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#060709]">
      <div className="absolute top-8 left-8 z-20">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition uppercase tracking-widest font-bold text-sm">
          <ChevronLeft className="w-5 h-5" /> Back to grid
        </button>
      </div>

      <div className="bg-[#101218] border border-gray-800 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
        {!authSession ? (
          <div className="text-center">
            <h2 className="font-teko text-4xl font-bold text-white tracking-wide mb-2 uppercase italic">Player Registration</h2>
            <p className="text-gray-400 font-inter text-sm mb-8">Sign in with your Google account to join the championship.</p>
            
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-black hover:bg-gray-200 font-bold font-inter py-3 rounded-xl transition flex items-center justify-center gap-3 shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="fade-in">
            <h2 className="font-teko text-4xl font-bold text-white tracking-wide mb-2 uppercase italic text-center">Complete Profile</h2>
            <p className="text-gray-400 font-inter text-sm mb-6 text-center">Link your BITS ID to finalize registration.</p>
            
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-[#161920] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500 transition"
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">BITS ID</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={bitsId}
                    onChange={e => setBitsId(e.target.value)}
                    className="w-full bg-[#161920] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500 transition uppercase"
                    placeholder="2022A7PS0000P"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold font-inter py-3 rounded-xl transition mt-4 shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Enter Championship'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
