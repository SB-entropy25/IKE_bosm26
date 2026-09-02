import React, { useState } from 'react';
import { soundManager } from '../lib/audio';
import { Flag, ShieldCheck, Gauge, Trophy, CloudRain, Cpu, Radio, Sparkles } from 'lucide-react';

interface PhaseRegistrationProps {
  onComplete: (principalName: string, teamName: string) => void;
  supabaseConnected: boolean;
  onOpenConfig: () => void;
}

export const PhaseRegistration: React.FC<PhaseRegistrationProps> = ({
  onComplete,
  supabaseConnected,
  onOpenConfig,
}) => {
  const [principalName, setPrincipalName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [activeTab, setActiveTab] = useState<'briefing' | 'rules' | 'scoring'>('briefing');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalName.trim() || !teamName.trim()) {
      setError('Please provide both Team Principal credentials and Team Name.');
      soundManager.playAlert();
      return;
    }
    setError('');
    soundManager.playRadioBeep();
    onComplete(principalName.trim(), teamName.trim());
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title Hero */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-widest animate-pulse">
          <Flag className="w-3.5 h-3.5" /> FIA World Championship Simulation
        </div>
        <h1 className="text-6xl md:text-7xl font-teko font-extrabold uppercase tracking-tight text-white leading-none">
          F1 STRATEGY QUEST <span className="text-[#e10600]">2.0</span>
        </h1>
        <p className="text-gray-400 font-inter text-base max-w-2xl mx-auto">
          The Ultimate Pit Wall Strategy & Real-Time Multiplayer Command Center. Host 70+ candidates in live tactical warfare.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Launch Control Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-teal-400" />
            
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-teko font-bold text-white tracking-wide leading-none">
                  Launch Control Authentication
                </h3>
                <p className="text-xs text-gray-400 font-inter">
                  Initialize pit wall telemetry and register your team
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-inter text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Team Principal Name
                </label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  placeholder="e.g., Christian Horner / Toto Wolff"
                  className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Constructor / Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Red Bull Racing / Scuderia Ferrari"
                  className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl font-teko text-2xl font-bold tracking-wider uppercase text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-xl shadow-red-950/50 transform hover:-translate-y-0.5 transition active:translate-y-0"
              >
                INITIALIZE PIT WALL TELEMETRY ➔
              </button>
            </form>

            {/* Database status banner */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    supabaseConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                  }`}
                />
                <span className="text-xs text-gray-300 font-inter">
                  {supabaseConnected ? 'Supabase Realtime Synced' : 'Local Storage Fallback'}
                </span>
              </div>
              <button
                onClick={onOpenConfig}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
              >
                Configure DB
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Operations Briefing & Regulations */}
        <div className="lg:col-span-7">
          <div className="p-6 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
            {/* Tabs Header */}
            <div className="flex border-b border-white/10 gap-2 pb-2">
              <button
                onClick={() => setActiveTab('briefing')}
                className={`px-4 py-2 rounded-lg font-teko text-lg tracking-wider uppercase transition ${
                  activeTab === 'briefing'
                    ? 'bg-red-600/20 border border-red-500/40 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🎮 Objective & Flow
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-4 py-2 rounded-lg font-teko text-lg tracking-wider uppercase transition ${
                  activeTab === 'rules'
                    ? 'bg-red-600/20 border border-red-500/40 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🏁 Strategy Regulations
              </button>
              <button
                onClick={() => setActiveTab('scoring')}
                className={`px-4 py-2 rounded-lg font-teko text-lg tracking-wider uppercase transition ${
                  activeTab === 'scoring'
                    ? 'bg-red-600/20 border border-red-500/40 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📊 1000-Point Scoring
              </button>
            </div>

            {/* Tab Contents */}
            <div className="font-inter text-sm text-gray-300 leading-relaxed min-h-[320px]">
              {activeTab === 'briefing' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <p className="text-white font-medium">
                    Welcome to the Chief Strategist Command Center. You will guide your driver across a dynamic <strong>60-Lap Grand Prix</strong> featuring evolving weather, Safety Cars, thermal tire deg, and undercut opportunities.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <div className="font-semibold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <Gauge className="w-4 h-4 text-cyan-400" /> 1. Driver Profiling
                      </div>
                      <p className="text-xs text-gray-400">
                        Assess your driver's psychology (Aggression, Tire Conservation, Data Trust).
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <div className="font-semibold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-400" /> 2. R&D Budget
                      </div>
                      <p className="text-xs text-gray-400">
                        Invest 100 Credits into Pit Crews, Weather Radar, AI Strategist, or Tire Engineers.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <div className="font-semibold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <Radio className="w-4 h-4 text-red-400" /> 3. Live War Room
                      </div>
                      <p className="text-xs text-gray-400">
                        Make tactical decisions every stint (Push, Defend, Save, Pit) with live telemetry.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <div className="font-semibold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <Trophy className="w-4 h-4 text-emerald-400" /> 4. Global Leaderboard
                      </div>
                      <p className="text-xs text-gray-400">
                        Compare your Superlicense score in real-time against 70+ candidates.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'rules' && (
                <div className="space-y-3 animate-in fade-in duration-200 text-xs">
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-1">
                    <span className="font-bold text-red-400 uppercase tracking-wider">🚨 The Pirelli Tire Cliff</span>
                    <p className="text-gray-300">
                      Below <strong>30% Tire Health</strong>, grip collapses exponentially. Pushing on dead tires (&lt;25%) has a <strong>60% chance of high-speed puncture blowout DNF</strong>.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1">
                    <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      <CloudRain className="w-3.5 h-3.5" /> Wet Weather & Crossover Windows
                    </span>
                    <p className="text-gray-300">
                      Slicks lose grip above <strong>30% dampness</strong> with high crash probability. Wet/Intermediate tires disintegrate <strong>3x faster</strong> on dry tracks (&lt;20%).
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
                    <span className="font-bold text-amber-400 uppercase tracking-wider">⛽ Fuel & Reliability Technical Regs</span>
                    <p className="text-gray-300">
                      Running out of fuel (&lt;0kg) results in official <strong>FIA Technical Disqualification (DSQ)</strong>. Overheating engine components must be cooled via Save Tires lift-and-coast.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'scoring' && (
                <div className="space-y-2.5 animate-in fade-in duration-200 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="font-bold text-white">🏆 Race Result (Max 500 pts)</div>
                      <div className="text-gray-400">P1: 500, P2: 360, P3: 300 ... P10: 20 pts.</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="font-bold text-cyan-400">🧠 Strategy Accuracy (Max 150 pts)</div>
                      <div className="text-gray-400">Decision synergy, undercut success & bonuses.</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="font-bold text-amber-400">🛞 Tire Preservation (Max 120 pts)</div>
                      <div className="text-gray-400">Healthy stint management without falling off cliff.</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="font-bold text-emerald-400">⚡ Fuel & ERS Energy (Max 100 pts)</div>
                      <div className="text-gray-400">Optimal battery deployment & lift-and-coast.</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="font-bold text-purple-400">🛡️ Car Preservation (Max 80 pts)</div>
                      <div className="text-gray-400">Subsystem reliability and power unit longevity.</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="font-bold text-pink-400">🟣 Fastest Lap Bonus (+50 pts)</div>
                      <div className="text-gray-400">Pushing on low fuel Soft compound tires.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
