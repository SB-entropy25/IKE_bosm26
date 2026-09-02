import React, { useState, useEffect } from 'react';
import { ParticipantRecord } from '../types';
import { fetchLeaderboard, subscribeToLiveLeaderboard } from '../lib/supabase';
import {
  Tv,
  Users,
  Activity,
  AlertOctagon,
  Award,
  Zap,
  RefreshCw,
  Gauge,
  Flame,
} from 'lucide-react';

interface SpectatorViewProps {
  onBackToSimulation?: () => void;
}

export const SpectatorView: React.FC<SpectatorViewProps> = ({ onBackToSimulation }) => {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchLeaderboard();
    setParticipants(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToLiveLeaderboard((fresh) => {
      setParticipants(fresh);
    });
    return () => unsubscribe();
  }, []);

  const finishedCount = participants.filter((p) => p.status === 'Finished').length;
  const dnfCount = participants.filter((p) => p.status !== 'Finished' && p.status !== 'Racing').length;
  const activeCount = participants.filter((p) => p.status === 'Racing').length;

  const avgTotalScore =
    participants.length > 0
      ? Math.round(participants.reduce((sum, p) => sum + p.total_score, 0) / participants.length)
      : 0;

  const avgStrategyScore =
    participants.length > 0
      ? Math.round(
          participants.reduce(
            (sum, p) => sum + (p.score_breakdown?.strategy_accuracy || p.strategy_score || 0),
            0
          ) / participants.length
        )
      : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
            <Tv className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-inter uppercase font-bold tracking-widest text-red-400">
                LIVE SPECTATOR COMMAND WALL
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-teko font-extrabold uppercase text-white tracking-wide leading-none">
              70-CANDIDATE GRAND PRIX RACE MONITOR
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onBackToSimulation && (
            <button
              onClick={onBackToSimulation}
              className="px-5 py-2.5 rounded-xl font-teko text-xl font-bold tracking-wider uppercase text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition"
            >
              Exit Spectator Mode ➔
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <div className="text-[10px] font-inter uppercase font-semibold text-gray-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" /> Total Candidates
          </div>
          <div className="text-3xl font-teko font-bold text-white leading-none">
            {participants.length} <span className="text-xs font-inter text-gray-400">Teams</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <div className="text-[10px] font-inter uppercase font-semibold text-gray-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" /> Finished Grand Prix
          </div>
          <div className="text-3xl font-teko font-bold text-emerald-400 leading-none">
            {finishedCount} <span className="text-xs font-inter text-gray-400">Classified</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <div className="text-[10px] font-inter uppercase font-semibold text-gray-400 flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" /> DNF / DSQ Casualties
          </div>
          <div className="text-3xl font-teko font-bold text-red-400 leading-none">
            {dnfCount} <span className="text-xs font-inter text-gray-400">Retired</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <div className="text-[10px] font-inter uppercase font-semibold text-gray-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" /> Avg Total Score
          </div>
          <div className="text-3xl font-teko font-bold text-amber-300 leading-none">
            {avgTotalScore} <span className="text-xs font-inter text-gray-400">/ 1000</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <div className="text-[10px] font-inter uppercase font-semibold text-gray-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-400" /> Avg Strategy Accuracy
          </div>
          <div className="text-3xl font-teko font-bold text-purple-300 leading-none">
            {avgStrategyScore} <span className="text-xs font-inter text-gray-400">/ 150</span>
          </div>
        </div>
      </div>

      {/* Live Candidate Cards Grid */}
      <div className="p-6 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
        <h3 className="text-2xl font-teko font-bold text-white tracking-wide flex items-center gap-2">
          <Gauge className="w-5 h-5 text-cyan-400" /> LIVE CANDIDATE GRID TELEMETRY
        </h3>

        {participants.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-inter text-sm">
            Waiting for candidate connections... Candidates will appear live as they begin their simulations.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 font-inter">
            {participants.map((p, idx) => {
              const isFinished = p.status === 'Finished';
              return (
                <div
                  key={p.team_id || idx}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 transition-all ${
                    isFinished
                      ? 'bg-white/5 border-white/10 hover:border-cyan-500/40'
                      : 'bg-red-950/20 border-red-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-xs truncate max-w-[140px]">
                        {p.team_name}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[140px]">
                        {p.principal_name}
                      </div>
                    </div>
                    <span className="font-teko text-2xl font-bold text-cyan-400">
                      {isFinished ? `P${p.race_position}` : 'DNF'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
                    <span className="text-gray-400 font-mono">
                      {p.driver_profile?.driver_id || 'VX-00'}
                    </span>
                    <span className="font-teko text-xl font-bold text-white">
                      {p.total_score} <span className="text-[10px] font-inter text-gray-400">pts</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
