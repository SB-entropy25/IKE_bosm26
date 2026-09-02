import React, { useState } from 'react'
import { supabase } from '../supabase.js'
import { validateBitsId } from '../store.js'
import { Flag, ChevronLeft, User, Hash, AlertCircle, CheckCircle2 } from 'lucide-react'

export function UserLogin({ onLogin, onBack }) {
  const [name, setName] = useState('')
  const [bitsId, setBitsId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingUser, setExistingUser] = useState(null)
  const [checkDone, setCheckDone] = useState(false)

  const handleCheck = async (e) => {
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
      // Check if this BITS ID already registered
      const { data: existing } = await supabase
        .from('hub_users')
        .select('*')
        .eq('bits_id', bitsId.trim().toLowerCase())
        .single()

      if (existing) {
        setExistingUser(existing)
        setCheckDone(true)
      } else {
        // Register new user
        const { data: newUser, error: insertErr } = await supabase
          .from('hub_users')
          .insert([{ name: name.trim(), bits_id: bitsId.trim().toLowerCase() }])
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

        onLogin({ name: newUser.name, bitsId: newUser.bits_id, id: newUser.id })
      }
    } catch (err) {
      setError('Registration failed: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreExisting = () => {
    onLogin({ name: existingUser.name, bitsId: existingUser.bits_id, id: existingUser.id })
  }

  const handleRegisterNew = async () => {
    setLoading(true)
    try {
      // Update name if different
      await supabase.from('hub_users').update({ name: name.trim() }).eq('bits_id', bitsId.trim().toLowerCase())
      onLogin({ name: name.trim(), bitsId: existingUser.bits_id, id: existingUser.id })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(225,6,0,0.08) 0%, transparent 60%)' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-6 font-inter">
          <ChevronLeft className="w-4 h-4" /> Back to Landing
        </button>

        {/* Card */}
        <div className="glass-card-bright p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-orange-500 to-red-600"
            style={{ backgroundSize: '200% auto', animation: 'shimmer 2s linear infinite' }} />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 mb-4">
              <Flag className="w-8 h-8 text-red-400 fill-current" />
            </div>
            <h2 className="font-teko text-4xl font-bold text-white tracking-wide">DRIVER REGISTRATION</h2>
            <p className="text-xs text-gray-400 font-inter mt-1">Enter your credentials to join the grid</p>
          </div>

          {!checkDone ? (
            <form onSubmit={handleCheck} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 font-inter">
                  <User className="inline w-3.5 h-3.5 mr-1.5" /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Max Verstappen"
                  className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition font-inter"
                />
              </div>

              {/* BITS ID */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 font-inter">
                  <Hash className="inline w-3.5 h-3.5 mr-1.5" /> BITS ID
                </label>
                <input
                  type="text"
                  value={bitsId}
                  onChange={e => setBitsId(e.target.value)}
                  placeholder="e.g., 2022a7ps0855p"
                  className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition font-inter font-mono"
                />
                <p className="text-[11px] text-gray-500 mt-1 font-inter">Format: 4 digits + course code + roll (e.g. 2022a7ps0855p)</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-xs font-inter">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-teko text-2xl font-bold tracking-wider uppercase text-white transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #e10600, #b91c1c)', boxShadow: '0 0 20px rgba(225,6,0,0.3)' }}
              >
                {loading ? 'Checking Grid...' : 'ENTER GRID →'}
              </button>
            </form>
          ) : (
            /* Existing user found */
            <div className="space-y-4 float-up">
              <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-300 font-semibold font-inter text-sm">Existing Registration Found</span>
                </div>
                <p className="text-xs text-gray-300 font-inter">
                  BITS ID <code className="text-cyan-400">{existingUser.bits_id}</code> was previously registered as{' '}
                  <strong className="text-white">{existingUser.name}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleRestoreExisting}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-teko text-xl font-bold tracking-wider uppercase text-white transition"
                  style={{ background: 'linear-gradient(135deg, #e10600, #b91c1c)' }}
                >
                  Resume as {existingUser.name}
                </button>
                <button
                  onClick={handleRegisterNew}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-teko text-xl font-bold tracking-wider uppercase text-gray-200 bg-white/8 hover:bg-white/12 border border-white/10 transition"
                >
                  Update Name & Continue
                </button>
                <button
                  onClick={() => { setCheckDone(false); setExistingUser(null) }}
                  className="text-xs text-gray-500 hover:text-gray-300 font-inter transition text-center"
                >
                  ← Try different BITS ID
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rules */}
        <div className="mt-6 p-4 rounded-xl bg-black/40 border border-white/8 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-inter">Race Rules</p>
          <ul className="text-xs text-gray-500 font-inter space-y-1.5">
            <li>⚡ <span className="text-red-400 font-semibold">Speed Round</span> — IKE Quiz: react fast, score high</li>
            <li>🧠 <span className="text-cyan-400 font-semibold">Strategy Round</span> — F1 Simulation: make smart calls</li>
            <li>🏆 Net score = Speed × weight + Strategy × weight (set by admin)</li>
            <li>🔑 Your BITS ID is your unique driver license — remember it!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
