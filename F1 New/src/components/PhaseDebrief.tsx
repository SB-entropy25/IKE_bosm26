import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { DecisionLog, DriverProfile, ParticipantRecord, RaceState, ScoreBreakdown } from '../types';
import { calculateScoreBreakdown } from '../engine/scoringEngine';
import { soundManager } from '../lib/audio';
import {
  Trophy,
  Award,
  Flame,
  Shield,
  Zap,
  TrendingUp,
  RotateCcw,
  Users,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Sparkles,
} from 'lucide-react';

interface PhaseDebriefProps {
  principalName: string;
  teamName: string;
  driverProfile: DriverProfile;
  upgrades: string[];
  raceState: RaceState;
  decisionHistory: DecisionLog[];
  onViewLeaderboard: () => void;
  onRestart: () => void;
}

export const PhaseDebrief: React.FC<PhaseDebriefProps> = ({
  principalName,
  teamName,
  driverProfile,
  upgrades,
  raceState,
  decisionHistory,
  onViewLeaderboard,
  onRestart,
}) => {
  const scoreBreakdown: ScoreBreakdown = calculateScoreBreakdown(raceState);

  useEffect(() => {
    if (raceState.status === 'Finished') {
      soundManager.playCheer();
      if (raceState.position <= 3) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e10600', '#00d2be', '#ff8700', '#ffffff'],
        });
      }
    } else {
      soundManager.playAlert();
    }
  }, []);

  const isFinished = raceState.status === 'Finished';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Debrief Header Banner */}
      <div className="p-8 rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold uppercase tracking-widest">
          <Award className="w-3.5 h-3.5 text-amber-400" /> Official FIA Grand Prix Debrief
        </div>

        <h2 className="text-6xl md:text-7xl font-teko font-extrabold uppercase text-white tracking-wide leading-none">
          {teamName.toUpperCase()} — {isFinished ? `FINISHED P${raceState.position}` : raceState.status.toUpperCase()}
        </h2>

        <p className="text-gray-300 font-inter text-sm max-w-xl mx-auto">
          Team Principal: <strong className="text-white">{principalName}</strong> | Driver Telemetry ID: <strong className="text-cyan-400">{driverProfile.driver_id}</strong>
        </p>

        {/* Superlicense Badge */}
        <div className="pt-2 flex justify-center">
          <div
            className={`px-6 py-2.5 rounded-2xl border font-teko text-3xl font-bold tracking-wider uppercase shadow-xl ${
              scoreBreakdown.rank_grade.startsWith('S')
                ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-400 text-amber-300 shadow-amber-950/60'
                : scoreBreakdown.rank_grade.startsWith('A')
                ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border-emerald-400 text-emerald-300 shadow-emerald-950/60'
                : scoreBreakdown.rank_grade.startsWith('B')
                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-cyan-400 text-cyan-300 shadow-cyan-950/60'
                : 'bg-red-950/60 border-red-500/50 text-red-300 shadow-red-950/60'
            }`}
          >
            GRADE: {scoreBreakdown.rank_grade}
          </div>
        </div>
      </div>

      {/* Main Score Readout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Total Score Card */}
        <div className="p-6 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col justify-between items-center text-center space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-inter uppercase tracking-widest text-gray-400 font-semibold">
              Comprehensive Superlicense Score
            </span>
            <div className="text-7xl font-teko font-extrabold text-white leading-none">
              {scoreBreakdown.total_score}
              <span className="text-2xl font-inter text-gray-400"> / 1000</span>
            </div>
          </div>

          <div className="w-full space-y-2 font-inter text-xs pt-4 border-t border-white/10">
            <div className="flex justify-between text-gray-400">
              <span>Race Status:</span>
              <span className={isFinished ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {raceState.status}
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Laps Completed:</span>
              <span className="text-white font-mono">{raceState.lap} / 60</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Pit Stops Taken:</span>
              <span className="text-white font-mono">{raceState.pit_stops}</span>
            </div>
          </div>

          <div className="w-full space-y-2 pt-2">
            <button
              onClick={onViewLeaderboard}
              className="w-full py-3 rounded-xl font-teko text-xl font-bold tracking-wider uppercase text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 transition"
            >
              <Users className="w-4 h-4" /> VIEW GLOBAL MULTIPLAYER LEADERBOARD ➔
            </button>
            <button
              onClick={onRestart}
              className="w-full py-2.5 rounded-xl font-teko text-lg tracking-wider uppercase text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" /> Run New Grand Prix Simulation
            </button>
          </div>
        </div>

        {/* Center & Right: Scoring Category Breakdown (2 Cols) */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
          <h3 className="text-2xl font-teko font-bold text-white tracking-wide flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> FIA STRATEGY AUDIT BREAKDOWN
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-inter">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span className="text-amber-400">🏆 F1 Championship Points</span>
                <span className="font-mono text-white font-bold">{scoreBreakdown.race_result} / 500</span>
              </div>
              <p className="text-[11px] text-gray-400">Awarded based on finishing grid position (P1=500, P2=360...)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span className="text-cyan-400">🧠 Tactical Strategy Accuracy</span>
                <span className="font-mono text-white font-bold">{scoreBreakdown.strategy_accuracy} / 150</span>
              </div>
              <p className="text-[11px] text-gray-400">Undercut timing, safety car pit calls, and weather crossover.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span className="text-emerald-400">🛞 Tire Preservation</span>
                <span className="font-mono text-white font-bold">{scoreBreakdown.tire_management} / 120</span>
              </div>
              <p className="text-[11px] text-gray-400">Avoiding the catastrophic tire cliff and managing degradation.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span className="text-purple-400">⚡ Energy & Fuel Efficiency</span>
                <span className="font-mono text-white font-bold">{scoreBreakdown.fuel_ers_efficiency} / 100</span>
              </div>
              <p className="text-[11px] text-gray-400">Lift-and-coast fuel preservation and battery harvesting.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span className="text-red-400">🛡️ Chassis Reliability</span>
                <span className="font-mono text-white font-bold">{scoreBreakdown.car_preservation} / 80</span>
              </div>
              <p className="text-[11px] text-gray-400">Power unit, hydraulics, and brake thermal management.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span className="text-pink-400">🟣 Fastest Lap Bonus</span>
                <span className="font-mono text-white font-bold">+{scoreBreakdown.fastest_lap_bonus} pts</span>
              </div>
              <p className="text-[11px] text-gray-400">Awarded for purple sector blitz on low fuel Soft compound.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stint Decision Timeline Log */}
      <div className="p-6 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
        <h3 className="text-2xl font-teko font-bold text-white tracking-wide flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" /> STRATEGY PLAYBACK TIMELINE
        </h3>

        <div className="space-y-2.5 font-inter text-xs max-h-72 overflow-y-auto pr-2">
          {decisionHistory.map((log, index) => (
            <div
              key={index}
              className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-white/10 transition"
            >
              <div className="flex items-center gap-3">
                <span className="font-teko text-lg font-bold text-red-400 w-14">LAP {log.lap}</span>
                <span className="font-semibold text-white px-2 py-0.5 rounded bg-white/10 text-[11px]">
                  {log.decision}
                </span>
                <span className="text-gray-400 truncate max-w-xs">{log.short_desc}</span>
              </div>
              <div className="flex items-center gap-4 text-gray-400">
                <span>Pos: <strong className="text-cyan-300">P{log.position}</strong></span>
                <span>Tires: <strong className="text-amber-300">{log.tireHealth}%</strong> ({log.compound})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
