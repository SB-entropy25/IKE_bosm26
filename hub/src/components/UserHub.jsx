import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { LogOut, Zap, Lock, Unlock, PlayCircle, Info, Trophy } from 'lucide-react'

const TRIVIA_FACTS = [
  "The fastest ever pit stop in F1 was 1.80 seconds, performed by McLaren on Lando Norris's car at the 2023 Qatar Grand Prix.",
  "An F1 car can generate so much downforce that, theoretically, it could drive upside down in a tunnel at speeds over 120 mph.",
  "F1 drivers can lose up to 3kg (6.6 lbs) of weight during a single race due to intense heat and G-forces.",
  "F1 steering wheels have up to 25 buttons and switches, controlling everything from differential settings to drink delivery.",
  "The halo system is made from grade 5 titanium and can withstand the weight of two African elephants (12,000 kg).",
  "A modern F1 car has around 80,000 components, and they must be assembled with 100% accuracy to ensure safety.",
  "F1 brakes can heat up to 1,000°C (1,832°F) during heavy braking zones, glowing bright orange.",
  "A Formula 1 engine revs up to 15,000 RPM, which is about two to three times faster than a standard road car."
]

export function UserHub({ user, onSpeedRound, onStrategyRound, onFinalRound, onLogout }) {
  const [isFinalist, setIsFinalist] = useState(false)

  useEffect(() => {
    const checkFinalist = async () => {
      const { data } = await supabase.from('final_scores').select('bits_id').eq('bits_id', user.bitsId || user.bits_id).single()
      if (data) setIsFinalist(true)
    }
    if (user) checkFinalist()
  }, [user])
  const [settings, setSettings] = useState({ speed_round_enabled: false, strategy_round_enabled: false })
  const [loading, setLoading] = useState(true)
  const [activeTriviaIndex, setActiveTriviaIndex] = useState(0)

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
          <h1 className="font-teko text-3xl font-bold text-white tracking-wide">Inspired Karters Electric F1 QUIZ</h1>
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

          
          {/* Final Round Card (Only for finalists) */}
          {isFinalist && settings.final_round_enabled && (
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-300 md:col-span-2 bg-gradient-to-br from-amber-900/40 to-black border-amber-500/30">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-32 h-32 text-amber-500" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-teko text-3xl font-bold uppercase tracking-wide text-amber-400">Final Quiz Round</h3>
                    <span className="text-xs font-bold text-amber-500/70 uppercase tracking-widest">You have qualified!</span>
                  </div>
                </div>
                <p className="text-sm text-gray-300 font-inter mb-6 leading-relaxed">
                  Welcome to the Finals. Prepare for the ultimate challenge.
                </p>
                <button
                  onClick={onFinalRound}
                  className="mt-auto w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_20px_rgba(217,119,6,0.3)] hover:shadow-[0_0_30px_rgba(217,119,6,0.5)]"
                >
                  Enter Finals
                </button>
              </div>
            </div>
          )}

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
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                  : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {settings.strategy_round_enabled ? <><PlayCircle className="w-5 h-5"/> ENTER SIMULATION</> : 'WAITING FOR ADMIN...'}
            </button>
          </div>
        </div>

        {/* Explore Section: Creative Trivia Swap */}
        <div className="mt-20 w-full max-w-md mx-auto fade-in">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <span className="w-16 h-[1px] bg-gradient-to-r from-transparent to-gray-700"></span>
            <span className="text-gray-500 font-teko text-xl tracking-[0.2em] uppercase">Paddock Intel</span>
            <span className="w-16 h-[1px] bg-gradient-to-l from-transparent to-gray-700"></span>
          </div>
          
          <div className="relative h-44 w-full cursor-pointer group perspective-1000" onClick={() => setActiveTriviaIndex(p => (p + 1) % TRIVIA_FACTS.length)}>
             {TRIVIA_FACTS.map((fact, idx) => {
               let offset = (idx - activeTriviaIndex + TRIVIA_FACTS.length) % TRIVIA_FACTS.length;
               if (offset > 2) return null;

               return (
                 <div 
                   key={idx}
                   className="absolute inset-0 w-full h-full p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                   style={{
                     backgroundColor: offset === 0 ? '#1a1d24' : offset === 1 ? '#15171d' : '#111318',
                     borderColor: offset === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                     transform: `translateY(${offset * 16}px) scale(${1 - offset * 0.06})`,
                     zIndex: 10 - offset,
                     opacity: 1 - offset * 0.35,
                     boxShadow: offset === 0 ? '0 20px 40px -20px rgba(0,0,0,0.8)' : 'none',
                   }}
                 >
                    <Info className="w-5 h-5 text-red-500 mb-3 opacity-60" />
                    <p className="font-inter text-gray-300 leading-relaxed text-[13px] md:text-sm px-2">
                      {fact}
                    </p>
                    {offset === 0 && (
                      <span className="absolute bottom-3 text-[10px] text-gray-600 uppercase tracking-widest font-bold group-hover:text-red-400 transition-colors">
                        Click to swap card
                      </span>
                    )}
                 </div>
               )
             })}
          </div>
        </div>

      </div>
    </div>
  )
}


