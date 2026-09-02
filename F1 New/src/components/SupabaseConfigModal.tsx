import React, { useState, useEffect } from 'react';
import { getSupabaseConfig, saveSupabaseConfig, checkConnection } from '../lib/supabase';
import { Database, CheckCircle2, AlertTriangle, Copy, Check, X, ShieldAlert } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [status, setStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    setTesting(true);
    const res = await checkConnection();
    setStatus(res);
    setTesting(false);
  };

  const handleSave = async () => {
    saveSupabaseConfig({ url, anonKey });
    await checkStatus();
    onConfigSaved();
  };

  const copySchemaSql = () => {
    const sql = `-- F1 STRATEGY QUEST 2.0 SCHEMA
CREATE TABLE IF NOT EXISTS public.f1_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT UNIQUE NOT NULL,
    principal_name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    driver_profile JSONB DEFAULT '{}'::jsonb,
    upgrades JSONB DEFAULT '[]'::jsonb,
    race_position INT DEFAULT 20,
    status TEXT DEFAULT 'Racing',
    strategy_score INT DEFAULT 0,
    total_score INT DEFAULT 0,
    score_breakdown JSONB DEFAULT '{}'::jsonb,
    decisions_count INT DEFAULT 0,
    current_lap INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_f1_participants_total_score ON public.f1_participants(total_score DESC);
ALTER TABLE public.f1_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.f1_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public upsert access" ON public.f1_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.f1_participants;`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#12141a] border border-white/15 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-teko font-bold text-white tracking-wide leading-none">
                Supabase Real-Time Database Setup
              </h3>
              <p className="text-xs text-gray-400 font-inter mt-0.5">
                Scale live multiplayer synchronization for 70+ concurrent candidates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4 font-inter text-sm">
          {/* Status badge */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              status?.connected
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}
          >
            {status?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed">
              <div className="font-semibold">
                {status?.connected ? 'Realtime Database Connected' : 'Local Fallback Storage Active'}
              </div>
              <div className="text-gray-300 mt-0.5">
                {status?.message || 'Testing live connection status...'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Anon Public API Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Quick instructions & Copy SQL */}
          <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                First time setup? Run SQL Script in Supabase:
              </div>
              <button
                onClick={copySchemaSql}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 rounded-md transition"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'Copied SQL!' : 'Copy SQL Schema'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              1. Create a free project on <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">supabase.com</a>.
              <br />
              2. Go to <strong>SQL Editor</strong>, paste the script above, and click <strong>Run</strong>.
              <br />
              3. Copy your Project URL & Anon Key from <strong>Project Settings → API</strong>.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={checkStatus}
            disabled={testing}
            className="px-3.5 py-2 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
          >
            {testing ? 'Verifying...' : 'Test Connection'}
          </button>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-teko tracking-wider uppercase font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-lg shadow-emerald-900/30 transition"
            >
              Save Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
