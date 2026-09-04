import { supabase } from '../../supabase.js';
import { ParticipantRecord, GameConfig } from '../types';

export { supabase };

export async function checkConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const { error } = await supabase.from('hub_settings').select('id').limit(1);
    if (error) {
      return { connected: false, message: `Supabase query error: ${error.message}` };
    }
    return { connected: true, message: '🟢 Connected' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { connected: false, message: `Connection failed: ${msg}` };
  }
}

export async function saveParticipantToDatabase(record: ParticipantRecord): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function fetchLeaderboard(): Promise<ParticipantRecord[]> {
  const { data, error } = await supabase
    .from('strategy_scores')
    .select('*')
    .order('score', { ascending: false });
    
  if (error || !data) return [];
  
  return data.map(d => ({
    team_id: d.bits_id,
    principal_name: d.principal_name || 'Strategist',
    team_name: d.team_name || 'Grand Prix Racing',
    status: 'Finished',
    total_score: d.score,
    strategy_score: d.score,
    race_position: d.race_position || 1,
    current_lap: 60,
    updated_at: d.updated_at
  } as ParticipantRecord));
}

export function subscribeToLiveLeaderboard(onUpdate: (records: ParticipantRecord[]) => void): () => void {
  const channel = supabase
    .channel('public:strategy_scores')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'strategy_scores' }, async () => {
      const records = await fetchLeaderboard();
      onUpdate(records);
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function getSupabaseConfig(): any {
  return { url: '', anonKey: '' };
}

export function saveSupabaseConfig(config: any): void {}


// --- DYNAMIC GAME DATA FETCHING ---
import { QUIZ_QUESTIONS } from '../data/quizQuestions';
import { RACE_EVENTS } from '../data/events';
import { UPGRADES } from '../data/upgrades';
import { QuizQuestion } from '../data/quizQuestions';
import { RaceEvent, UpgradePackage } from '../types';

export async function fetchQuizQuestions(): Promise<QuizQuestion[]> {
  try {
    const { data, error } = await supabase.from('f1_quiz_questions').select('*').order('id', { ascending: true });
    if (error || !data || data.length === 0) return QUIZ_QUESTIONS;
    return data as QuizQuestion[];
  } catch {
    return QUIZ_QUESTIONS;
  }
}

export async function fetchRaceEvents(): Promise<RaceEvent[]> {
  try {
    const { data, error } = await supabase.from('f1_race_events').select('*');
    if (error || !data || data.length === 0) return RACE_EVENTS;
    return data as RaceEvent[];
  } catch {
    return RACE_EVENTS;
  }
}

export async function fetchUpgrades(): Promise<UpgradePackage[]> {
  try {
    const { data, error } = await supabase.from('f1_upgrades').select('*');
    if (error || !data || data.length === 0) return UPGRADES;
    return data as UpgradePackage[];
  } catch {
    return UPGRADES;
  }
}

import { DEFAULT_GAME_CONFIG } from '../data/defaultConfig';

export async function fetchGameConfig(): Promise<GameConfig> {
  try {
    const { data, error } = await supabase.from('f1_game_config').select('settings').eq('id', 1).single();
    if (error || !data || !data.settings) return DEFAULT_GAME_CONFIG;
    return data.settings as GameConfig;
  } catch {
    return DEFAULT_GAME_CONFIG;
  }
}
