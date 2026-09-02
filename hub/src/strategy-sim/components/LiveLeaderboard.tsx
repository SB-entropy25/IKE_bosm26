import React, { useState, useEffect } from 'react';
import { ParticipantRecord } from '../types';
import { fetchLeaderboard, subscribeToLiveLeaderboard } from '../lib/supabase';
import {
  Trophy,
  Medal,
  Search,
  Download,
  RefreshCw,
  Award,
  Users,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface LiveLeaderboardProps {
  currentTeamId?: string;
  onBackToSimulation?: () => void;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  currentTeamId,
  onBackToSimulation,
}) => {
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const filtered = participants.filter((p) => {
    const matchesSearch =
      p.team_name.toLowerCase().includes(search.toLowerCase()) ||
      p.principal_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.driver_profile?.driver_id || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'finished'
        ? p.status === 'Finished'
        : p.status !== 'Finished';

    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = [
      'Rank',
      'Team Name',
      'Team Principal',
      'Driver ID',
      'Status',
      'Grid Position',
      'Total Score / 1000',
      'F1 Points',
      'Strategy Score',
      'Tire Score',
      'Fuel/ERS Score',
      'Reliability Score',
      'Superlicense Grade',
    ];

    const rows = participants.map((p, idx) => [
      idx + 1,
      `"${p.team_name}"`,
      `"${p.principal_name}"`,
      p.driver_profile?.driver_id || 'N/A',
      p.status,
      p.race_position,
      p.total_score,
      p.score_breakdown?.race_result || 0,
      p.score_breakdown?.strategy_accuracy || 0,
      p.score_breakdown?.tire_management || 0,
      p.score_breakdown?.fuel_ers_efficiency || 0,
      p.score_breakdown?.car_preservation || 0,
      `"${p.score_breakdown?.rank_grade || 'N/A'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `F1_Strategy_Quest_Leaderboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const top3 = participants.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-4xl md:text-5xl font-teko font-extrabold uppercase text-white tracking-wide leading-none">
              F1 STRATEGY QUEST MULTIPLAYER LEADERBOARD
            </h2>
            <p className="text-gray-400 font-inter text-xs mt-1">
              Live Real-Time Superlicense Rankings for {participants.length} Registered Candidates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 rounded-xl font-inter text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" /> Export CSV / Excel
          </button>
          {onBackToSimulation && (
            <button
              onClick={onBackToSimulation}
              className="px-5 py-2.5 rounded-xl font-teko text-xl font-bold tracking-wider uppercase text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition"
            >
              Command Center ➔
            </button>
          )}
        </div>
      </div>

      {/* Podium Cards (Top 3) */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* P2 - Silver */}
          {top3[1] && (
            <div className="order-2 md:order-1 p-5 rounded-2xl bg-gradient-to-b from-slate-800/40 via-black to-black border border-slate-400/40 shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-slate-400 text-black font-inter text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                P2 SILVER PODIUM
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-teko font-bold text-slate-300">
                  {top3[1].team_name}
                </div>
                <div className="text-xs font-inter text-gray-400">
                  Principal: <strong className="text-white">{top3[1].principal_name}</strong>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-3xl font-teko font-extrabold text-white">
                  {top3[1].total_score} <span className="text-xs font-inter text-gray-400">/ 1000</span>
                </span>
                <span className="text-xs font-inter font-semibold px-2 py-0.5 rounded bg-white/10 text-slate-200">
                  {top3[1].score_breakdown?.rank_grade || 'Grade A'}
                </span>
              </div>
            </div>
          )}

          {/* P1 - Gold Champion */}
          {top3[0] && (
            <div className="order-1 md:order-2 p-6 rounded-2xl bg-gradient-to-b from-amber-600/30 via-black to-black border-2 border-amber-400 shadow-2xl shadow-amber-950/60 flex flex-col justify-between relative overflow-hidden transform md:-translate-y-2">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-amber-400 text-black font-inter text-xs font-extrabold uppercase tracking-wider rounded-bl-xl shadow-lg">
                👑 P1 GRAND PRIX WINNER
              </div>
              <div className="space-y-1 pt-2">
                <div className="text-4xl font-teko font-extrabold text-amber-300 tracking-wide">
                  {top3[0].team_name}
                </div>
                <div className="text-xs font-inter text-gray-300">
                  Team Principal: <strong className="text-white">{top3[0].principal_name}</strong>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-amber-500/30 flex items-center justify-between">
                <span className="text-5xl font-teko font-extrabold text-white">
                  {top3[0].total_score} <span className="text-sm font-inter text-amber-400">/ 1000</span>
                </span>
                <span className="text-xs font-inter font-bold px-3 py-1 rounded-lg bg-amber-400 text-black shadow-md">
                  {top3[0].score_breakdown?.rank_grade || 'S-Tier Legend'}
                </span>
              </div>
            </div>
          )}

          {/* P3 - Bronze */}
          {top3[2] && (
            <div className="order-3 md:order-3 p-5 rounded-2xl bg-gradient-to-b from-amber-950/30 via-black to-black border border-amber-700/40 shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-amber-700 text-white font-inter text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                P3 BRONZE PODIUM
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-teko font-bold text-amber-200">
                  {top3[2].team_name}
                </div>
                <div className="text-xs font-inter text-gray-400">
                  Principal: <strong className="text-white">{top3[2].principal_name}</strong>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-3xl font-teko font-extrabold text-white">
                  {top3[2].total_score} <span className="text-xs font-inter text-gray-400">/ 1000</span>
                </span>
                <span className="text-xs font-inter font-semibold px-2 py-0.5 rounded bg-white/10 text-amber-300">
                  {top3[2].score_breakdown?.rank_grade || 'Grade B'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate, team, driver ID..."
            className="w-full pl-10 pr-4 py-2 bg-black/60 border border-white/15 rounded-xl text-white font-inter text-xs focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-inter font-semibold transition ${
              statusFilter === 'all'
                ? 'bg-white text-black font-bold'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            All ({participants.length})
          </button>
          <button
            onClick={() => setStatusFilter('finished')}
            className={`px-3 py-1.5 rounded-lg text-xs font-inter font-semibold transition ${
              statusFilter === 'finished'
                ? 'bg-emerald-500 text-black font-bold'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Finished ({participants.filter((p) => p.status === 'Finished').length})
          </button>
          <button
            onClick={() => setStatusFilter('dnf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-inter font-semibold transition ${
              statusFilter === 'dnf'
                ? 'bg-red-500 text-white font-bold'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            DNF / DSQ ({participants.filter((p) => p.status !== 'Finished').length})
          </button>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="p-4 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl overflow-x-auto">
        <table className="w-full text-left font-inter text-xs">
          <thead>
            <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3">Rank</th>
              <th className="py-3 px-3">Team & Principal</th>
              <th className="py-3 px-3">Driver ID</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Position</th>
              <th className="py-3 px-3 text-right">Strategy Acc</th>
              <th className="py-3 px-3 text-right">F1 Points</th>
              <th className="py-3 px-3 text-right">Total / 1000</th>
              <th className="py-3 px-3 text-center">Superlicense Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-500">
                  No candidate records found. Complete a simulation to register!
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => {
                const isCurrent = p.team_id === currentTeamId;
                const isFinished = p.status === 'Finished';
                return (
                  <tr
                    key={p.team_id || idx}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-l-4 border-cyan-400 font-medium'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="py-3.5 px-3 font-teko text-xl font-bold text-white">
                      {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-white text-sm">{p.team_name}</div>
                      <div className="text-gray-400 text-[11px]">{p.principal_name}</div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-cyan-400">
                      {p.driver_profile?.driver_id || 'VX-00'}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isFinished
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-teko text-xl font-bold text-gray-200">
                      {isFinished ? `P${p.race_position}` : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-cyan-300">
                      {p.score_breakdown?.strategy_accuracy || 0}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                      {p.score_breakdown?.race_result || 0}
                    </td>
                    <td className="py-3.5 px-3 text-right font-teko text-2xl font-extrabold text-white">
                      {p.total_score}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-semibold text-gray-300">
                        {p.score_breakdown?.rank_grade || 'Grade C'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
