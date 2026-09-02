import React, { useState } from 'react';
import { UpgradePackage } from '../types';
import { soundManager } from '../lib/audio';
import { Sparkles, Coins, Check, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

interface PhaseUpgradesProps {
  onComplete: (selectedUpgrades: string[]) => void;
  upgradePackages: UpgradePackage[];
}

export const PhaseUpgrades: React.FC<PhaseUpgradesProps> = ({ onComplete, upgradePackages }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(['pit_crew']);
  const maxCredits = 100;

  const totalSpent = selectedIds.reduce((sum, id) => {
    const pkg = upgradePackages.find((u) => u.id === id);
    return sum + (pkg ? pkg.cost : 0);
  }, 0);

  const remainingCredits = maxCredits - totalSpent;

  const handleToggleUpgrade = (pkg: UpgradePackage) => {
    if (selectedIds.includes(pkg.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== pkg.id));
      soundManager.playExecuteDecision();
    } else {
      if (remainingCredits >= pkg.cost) {
        setSelectedIds([...selectedIds, pkg.id]);
        soundManager.playExecuteDecision();
      } else {
        soundManager.playAlert();
      }
    }
  };

  const handleProceed = () => {
    soundManager.playRadioBeep();
    const names = selectedIds.map((id) => {
      const u = upgradePackages.find((item) => item.id === id);
      return u ? u.name : id;
    });
    onComplete(names);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Budget Card */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Phase 3 / 5
          </div>
          <h2 className="text-4xl md:text-5xl font-teko font-extrabold uppercase text-white tracking-wide leading-none">
            R&D Upgrades & Budget Allocation
          </h2>
          <p className="text-gray-400 font-inter text-xs max-w-lg mt-1">
            Optimize your technical war chest. Allocate up to 100 Credits across telemetry, pit crew, and tire development packages.
          </p>
        </div>

        {/* Live Budget Counter */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-black/60 border border-amber-500/30 shadow-lg shadow-amber-950/30 shrink-0">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
            <Coins className="w-7 h-7" />
          </div>
          <div>
            <div className="text-[11px] font-inter font-semibold uppercase tracking-widest text-gray-400">
              Remaining Budget
            </div>
            <div className="text-3xl font-teko font-bold text-amber-400 leading-none">
              {remainingCredits} <span className="text-sm font-inter text-gray-400">/ {maxCredits} Cr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrades Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upgradePackages.map((pkg) => {
          const isSelected = selectedIds.includes(pkg.id);
          const canAfford = remainingCredits >= pkg.cost;
          const isDisabled = !isSelected && !canAfford;

          return (
            <div
              key={pkg.id}
              onClick={() => !isDisabled && handleToggleUpgrade(pkg)}
              className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                isSelected
                  ? 'bg-gradient-to-br from-amber-950/40 via-black to-black border-amber-400 shadow-xl shadow-amber-950/40 transform -translate-y-1'
                  : isDisabled
                  ? 'bg-black/30 border-white/5 opacity-40 cursor-not-allowed'
                  : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-black font-inter text-[10px] font-bold uppercase tracking-wider rounded-bl-lg flex items-center gap-1 shadow-md">
                  <Check className="w-3 h-3 stroke-[3]" /> Active
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-center justify-between pr-14">
                  <span className="text-[10px] font-inter uppercase tracking-widest font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    {pkg.tag}
                  </span>
                </div>

                <h3 className="text-2xl font-teko font-bold text-white tracking-wide leading-none">
                  {pkg.name}
                </h3>

                <p className="text-xs text-gray-400 font-inter leading-relaxed">
                  {pkg.description}
                </p>

                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 font-inter text-xs text-cyan-300 flex items-start gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{pkg.benefit}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="font-teko text-2xl font-bold text-amber-400">
                  {pkg.cost} <span className="text-xs font-inter text-gray-400">Credits</span>
                </span>
                <span className={`text-xs font-inter font-semibold uppercase ${isSelected ? 'text-amber-400' : 'text-gray-400'}`}>
                  {isSelected ? 'Installed' : canAfford ? '+ Install' : 'Insufficient Cr'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/10">
        <div className="text-xs font-inter text-gray-400">
          Selected Upgrades: <strong className="text-white">{selectedIds.length}</strong> installed ({totalSpent} Cr spent)
        </div>
        <button
          onClick={handleProceed}
          className="px-8 py-3 rounded-xl font-teko text-2xl font-bold tracking-wider uppercase text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-xl shadow-red-950/50 flex items-center gap-2 transition transform hover:-translate-y-0.5"
        >
          ENTER GRAND PRIX COMMAND CENTER ➔
        </button>
      </div>
    </div>
  );
};
