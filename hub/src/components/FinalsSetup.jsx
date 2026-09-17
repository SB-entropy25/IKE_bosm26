import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { ChevronLeft, Check, Users } from 'lucide-react';

export function FinalsSetup({ onBack, onLaunch }) {
  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidates = async () => {
      // Fetch from speed_scores
      const { data, error } = await supabase
        .from('speed_scores')
        .select('*')
        .order('score', { ascending: false });

      if (data) {
        setCandidates(data);
        // Select top 5 by default
        const top5 = new Set(data.slice(0, 5).map(c => c.bits_id));
        setSelectedIds(top5);
      }
      setLoading(false);
    };
    fetchCandidates();
  }, []);

  const toggleCandidate = (bits_id) => {
    const next = new Set(selectedIds);
    if (next.has(bits_id)) next.delete(bits_id);
    else next.add(bits_id);
    setSelectedIds(next);
  };

  const handleLaunch = async () => {
    if (selectedIds.size === 0) return alert('Select at least one finalist!');
    setLoading(true);

    const finalists = candidates.filter(c => selectedIds.has(c.bits_id));
    
    // Insert them into final_scores
    const inserts = finalists.map(f => ({
      bits_id: f.bits_id,
      name: f.name,
      avatar_name: f.avatar_name,
      score: 0
    }));

    const { error } = await supabase.from('final_scores').upsert(inserts, { onConflict: 'bits_id' });
    if (error) {
      alert('Error saving finalists: ' + error.message);
      setLoading(false);
      return;
    }

    onLaunch();
  };

  if (loading) return <div className="p-10 text-center text-white">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-[#0f1115] min-h-screen text-white font-inter">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="bg-[#1a1d24] border border-[#272b35] rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#272b35]">
          <div>
            <h2 className="text-3xl font-teko font-bold uppercase tracking-widest text-amber-500">Configure Finals Roster</h2>
            <p className="text-gray-400 text-sm mt-1">Select the top performers to enter the Final Quiz Round.</p>
          </div>
          <button 
            onClick={handleLaunch}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest transition"
          >
            <Check className="w-5 h-5" /> Launch Finals
          </button>
        </div>

        <div className="space-y-2">
          {candidates.map((c, i) => (
            <div 
              key={c.bits_id} 
              onClick={() => toggleCandidate(c.bits_id)}
              className={`flex items-center justify-between p-4 rounded-xl border transition cursor-pointer ${
                selectedIds.has(c.bits_id) 
                  ? 'bg-amber-950/20 border-amber-500/50' 
                  : 'bg-[#161920] border-[#272b35] hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-teko text-xl font-bold ${
                  i < 5 ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'
                }`}>
                  #{i + 1}
                </div>
                <div>
                  <div className="font-bold text-gray-200">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.bits_id} | Driver: {c.avatar_name || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Speed Score</div>
                  <div className="font-teko text-2xl text-white">{c.score}</div>
                </div>
                
                <div className={`w-6 h-6 rounded border flex items-center justify-center transition ${
                  selectedIds.has(c.bits_id) ? 'bg-amber-500 border-amber-400 text-black' : 'border-gray-600 text-transparent'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
