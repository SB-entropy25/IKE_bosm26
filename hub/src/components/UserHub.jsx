import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { LogOut, Zap, Lock, Unlock, PlayCircle } from 'lucide-react'

export function UserHub({ user, onSpeedRound, onStrategyRound, onLogout }) {
  const [settings, setSettings] = useState({ speed_round_enabled: false, strategy_round_enabled: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch
    supabase.from('hub_settings').select('*').single().then(({ data, error }) => {
      if (data) setSettings(data)
      setLoading(false)
    })

    // Subscribe to realtime updates
    const channel = supabase.channel('hub-settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hub_settings' }, payload => {
        setSettings(payload.new)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="min-h-screen p-6 relative flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center mb-10 pb-4 border-b border-white/10">
        <div>
          <h1 className="font-teko text-3xl font-bold text-white tracking-wide">IKE F1 QUIZ</h1>
          <p className="text-xs text-gray-400 font-inter">
            Driver: <strong className="text-white">{user.name}</strong> • ID: <strong className="text-white">{user.bitsId || user.bits_id}</strong>
          </p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition bg-white/5 px-4 py-2 rounded-lg border border-white/10">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto">
        <h2 className="font-teko text-5xl font-bold text-center mb-10 uppercase tracking-widest text-white">SELECT STAGE</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Speed Round Card */}
          <div className={`glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-300 ${!settings.speed_round_enabled && 'opacity-60 grayscale'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-24 h-24" />
            </div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold tracking-wider font-inter">STAGE 1</span>
              {settings.speed_round_enabled ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-900/50"><Unlock className="w-3.5 h-3.5"/> OPEN</span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-gray-400 font-bold bg-gray-900 px-2.5 py-1 rounded-md border border-gray-700"><Lock className="w-3.5 h-3.5"/> LOCKED</span>
              )}
            </div>

            <h3 className="font-teko text-4xl font-bold text-white mb-2 relative z-10">SPEED ROUND</h3>
            <p className="text-sm text-gray-400 font-inter mb-8 relative z-10 min-h-[60px]">
              The IKE Quiz. Test your knowledge on F1 history, technical regulations, and teams in a rapid-fire live event.
            </p>

            <button
              onClick={onSpeedRound}
              disabled={!settings.speed_round_enabled}
              className={`w-full py-4 rounded-xl font-teko text-2xl font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 relative z-10 ${
                settings.speed_round_enabled
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-900/40'
                  : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {settings.speed_round_enabled ? <><PlayCircle className="w-5 h-5"/> ENTER QUIZ</> : 'WAITING FOR ADMIN...'}
            </button>
          </div>

          {/* Strategy Round Card */}
          <div className={`glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-300 ${!settings.strategy_round_enabled && 'opacity-60 grayscale'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <div className="w-24 h-24 bg-cyan-400 rounded-full blur-2xl" />
            </div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-bold tracking-wider font-inter">STAGE 2</span>
              {settings.strategy_round_enabled ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-900/50"><Unlock className="w-3.5 h-3.5"/> OPEN</span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-gray-400 font-bold bg-gray-900 px-2.5 py-1 rounded-md border border-gray-700"><Lock className="w-3.5 h-3.5"/> LOCKED</span>
              )}
            </div>

            <h3 className="font-teko text-4xl font-bold text-white mb-2 relative z-10">STRATEGY ROUND</h3>
            <p className="text-sm text-gray-400 font-inter mb-8 relative z-10 min-h-[60px]">
              F1 Strategy Quest 2.0. Assume the role of Team Principal. Manage tires, weather crossovers, and reliability in a dynamic simulation.
            </p>

            <button
              onClick={onStrategyRound}
              disabled={!settings.strategy_round_enabled}
              className={`w-full py-4 rounded-xl font-teko text-2xl font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 relative z-10 ${
                settings.strategy_round_enabled
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-900/40'
                  : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {settings.strategy_round_enabled ? <><PlayCircle className="w-5 h-5"/> ENTER SIMULATION</> : 'WAITING FOR ADMIN...'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
