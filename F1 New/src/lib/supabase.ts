import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ParticipantRecord, GameConfig } from '../types';

const STORAGE_KEY_URL = 'f1_supabase_url';
const STORAGE_KEY_ANON = 'f1_supabase_anon_key';
const LOCAL_LEADERBOARD_KEY = 'f1_warroom_local_leaderboard';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) : null;

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: storedUrl || envUrl,
    anonKey: storedKey || envKey,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, config.url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, config.anonKey.trim());
    initSupabaseClient();
  }
}

let supabaseClient: SupabaseClient | null = null;

export function initSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (config.url && config.anonKey && config.url.startsWith('https://')) {
    try {
      supabaseClient = createClient(config.url, config.anonKey, {
        auth: { persistSession: false },
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      });
      return supabaseClient;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      supabaseClient = null;
      return null;
    }
  }
  supabaseClient = null;
  return null;
}

// Initial attempt
initSupabaseClient();

export function getClient(): SupabaseClient | null {
  if (!supabaseClient) {
    initSupabaseClient();
  }
  return supabaseClient;
}

export async function checkConnection(): Promise<{ connected: boolean; message: string }> {
  const client = getClient();
  if (!client) {
    return {
      connected: false,
      message: 'Supabase credentials not configured. Running in Local High-Speed Fallback Mode.',
    };
  }

  try {
    const { error } = await client.from('f1_participants').select('team_id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Supabase query error: ${error.message}. (Ensure f1_participants table exists)`,
      };
    }
    return {
      connected: true,
      message: '🟢 Live Supabase Realtime Connected (PostgreSQL)',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      message: `Connection failed: ${msg}`,
    };
  }
}

// --- LOCAL STORAGE FALLBACK LOGIC ---
export function getLocalLeaderboard(): ParticipantRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalParticipant(record: ParticipantRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalLeaderboard();
    const idx = existing.findIndex((r) => r.team_id === record.team_id);
    if (idx >= 0) {
      existing[idx] = record;
    } else {
      existing.push(record);
    }
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// --- DATABASE CRUD OPERATIONS ---
export async function saveParticipantToDatabase(record: ParticipantRecord): Promise<{ success: boolean; error?: string }> {
  // Always save locally first for instant offline durability
  saveLocalParticipant(record);

  const client = getClient();
  if (!client) {
    return { success: true }; // Saved to local storage
  }

  try {
    const payload = {
      team_id: record.team_id,
      principal_name: record.principal_name,
      team_name: record.team_name,
      driver_profile: record.driver_profile,
      upgrades: record.upgrades,
      race_position: record.race_position,
      status: record.status,
      strategy_score: record.strategy_score,
      total_score: record.total_score,
      score_breakdown: record.score_breakdown,
      decisions_count: record.decisions_count,
      current_lap: record.current_lap,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('f1_participants').upsert(payload, { onConflict: 'team_id' });
    if (error) {
      console.error('Supabase upsert error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to save participant:', msg);
    return { success: false, error: msg };
  }
}

export async function fetchLeaderboard(): Promise<ParticipantRecord[]> {
  const client = getClient();
  if (!client) {
    const local = getLocalLeaderboard();
    return local.sort((a, b) => b.total_score - a.total_score);
  }

  try {
    const { data, error } = await client
      .from('f1_participants')
      .select('*')
      .order('total_score', { ascending: false });

    if (error || !data) {
      console.warn('Error fetching from Supabase, falling back to local:', error);
      const local = getLocalLeaderboard();
      return local.sort((a, b) => b.total_score - a.total_score);
    }

    return data as ParticipantRecord[];
  } catch (err) {
    console.warn('Error connecting to Supabase:', err);
    const local = getLocalLeaderboard();
    return local.sort((a, b) => b.total_score - a.total_score);
  }
}

export function subscribeToLiveLeaderboard(onUpdate: (records: ParticipantRecord[]) => void): () => void {
  const client = getClient();
  if (!client) {
    // Return a dummy unsubscribe
    return () => {};
  }

  const channel = client
    .channel('f1_participants_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'f1_participants' },
      async () => {
        const fresh = await fetchLeaderboard();
        onUpdate(fresh);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// --- DYNAMIC GAME DATA FETCHING ---
import { QUIZ_QUESTIONS } from '../data/quizQuestions';
import { RACE_EVENTS } from '../data/events';
import { UPGRADES } from '../data/upgrades';
import { QuizQuestion } from '../data/quizQuestions';
import { RaceEvent, UpgradePackage } from '../types';

export async function fetchQuizQuestions(): Promise<QuizQuestion[]> {
  const client = getClient();
  if (!client) return QUIZ_QUESTIONS;

  try {
    const { data, error } = await client.from('f1_quiz_questions').select('*').order('id', { ascending: true });
    if (error || !data || data.length === 0) return QUIZ_QUESTIONS;
    return data as QuizQuestion[];
  } catch {
    return QUIZ_QUESTIONS;
  }
}

export async function fetchRaceEvents(): Promise<RaceEvent[]> {
  const client = getClient();
  if (!client) return RACE_EVENTS;

  try {
    const { data, error } = await client.from('f1_race_events').select('*');
    if (error || !data || data.length === 0) return RACE_EVENTS;
    return data as RaceEvent[];
  } catch {
    return RACE_EVENTS;
  }
}

export async function fetchUpgrades(): Promise<UpgradePackage[]> {
  const client = getClient();
  if (!client) return UPGRADES;

  try {
    const { data, error } = await client.from('f1_upgrades').select('*');
    if (error || !data || data.length === 0) return UPGRADES;
    return data as UpgradePackage[];
  } catch {
    return UPGRADES;
  }
}

import { DEFAULT_GAME_CONFIG } from '../data/defaultConfig';

export async function fetchGameConfig(): Promise<GameConfig> {
  const client = getClient();
  if (!client) return DEFAULT_GAME_CONFIG;

  try {
    const { data, error } = await client.from('f1_game_config').select('settings').eq('id', 1).single();
    if (error || !data || !data.settings) return DEFAULT_GAME_CONFIG;
    return data.settings as GameConfig;
  } catch {
    return DEFAULT_GAME_CONFIG;
  }
}
