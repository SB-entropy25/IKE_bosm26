import React, { useState, useEffect } from 'react';
import type { Compound, DecisionAction, DecisionLog, DriverProfile, RaceEvent, RaceState, GameConfig } from '../types';
import { getLogicalEvent, processDecision } from '../engine/simulationEngine';
import { TelemetryGauge } from './ui/TelemetryGauge';
import { soundManager } from '../lib/audio';
import { Radio, Sparkles, CloudRain, Cpu, Info, AlertTriangle, Zap } from 'lucide-react';

interface PhaseLiveRaceProps {
  raceState: RaceState;
  driverProfile: DriverProfile;
  upgrades: string[];
  raceEvents: RaceEvent[];
  gameConfig: GameConfig;
  onRaceFinish: (finalState: RaceState, logs: DecisionLog[]) => void;
}

const COMPOUNDS: Compound[] = ['Soft', 'Medium', 'Hard', 'Intermediate', 'Wet'];

const COMPOUND_CONFIG: Record<Compound, { color: string; bg: string; letter: string }> = {
  Soft:         { color: 'text-red-400',     bg: 'bg-red-500/20 border-red-500/40',       letter: 'S' },
  Medium:       { color: 'text-amber-400',   bg: 'bg-amber-500/20 border-amber-500/40',   letter: 'M' },
  Hard:         { color: 'text-gray-200',    bg: 'bg-gray-500/20 border-gray-400/40',     letter: 'H' },
  Intermediate: { color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40',letter: 'I' },
  Wet:          { color: 'text-blue-400',    bg: 'bg-blue-500/20 border-blue-500/40',     letter: 'W' },
};

const ACTION_CONFIG = {
  Push:        { emoji: '⚡', color: 'btn-push-active',   idle: 'hover:border-red-500/40 hover:bg-red-950/20',    label: 'PUSH'      },
  'Save Tires':{ emoji: '🛡️', color: 'btn-save-active',   idle: 'hover:border-emerald-500/40 hover:bg-emerald-950/20', label: 'SAVE TIRES' },
  Defend:      { emoji: '🔒', color: 'btn-defend-active', idle: 'hover:border-amber-500/40 hover:bg-amber-950/20', label: 'DEFEND'    },
  Pit:         { emoji: '🔧', color: 'btn-pit-active',    idle: 'hover:border-cyan-500/40 hover:bg-cyan-950/20',  label: 'PIT'       },
};

export const PhaseLiveRace: React.FC<PhaseLiveRaceProps> = ({
  raceState: initialRaceState,
  driverProfile,
  upgrades,
  raceEvents,
  gameConfig,
  onRaceFinish,
}) => {
  const [state, setState] = useState<RaceState>(initialRaceState);
  const [currentEvent, setCurrentEvent] = useState<RaceEvent | null>(null);
  const [driverRadio, setDriverRadio] = useState<string>('Radio check pit wall, telemetry sync 100%. Standing by for stint orders.');
  const [commentary, setCommentary] = useState<string>('Grand Prix green flag! Field is charging through Sector 1.');
  const [decisionHistory, setDecisionHistory] = useState<DecisionLog[]>([]);
  const [selectedAction, setSelectedAction] = useState<DecisionAction>('Push');
  const [selectedCompound, setSelectedCompound] = useState<Compound>('Medium');
  const [recentNotification, setRecentNotification] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<'penalty' | 'bonus' | 'info'>('info');
  const [transmitting, setTransmitting] = useState(false);

  const hasAiAssistant = upgrades.some((u) => u.toLowerCase().includes('ai'));
  const hasWeatherRadar = upgrades.some((u) => u.toLowerCase().includes('weather'));

  useEffect(() => {
    if (raceEvents.length > 0) {
      const firstEvt = getLogicalEvent(state, raceEvents);
      setCurrentEvent(firstEvt);
    }
  }, [raceEvents]);

  const handleExecuteDecision = () => {
    if (transmitting) return;
    setTransmitting(true);
    soundManager.playExecuteDecision();

    const decision = selectedAction;
    const compound = decision === 'Pit' ? selectedCompound : undefined;

    const result = processDecision(
      state, decision, compound, driverProfile, upgrades, raceEvents, gameConfig, currentEvent || undefined
    );

    const logEntry: DecisionLog = {
      lap: state.lap,
      event: currentEvent?.event_type || 'General Stint',
      short_desc: currentEvent?.short_desc || 'Racing Lap',
      decision,
      compound: state.tire_compound,
      tireHealth: state.tire_health,
      position: result.nextState.position,
      gapAhead: result.nextState.gap_ahead,
      gapBehind: result.nextState.gap_behind,
      commentary: result.commentary,
      driverRadio: result.driverRadio,
      impactScore: currentEvent?.hidden_impact || 0,
    };

    setDecisionHistory((prev) => [...prev, logEntry]);
    setState(result.nextState);
    setDriverRadio(result.driverRadio);
    setCommentary(result.commentary);

    if (result.penaltyOrBonusNote) {
      setRecentNotification(result.penaltyOrBonusNote);
      const isPositive = result.penaltyOrBonusNote.includes('MASTERCLASS') || result.penaltyOrBonusNote.includes('FASTEST') || result.penaltyOrBonusNote.includes('TIMELY');
      setNotificationType(isPositive ? 'bonus' : 'penalty');
      if (result.penaltyOrBonusNote.includes('DNF') || result.penaltyOrBonusNote.includes('DISQUALIFIED')) {
        soundManager.playAlert();
      } else if (isPositive) {
        soundManager.playCheer();
      }
    } else {
      setRecentNotification(null);
    }

    setTimeout(() => setTransmitting(false), 600);

    if (result.nextState.status !== 'Racing' || result.nextState.lap >= 60) {
      setTimeout(() => {
        onRaceFinish(result.nextState, [...decisionHistory, logEntry]);
      }, 1800);
      return;
    }

    const nextEvt = getLogicalEvent(result.nextState, raceEvents);
    setCurrentEvent(nextEvt);
  };

  const getAiRecommendation = (): { action: DecisionAction; reason: string; urgency: 'high' | 'medium' | 'low' } => {
    if (state.track_dampness > 30 && ['Soft', 'Medium', 'Hard'].includes(state.tire_compound)) {
      return { action: 'Pit', reason: 'CRITICAL: Track dampness above 30%. Immediate pit for Intermediates or Wets to prevent aquaplaning DNF.', urgency: 'high' };
    }
    if (state.tire_health < 30) {
      return { action: 'Pit', reason: 'Tires below structural cliff (<30%). Box immediately for fresh rubber.', urgency: 'high' };
    }
    if (currentEvent?.event_type === 'Safety Car') {
      return { action: 'Pit', reason: 'Safety Car active — free pit window open. Use it now.', urgency: 'high' };
    }
    if (state.gap_ahead < 1.2 && state.ers_percent > 40 && state.tire_health > 50) {
      return { action: 'Push', reason: 'Within DRS detection zone with healthy battery. Execute push to overtake.', urgency: 'medium' };
    }
    if (state.reliability < 40 || state.fuel_load < 15) {
      return { action: 'Save Tires', reason: 'Lift-and-coast to preserve power unit and fuel reserves.', urgency: 'medium' };
    }
    return { action: 'Push', reason: 'Track clear, telemetry nominal. Maintain race delta.', urgency: 'low' };
  };

  const aiRec = hasAiAssistant ? getAiRecommendation() : null;
  const comp = COMPOUND_CONFIG[state.tire_compound];
  const lapProgress = (state.lap / state.totalLaps) * 100;
  const isDangerous = state.status !== 'Racing';

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* ── TOP HEADER BAR ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 rounded-2xl glass-card border border-white/8 shadow-2xl">
        {/* Lap Progress */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/6">
          <div className="text-center">
            <div className="text-[9px] font-inter uppercase tracking-widest text-gray-500 font-semibold">Lap</div>
            <div className="text-3xl font-teko font-bold text-white leading-none">{state.lap}</div>
            <div className="text-[10px] text-gray-500 font-inter">/ {state.totalLaps}</div>
          </div>
          <div className="flex-1">
            <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full transition-all duration-500" style={{width:`${lapProgress}%`}} />
            </div>
            <div className="text-[9px] text-gray-500 font-inter mt-1">{Math.round(lapProgress)}% complete</div>
          </div>
        </div>

        {/* Track Position */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20">
          <div>
            <div className="text-[9px] font-inter uppercase tracking-widest text-cyan-500 font-semibold">Position</div>
            <div className="text-4xl font-teko font-bold text-cyan-300 leading-none">P{state.position}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[9px] text-gray-500 font-inter">+{state.gap_ahead.toFixed(1)}s ahead</div>
            <div className="text-[9px] text-gray-500 font-inter">-{state.gap_behind.toFixed(1)}s behind</div>
          </div>
        </div>

        {/* Tire Compound */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/4 border border-white/6">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-teko text-xl font-bold ${comp.bg} ${comp.color}`}>
            {comp.letter}
          </div>
          <div>
            <div className="text-[9px] font-inter uppercase tracking-widest text-gray-500 font-semibold">Compound</div>
            <div className={`text-lg font-teko font-bold leading-none ${comp.color}`}>{state.tire_compound}</div>
            <div className="text-[10px] text-gray-500 font-inter">Age: {state.tire_age} laps</div>
          </div>
        </div>

        {/* Fuel Load */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/4 border border-white/6">
          <div>
            <div className="text-[9px] font-inter uppercase tracking-widest text-gray-500 font-semibold">Fuel</div>
            <div className={`text-3xl font-teko font-bold leading-none ${state.fuel_load < 15 ? 'text-red-400 critical-flash' : 'text-white'}`}>
              {state.fuel_load.toFixed(1)}
            </div>
            <div className="text-[10px] text-gray-500 font-inter">kg remaining</div>
          </div>
        </div>

        {/* Pit Stops */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/4 border border-white/6">
          <div>
            <div className="text-[9px] font-inter uppercase tracking-widest text-gray-500 font-semibold">Pit Stops</div>
            <div className="text-4xl font-teko font-bold text-amber-400 leading-none">{state.pit_stops}</div>
            <div className="text-[10px] text-gray-500 font-inter">Total Stops</div>
          </div>
        </div>
      </div>

      {/* ── MAIN WAR ROOM ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT: Telemetry Gauges */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0 opacity-60" />

            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="text-2xl font-teko font-bold text-white tracking-wide leading-none flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" /> LIVE TELEMETRY
              </h3>
              <span className="flex items-center gap-1.5 text-[10px] font-inter font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>

            {/* Gauges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <TelemetryGauge value={state.tire_health}      title="Tire Health"    unit="%" thresholds={{ warning: 45, danger: 25, invert: false }} />
              <TelemetryGauge value={state.track_dampness}   title="Track Dampness" unit="%" thresholds={{ warning: 25, danger: 38, invert: true  }} />
              <TelemetryGauge value={state.fuel_load}        max={110} title="Fuel Load"     unit="kg" thresholds={{ warning: 20, danger: 8,  invert: false }} />
              <TelemetryGauge value={state.ers_percent}      title="ERS Battery"    unit="%" thresholds={{ warning: 30, danger: 15, invert: false }} />
              <TelemetryGauge value={state.reliability}      title="Reliability"    unit="%" thresholds={{ warning: 45, danger: 25, invert: false }} />
              <TelemetryGauge value={state.driver_confidence} title="Confidence"    unit="%" thresholds={{ warning: 50, danger: 30, invert: false }} />
            </div>

            {/* Weather Radar Widget */}
            {hasWeatherRadar && (
              <div className={`p-3 rounded-xl border font-inter text-xs flex items-center justify-between transition ${
                state.track_dampness > 30
                  ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                  : 'bg-cyan-950/30 border-cyan-500/25 text-cyan-400'
              }`}>
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4" />
                  <span>Doppler Radar: {state.track_dampness > 30 ? '⚠️ Active Precipitation' : 'Clear Horizon'}</span>
                </div>
                <span className="font-mono font-bold">{state.track_dampness}% Damp</span>
              </div>
            )}

            {/* Driver Profile Quick Stats */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/6">
              <div className="text-center">
                <div className="text-[9px] font-inter uppercase tracking-widest text-gray-600 font-semibold">Aggression</div>
                <div className="text-base font-teko font-bold text-red-400">{driverProfile.aggression}%</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] font-inter uppercase tracking-widest text-gray-600 font-semibold">Tire Mgmt</div>
                <div className="text-base font-teko font-bold text-emerald-400">{driverProfile.tire_management}%</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] font-inter uppercase tracking-widest text-gray-600 font-semibold">Adapt</div>
                <div className="text-base font-teko font-bold text-purple-400">{driverProfile.adaptability}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Situation + Decision Console */}
        <div className="lg:col-span-7 space-y-4">

          {/* Penalty / Bonus Notification */}
          {recentNotification && (
            <div className={`p-4 rounded-xl font-inter text-sm font-semibold shadow-lg float-up flex items-start gap-3 ${
              notificationType === 'penalty'
                ? 'bg-red-950/80 border border-red-500/60 text-red-200 shadow-red-950/60 pulse-alert-box'
                : notificationType === 'bonus'
                ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 shadow-emerald-950/40'
                : 'bg-blue-950/60 border border-blue-500/40 text-blue-200'
            }`}>
              <span className="text-lg leading-none mt-0.5">
                {notificationType === 'penalty' ? '🚨' : notificationType === 'bonus' ? '⭐' : 'ℹ️'}
              </span>
              <span>{recentNotification}</span>
            </div>
          )}

          {/* Current Situation Card */}
          <div className="glass-card p-5 shadow-2xl space-y-4 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${
              currentEvent?.severity === 'Critical' ? 'bg-red-500 glow-red' :
              currentEvent?.severity === 'High'     ? 'bg-amber-500' :
              'bg-white/20'
            }`} />

            {/* Event Badge Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-inter font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-red-600/15 border border-red-500/25 text-red-400">
                  🚥 {currentEvent?.short_desc || 'Standard Race Pace'}
                </span>
                {currentEvent?.event_type && (
                  <span className="text-[10px] font-inter text-gray-500 px-2 py-0.5 rounded bg-white/5 border border-white/8">
                    {currentEvent.event_type}
                  </span>
                )}
              </div>
              {currentEvent?.severity && (
                <span className={`text-[11px] font-inter font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${
                  currentEvent.severity === 'Critical' ? 'badge-critical' :
                  currentEvent.severity === 'High'     ? 'badge-high' :
                  currentEvent.severity === 'Medium'   ? 'badge-medium' :
                  'badge-low'
                }`}>
                  {currentEvent.severity}
                </span>
              )}
            </div>

            {/* Situation Description */}
            <p className="font-inter text-sm text-gray-200 leading-relaxed">
              {currentEvent?.description || 'Maintain target lap delta while monitoring tire surface temperatures.'}
            </p>

            {/* AI Recommendation */}
            {hasAiAssistant && aiRec && (
              <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                aiRec.urgency === 'high'
                  ? 'bg-red-950/30 border-red-500/30'
                  : 'bg-teal-950/30 border-teal-500/25'
              }`}>
                <div className={`flex items-center gap-1.5 text-[11px] font-inter font-bold uppercase tracking-wider ${
                  aiRec.urgency === 'high' ? 'text-red-400' : 'text-teal-300'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Strategist → Recommends: [{aiRec.action}]
                  {aiRec.urgency === 'high' && <AlertTriangle className="w-3 h-3 ml-1" />}
                </div>
                <p className="text-xs text-gray-400 font-inter pl-5">{aiRec.reason}</p>
              </div>
            )}

            {/* Driver Radio */}
            <div className="p-3.5 rounded-xl bg-black/60 border-l-4 border-amber-500 font-inter text-xs space-y-1 shadow-inner">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-400">
                <Radio className="w-3.5 h-3.5" /> Driver Radio ({driverProfile.driver_id}):
              </div>
              <p className="italic text-gray-300 pl-5">"{driverRadio}"</p>
            </div>

            {/* Pit Wall Commentary */}
            <div className="p-3.5 rounded-xl bg-black/60 border-l-4 border-cyan-500 font-inter text-xs space-y-1 shadow-inner">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-cyan-400">
                <Info className="w-3.5 h-3.5" /> Pit Wall Commentary:
              </div>
              <p className="text-gray-300 pl-5">{commentary}</p>
            </div>
          </div>

          {/* Decision Console */}
          <div className="glass-card p-5 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600/0 via-red-500 to-red-600/0 opacity-60" />

            <div className="flex items-center justify-between">
              <h4 className="text-2xl font-teko font-bold text-white tracking-wide leading-none flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" /> PIT WALL DIRECTIVE
              </h4>
              <span className="text-[10px] font-inter text-gray-500">Select strategy order for next stint</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(ACTION_CONFIG) as DecisionAction[]).map((action) => {
                const cfg = ACTION_CONFIG[action];
                const isSelected = selectedAction === action;
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => { setSelectedAction(action); soundManager.playExecuteDecision(); }}
                    className={`py-3 px-2 rounded-xl border text-center font-teko text-lg tracking-wider uppercase font-bold transition-all duration-200 flex flex-col items-center gap-1 ${
                      isSelected
                        ? cfg.color
                        : `bg-black/40 border-white/8 text-gray-400 ${cfg.idle}`
                    }`}
                  >
                    <span className="text-xl leading-none">{cfg.emoji}</span>
                    <span className="text-sm leading-none">{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Compound Selector */}
            {selectedAction === 'Pit' && (
              <div className="p-4 rounded-xl bg-white/4 border border-cyan-500/25 space-y-2.5 float-up">
                <div className="text-[11px] font-inter font-semibold uppercase tracking-widest text-cyan-400">
                  Select Replacement Compound:
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {COMPOUNDS.map((comp) => {
                    const cfg = COMPOUND_CONFIG[comp];
                    return (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => { setSelectedCompound(comp); soundManager.playExecuteDecision(); }}
                        className={`py-2.5 rounded-xl border text-center font-inter font-bold text-xs uppercase transition-all duration-200 ${
                          selectedCompound === comp
                            ? `${cfg.bg} ${cfg.color} shadow-md`
                            : 'bg-black/50 border-white/8 text-gray-400 hover:text-white hover:border-white/15'
                        }`}
                      >
                        <div className={`text-lg font-teko font-bold ${cfg.color}`}>{cfg.letter}</div>
                        <div className="text-[9px] leading-none">{comp}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={handleExecuteDecision}
              disabled={transmitting || isDangerous}
              className={`w-full py-4 rounded-xl font-teko text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white transition-all duration-200 transform flex items-center justify-center gap-3 ${
                transmitting
                  ? 'opacity-60 scale-[0.99] cursor-not-allowed'
                  : 'hover:-translate-y-0.5 active:translate-y-0 glow-red'
              } bg-gradient-to-r from-red-700 via-red-600 to-red-700 hover:from-red-600 hover:to-red-600 shadow-2xl shadow-red-950/70`}
            >
              {transmitting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  TRANSMITTING...
                </span>
              ) : (
                `TRANSMIT ORDER: [${selectedAction.toUpperCase()}] ➔`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
