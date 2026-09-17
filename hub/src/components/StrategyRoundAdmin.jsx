import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { ArrowLeft, RefreshCw, Trash2, Trophy } from 'lucide-react';

export function StrategyRoundAdmin({ onBack }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    setLoading(true);
    const { data } = await supabase.from('strategy_scores').select('*').order('score', { ascending: false });
    if (data) setScores(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchScores();
  }, []);

  const handleResetAttempt = async (bitsId, name) => {
    if (!window.confirm(`Are you sure you want to completely delete ${name}'s Strategy Sim attempt? This will permanently erase their score and allow them to play again.`)) {
      return;
    }
    
    // Delete the score from strategy_scores table
    const { error } = await supabase.from('strategy_scores').delete().eq('bits_id', bitsId);
    
    if (error) {
      alert('Failed to delete attempt: ' + error.message);
    } else {
      alert(`Successfully deleted ${name}'s attempt. They can now play the Strategy Sim again.`);
      fetchScores();
    }
  };

  return (
    <div className="min-h-screen p-6 bg-slate-950 text-gray-200 font-inter">
      <nav className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hub
          </button>
          <h1 className="font-teko text-3xl text-cyan-400 font-bold tracking-wide">Strategy Sim Control Room</h1>
        </div>
        <button 
          onClick={fetchScores}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-950 text-cyan-400 border border-cyan-800 hover:bg-cyan-900 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </nav>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Completed Attempts
            </h2>
            <span className="px-3 py-1 bg-cyan-950 text-cyan-400 text-xs font-bold rounded-full">
              {scores.length} Players Finished
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4">Rank</th>
                  <th className="p-4">Player</th>
                  <th className="p-4">Team</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Finished At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading attempts...</td></tr>
                ) : scores.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No players have completed the Strategy Sim yet.</td></tr>
                ) : (
                  scores.map((score, idx) => (
                    <tr key={score.bits_id} className="hover:bg-slate-800/50 transition">
                      <td className="p-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-white">{score.principal_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{score.bits_id}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-300">{score.team_name}</td>
                      <td className="p-4">
                        <span className="font-mono font-bold text-cyan-400">{score.score}</span>
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {new Date(score.updated_at).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleResetAttempt(score.bits_id, score.principal_name)}
                          className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-red-100 border border-red-900/50 rounded flex items-center gap-2 text-xs font-bold uppercase transition ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Erase Attempt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
