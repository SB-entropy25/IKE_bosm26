import React, { useState, useEffect } from 'react';
import { AppPhase, DecisionLog, DriverProfile, ParticipantRecord, RaceState, RaceEvent, UpgradePackage, GameConfig } from './types';
import { QuizQuestion } from './data/quizQuestions';
import { createInitialRaceState } from './engine/simulationEngine';
import { DEFAULT_GAME_CONFIG } from './data/defaultConfig';
import { calculateScoreBreakdown } from './engine/scoringEngine';
import { saveParticipantToDatabase, checkConnection, fetchQuizQuestions, fetchRaceEvents, fetchUpgrades, fetchGameConfig } from './lib/supabase';
import { soundManager } from './lib/audio';
import { PhaseRegistration } from './components/PhaseRegistration';
import { PhaseDriverQuiz } from './components/PhaseDriverQuiz';
import { PhaseUpgrades } from './components/PhaseUpgrades';
import { PhaseLiveRace } from './components/PhaseLiveRace';
import { PhaseDebrief } from './components/PhaseDebrief';
import { LiveLeaderboard } from './components/LiveLeaderboard';
import { SpectatorView } from './components/SpectatorView';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import {
  Volume2,
  VolumeX,
  Database,
  Trophy,
  Tv,
  Radio,
  Flag,
  RotateCcw,
} from 'lucide-react';

export const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>('registration');
  const [principalName, setPrincipalName] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [teamId, setTeamId] = useState<string>('');
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [upgrades, setUpgrades] = useState<string[]>([]);
  const [raceState, setRaceState] = useState<RaceState>(createInitialRaceState());
  const [decisionHistory, setDecisionHistory] = useState<DecisionLog[]>([]);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [upgradePackages, setUpgradePackages] = useState<UpgradePackage[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);

  // Check Supabase connection on load and fetch dynamic config
  const verifyDb = async () => {
    const res = await checkConnection();
    setSupabaseConnected(res.connected);
    
    // Fetch dynamic content (will use local fallback if disconnected)
    const qs = await fetchQuizQuestions();
    const evts = await fetchRaceEvents();
    const ups = await fetchUpgrades();
    const cfg = await fetchGameConfig();
    setQuizQuestions(qs);
    setRaceEvents(evts);
    setUpgradePackages(ups);
    setGameConfig(cfg);
  };

  useEffect(() => {
    verifyDb();
  }, []);

  const toggleAudio = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
    if (next) soundManager.playRadioBeep();
  };

  // Phase 1 -> Phase 2
  const handleRegistrationComplete = (principal: string, team: string) => {
    setPrincipalName(principal);
    setTeamName(team);
    const newTeamId = `TEAM-${Date.now().toString().slice(-6)}`;
    setTeamId(newTeamId);
    setPhase('quiz');
  };

  // Phase 2 -> Phase 3
  const handleQuizComplete = (profile: DriverProfile) => {
    setDriverProfile(profile);
    setPhase('upgrades');
  };

  // Phase 3 -> Phase 4
  const handleUpgradesComplete = (selectedUpgrades: string[]) => {
    setUpgrades(selectedUpgrades);
    setRaceState(createInitialRaceState());
    setDecisionHistory([]);
    setPhase('race');
  };

  // Phase 4 -> Phase 5
  const handleRaceFinish = async (finalState: RaceState, logs: DecisionLog[]) => {
    setRaceState(finalState);
    setDecisionHistory(logs);

    if (driverProfile) {
      const breakdown = calculateScoreBreakdown(finalState);
      const participant: ParticipantRecord = {
        team_id: teamId || `TEAM-${Math.floor(Math.random() * 900000 + 100000)}`,
        principal_name: principalName || 'Strategist',
        team_name: teamName || 'Grand Prix Racing',
        driver_profile: driverProfile,
        upgrades: upgrades,
        race_position: finalState.position,
        status: finalState.status,
        strategy_score: breakdown.strategy_accuracy,
        total_score: breakdown.total_score,
        score_breakdown: breakdown,
        decisions_count: logs.length,
        current_lap: finalState.lap,
        updated_at: new Date().toISOString(),
      };

      await saveParticipantToDatabase(participant);
    }

    setPhase('debrief');
  };

  const handleRestart = () => {
    setRaceState(createInitialRaceState());
    setDecisionHistory([]);
    setPhase('registration');
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#c5c6c7] font-inter selection:bg-red-600 selection:text-white pb-12">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-40 bg-black/70 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            onClick={() => setPhase('registration')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white shadow-lg shadow-red-950/60 group-hover:scale-105 transition">
              <Flag className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="font-teko text-2xl font-bold text-white tracking-wider leading-none">
                {gameConfig.theme.title} <span className="text-red-500">2.0</span>
              </div>
              <div className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">
                Pit Wall Strategy Engine
              </div>
            </div>
          </div>

          {/* Navigation Links & Global Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Direct Leaderboard View */}
            <button
              onClick={() => setPhase('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                phase === 'leaderboard'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>

            {/* Spectator Live Monitor */}
            <button
              onClick={() => setPhase('spectator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                phase === 'spectator'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Live 70 Spectator</span>
            </button>

            {/* Supabase DB Settings Button */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition"
              title="Configure Supabase Database"
            >
              <Database
                className={`w-4 h-4 ${supabaseConnected ? 'text-emerald-400' : 'text-amber-400'}`}
              />
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition"
              title={soundEnabled ? 'Mute Web Audio' : 'Unmute Web Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
        {phase === 'registration' && (
          <PhaseRegistration
            onComplete={handleRegistrationComplete}
            supabaseConnected={supabaseConnected}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        )}

        {phase === 'quiz' && <PhaseDriverQuiz onComplete={handleQuizComplete} quizQuestions={quizQuestions} />}

        {phase === 'upgrades' && <PhaseUpgrades onComplete={handleUpgradesComplete} upgradePackages={upgradePackages} />}

        {phase === 'race' && driverProfile && (
          <PhaseLiveRace
            raceState={raceState}
            driverProfile={driverProfile}
            upgrades={upgrades}
            raceEvents={raceEvents}
            gameConfig={gameConfig}
            onRaceFinish={handleRaceFinish}
          />
        )}

        {phase === 'debrief' && driverProfile && (
          <PhaseDebrief
            principalName={principalName}
            teamName={teamName}
            driverProfile={driverProfile}
            upgrades={upgrades}
            raceState={raceState}
            decisionHistory={decisionHistory}
            onViewLeaderboard={() => setPhase('leaderboard')}
            onRestart={handleRestart}
          />
        )}

        {phase === 'leaderboard' && (
          <LiveLeaderboard
            currentTeamId={teamId}
            onBackToSimulation={() => setPhase('registration')}
          />
        )}

        {phase === 'spectator' && (
          <SpectatorView onBackToSimulation={() => setPhase('registration')} />
        )}
      </main>

      {/* Supabase Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfigSaved={verifyDb}
      />
    </div>
  );
};

export default App;

