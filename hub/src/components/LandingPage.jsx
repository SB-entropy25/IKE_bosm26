import React, { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, Flag, Shield } from 'lucide-react'

// SVG F1 Car
function F1CarSVG({ width = 280 }) {
  return (
    <svg width={width} height={width * 0.36} viewBox="0 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <path d="M60 55 L80 35 L200 35 L240 55 L220 65 L70 65 Z" fill="#e10600" />
      {/* Cockpit */}
      <path d="M120 35 L140 18 L180 18 L195 35 Z" fill="#1a1a2e" />
      <path d="M125 35 L143 22 L178 22 L192 35 Z" fill="#00d2be" opacity="0.3" />
      {/* Front wing */}
      <path d="M220 60 L260 62 L258 68 L218 66 Z" fill="#cc0000" />
      <path d="M255 62 L275 63 L273 67 L253 67 Z" fill="#e10600" />
      {/* Rear wing */}
      <path d="M55 42 L80 40 L80 46 L55 48 Z" fill="#e10600" />
      <path d="M40 40 L58 39 L58 44 L40 45 Z" fill="#cc0000" />
      {/* Wheels */}
      <circle cx="90" cy="67" r="13" fill="#111" stroke="#444" strokeWidth="2" />
      <circle cx="90" cy="67" r="7" fill="#222" />
      <circle cx="200" cy="67" r="13" fill="#111" stroke="#444" strokeWidth="2" />
      <circle cx="200" cy="67" r="7" fill="#222" />
      {/* Halo */}
      <path d="M138 22 Q150 15 165 18 Q155 22 145 22 Z" fill="#333" opacity="0.8" />
      {/* Number */}
      <text x="150" y="55" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Teko, sans-serif">IKE</text>
      {/* Sponsor stripes */}
      <rect x="100" y="35" width="3" height="28" fill="#ffd700" opacity="0.6" />
      <rect x="110" y="35" width="3" height="28" fill="#ffd700" opacity="0.4" />
      {/* Exhaust glow */}
      <ellipse cx="62" cy="56" rx="12" ry="5" fill="#ff6600" opacity="0.7" />
      <ellipse cx="50" cy="56" rx="8" ry="3" fill="#ffaa00" opacity="0.4" />
    </svg>
  )
}

// Speed lines behind car
function SpeedLines() {
  return (
    <div className="absolute bottom-[22%] left-0 w-full pointer-events-none z-[9]">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="speed-line"
          style={{
            width: `${30 + Math.random() * 40}%`,
            marginLeft: `${Math.random() * 20}%`,
            opacity: 0.3 + Math.random() * 0.4,
            animationDelay: `${i * 0.15}s`,
            animationDuration: `${4.5 + i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

export function LandingPage({ existingUser, onJoinRace, onAdminLogin, onRestoreSession, soundEnabled, onToggleSound }) {
  const [showRestore, setShowRestore] = useState(false)
  const [stats, setStats] = useState({ users: 0, loading: true })

  useEffect(() => {
    if (existingUser) {
      setShowRestore(true)
    }
    // Fetch participant count
    import('../supabase.js').then(({ supabase }) => {
      supabase.from('hub_users').select('id', { count: 'exact', head: true }).then(({ count }) => {
        setStats({ users: count || 0, loading: false })
      })
    })
  }, [existingUser])

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      {/* Background radial glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div style={{ animation: 'bg-pulse 3s ease-in-out infinite' }}
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(225,6,0,0.15) 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,210,190,0.08) 0%, transparent 70%)' }}
        />
        {/* Checkered flag pattern top-left */}
        <div className="absolute top-0 left-0 w-32 h-32 opacity-10"
          style={{
            backgroundImage: 'repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%)',
            backgroundSize: '16px 16px'
          }}
        />
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
          style={{
            backgroundImage: 'repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%)',
            backgroundSize: '16px 16px'
          }}
        />
      </div>

      {/* Top nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg">
            <Flag className="w-5 h-5 text-white fill-current" />
          </div>
          <span className="font-teko text-xl font-bold text-white tracking-wider">IKE MOTORSPORT</span>
          <span className="text-red-500 font-teko text-xl font-bold">× BOSM</span>
        </div>
        <div className="flex items-center gap-3">
          {!stats.loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-inter text-gray-300">{stats.users} Registered</span>
            </div>
          )}
          <button onClick={onToggleSound}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition text-gray-300 hover:text-white">
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        {/* IKE badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-widest mb-6 float-up">
          <Flag className="w-3.5 h-3.5" /> BITS Pilani BOSM 2026 · Presented by IKE Motorsport
        </div>

        {/* Main title */}
        <h1
          className="font-teko font-extrabold uppercase leading-none mb-4"
          style={{
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            backgroundImage: 'linear-gradient(135deg, #fff 0%, #e10600 40%, #ff8700 70%, #ffd700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'landing-glow 3s ease-in-out infinite',
          }}
        >
          IKE ULTIMATE
        </h1>
        <h1
          className="font-teko font-extrabold uppercase leading-none mb-6"
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 5.5rem)',
            color: 'white',
            letterSpacing: '0.08em',
          }}
        >
          F1 TRIVIA <span style={{ color: '#e10600' }}>CHAMPIONSHIP</span>
        </h1>

        <p className="font-inter text-gray-400 text-base max-w-xl mx-auto mb-12 leading-relaxed">
          Two rounds. One champion. Register with your BITS ID, battle through the{' '}
          <span className="text-red-400 font-semibold">Speed Round quiz</span> and the{' '}
          <span className="text-cyan-400 font-semibold">Strategy race simulation</span>. May the fastest mind win.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onJoinRace}
            className="px-10 py-4 rounded-2xl font-teko text-2xl font-bold tracking-wider uppercase text-white glow-red transition-all duration-200 hover:-translate-y-1 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #e10600, #b91c1c)', boxShadow: '0 0 30px rgba(225,6,0,0.4)' }}
          >
            🏁 JOIN THE RACE
          </button>
          <button
            onClick={onAdminLogin}
            className="px-8 py-4 rounded-2xl font-teko text-xl font-bold tracking-wider uppercase text-gray-200 border border-white/15 bg-white/5 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <Shield className="inline w-5 h-5 mr-2 mb-0.5" />
            RACE CONTROL
          </button>
        </div>

        {/* Restore session banner */}
        {showRestore && existingUser && (
          <div className="mt-8 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 max-w-md w-full float-up">
            <p className="text-amber-300 font-inter text-sm mb-3">
              🔄 Welcome back, <strong>{existingUser.name}</strong>! Resume your session?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => onRestoreSession(existingUser)}
                className="flex-1 py-2 rounded-xl bg-amber-500 text-black font-bold font-inter text-sm hover:bg-amber-400 transition"
              >
                Resume Session
              </button>
              <button
                onClick={() => setShowRestore(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-gray-300 font-inter text-sm hover:bg-white/15 transition"
              >
                New Registration
              </button>
            </div>
          </div>
        )}
      </div>

      {/* F1 Car Racing Animation */}
      <div className="f1-car-container">
        <div className="f1-car">
          <F1CarSVG width={260} />
        </div>
      </div>
      <SpeedLines />

      {/* Bottom info strip */}
      <div className="relative z-20 border-t border-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-inter text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Speed Round — IKE Quiz</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Strategy Round — F1 Simulation</span>
          </div>
        </div>
        <span className="text-gray-600">IKE BOSM 2026 · All Rights Reserved</span>
      </div>
    </div>
  )
}
