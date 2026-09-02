import React, { useState } from 'react';
import { calculateDriverProfile, type QuizQuestion } from '../data/quizQuestions';
import type { DriverProfile } from '../types';
import { soundManager } from '../lib/audio';
import { UserCheck, Flame, ShieldAlert, Cpu, Award, ArrowRight, ChevronLeft, Brain } from 'lucide-react';

interface PhaseDriverQuizProps {
  onComplete: (profile: DriverProfile) => void;
  quizQuestions: QuizQuestion[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const statConfig = [
  { key: 'aggression',     label: 'Aggression',            icon: Flame,      color: 'text-red-400',     bar: 'bg-red-500'    },
  { key: 'risk_appetite',  label: 'Risk Appetite',         icon: ShieldAlert, color: 'text-amber-400',   bar: 'bg-amber-500'  },
  { key: 'data_reliance',  label: 'Data & Telemetry Trust', icon: Cpu,        color: 'text-cyan-400',    bar: 'bg-cyan-400'   },
  { key: 'tire_management',label: 'Tire Preservation Skill', icon: Award,    color: 'text-emerald-400', bar: 'bg-emerald-400'},
  { key: 'adaptability',   label: 'Adaptability',          icon: Brain,      color: 'text-purple-400',  bar: 'bg-purple-400' },
];

export const PhaseDriverQuiz: React.FC<PhaseDriverQuizProps> = ({ onComplete, quizQuestions }) => {
  const [answers, setAnswers] = useState<number[]>([2, 2, 2, 2, 2]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCalculated, setIsCalculated] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [selectedThisStep, setSelectedThisStep] = useState<number | null>(null);

  const handleSelectOption = (score: number) => {
    soundManager.playExecuteDecision();
    const updated = [...answers];
    updated[currentStep] = score;
    setAnswers(updated);
    setSelectedThisStep(score);
  };

  const handleNext = () => {
    if (currentStep < quizQuestions.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setSelectedThisStep(answers[currentStep + 1] ?? null);
      soundManager.playRadioBeep();
    } else {
      const calculated = calculateDriverProfile(answers);
      setProfile(calculated);
      setIsCalculated(true);
      soundManager.playCheer();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setSelectedThisStep(answers[currentStep - 1] ?? null);
    }
  };

  const handleConfirmProfile = () => {
    if (profile) {
      soundManager.playRadioBeep();
      onComplete(profile);
    }
  };

  const currentQ = quizQuestions[currentStep];
  if (!currentQ) return null;

  const progressPct = ((currentStep + 1) / quizQuestions.length) * 100;
  const hasAnswered = answers[currentStep] !== 2 || selectedThisStep !== null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── HEADER ────────────────────────────────── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-semibold uppercase tracking-widest">
          <UserCheck className="w-3.5 h-3.5" /> Phase 2 of 5 — Driver Profiling
        </div>
        <h2 className="text-5xl md:text-6xl font-teko font-extrabold uppercase text-white tracking-wide leading-none">
          Psychological <span className="text-[#00d2be]">Assessment</span>
        </h2>
        <p className="text-gray-400 font-inter text-sm max-w-lg mx-auto">
          Your answers build a real driver profile that directly shapes your car's behavior and risk thresholds in the race.
        </p>
      </div>

      {!isCalculated ? (
        <div className="glass-card-bright p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Animated top border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00d2be] via-cyan-300 to-[#00d2be] opacity-70" style={{backgroundSize:'200% auto', animation:'shimmer 2s linear infinite'}} />

          {/* ── PROGRESS ───────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-inter font-semibold uppercase tracking-wider text-gray-400">
              <span>Question {currentStep + 1} of {quizQuestions.length}</span>
              <span className="flex items-center gap-1.5">
                <span className={`text-lg`}>{currentQ.categoryIcon}</span>
                <span className="text-cyan-400">{currentQ.category}</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #00d2be, #34d399)',
                }}
              />
            </div>
            {/* Step dots */}
            <div className="flex gap-1.5">
              {quizQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i < currentStep ? 'bg-cyan-400' : i === currentStep ? 'bg-cyan-300' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── QUESTION ───────────────────────────── */}
          <div className="p-5 rounded-xl bg-white/4 border border-white/8 space-y-1">
            <div className="text-[10px] font-inter uppercase tracking-widest text-gray-500 font-semibold mb-2">
              Scenario Analysis Required
            </div>
            <h3 className="text-lg md:text-xl font-inter font-semibold text-white leading-snug">
              {currentQ.question}
            </h3>
          </div>

          {/* ── OPTIONS ────────────────────────────── */}
          <div className="space-y-3 font-inter">
            {currentQ.options.map((opt, idx) => {
              const isSelected = answers[currentStep] === opt.score;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(opt.score)}
                  className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-start gap-4 group ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/50 via-teal-950/30 to-black border-cyan-400/60 shadow-[0_0_20px_rgba(0,210,190,0.15)]'
                      : 'bg-black/30 border-white/8 hover:border-white/15 hover:bg-white/3'
                  }`}
                >
                  {/* Option label bubble */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200 ${
                    isSelected
                      ? 'bg-cyan-400 text-black'
                      : 'bg-white/8 text-gray-400 group-hover:bg-white/12 group-hover:text-white'
                  }`}>
                    {OPTION_LABELS[idx]}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className={`font-semibold text-sm leading-snug ${isSelected ? 'text-cyan-200' : 'text-white'}`}>
                      {opt.text}
                    </div>
                    <div className="text-xs text-gray-400 leading-relaxed">{opt.description}</div>
                  </div>
                  {/* Selected checkmark */}
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ml-auto transition-all duration-200 ${
                    isSelected ? 'border-cyan-400 bg-cyan-500 shadow-[0_0_8px_rgba(0,210,190,0.5)]' : 'border-gray-600'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── NAVIGATION ─────────────────────────── */}
          <div className="flex items-center justify-between pt-2 border-t border-white/8">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-inter font-semibold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-7 py-3 rounded-xl font-teko text-xl font-bold tracking-wider uppercase text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-lg shadow-cyan-900/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {currentStep === quizQuestions.length - 1 ? 'Build Driver Profile' : 'Next Question'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ── PROFILE RESULT CARD ──────────────────── */
        <div className="glass-card-bright p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden float-up border-cyan-500/20">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#e10600] via-amber-400 to-[#e10600] opacity-80" />

          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-5 border-b border-white/8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.2)]">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-inter uppercase tracking-widest text-amber-400 font-semibold">
                  Driver Archetype Confirmed
                </span>
                <h3 className="text-4xl font-teko font-bold text-white tracking-wide leading-none">
                  ID: {profile?.driver_id}
                </h3>
                <p className="text-xs text-gray-400 font-inter mt-0.5">
                  Profile locked and loaded into race physics engine
                </p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/25 text-emerald-300 text-xs font-inter font-semibold">
              ✓ Ready for R&D Allocation
            </div>
          </div>

          {/* Stat Bars */}
          <div className="space-y-3">
            <div className="text-[11px] font-inter uppercase tracking-widest text-gray-500 font-semibold">
              Psychometric Stat Breakdown — Live Race Impact
            </div>
            <div className="grid grid-cols-1 gap-3 font-inter">
              {statConfig.map(({ key, label, icon: Icon, color, bar }) => {
                const val = profile?.[key as keyof DriverProfile] as number ?? 0;
                return (
                  <div key={key} className="p-4 rounded-xl bg-white/4 border border-white/6 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider">
                      <span className={`flex items-center gap-1.5 ${color}`}>
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </span>
                      <span className="text-white font-mono">{val}%</span>
                    </div>
                    <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${bar}`}
                        style={{ width: `${val}%`, animationDelay: '0.2s' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Physics Impact Note */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 font-inter text-xs text-amber-200/80 space-y-1">
            <div className="font-semibold text-amber-400 uppercase tracking-wider">⚡ Physics Engine Impact</div>
            <p>Your Tire Preservation Skill directly multiplies tire wear rate. Your Aggression controls overtake probability. Your Adaptability determines how fast Confidence recovers after incidents. Every stat you earned above is live in the race engine.</p>
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirmProfile}
            className="w-full py-4 rounded-xl font-teko text-2xl font-bold tracking-wider uppercase text-white bg-gradient-to-r from-red-600 via-red-700 to-red-600 hover:from-red-500 hover:to-red-500 shadow-2xl shadow-red-950/60 transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            CONFIRM DRIVER & ALLOCATE R&D BUDGET ➔
          </button>
        </div>
      )}
    </div>
  );
};
