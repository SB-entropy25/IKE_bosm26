import React from 'react'
import { App as StrategyApp } from '../strategy-sim/StrategyApp'

export function StrategyRound({ user, soundEnabled, onBack }) {
  // StrategyApp handles its own audio, so we don't strictly need to pass soundEnabled down
  // unless we want to sync them.
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto w-full h-full">
      <StrategyApp user={user} onExit={onBack} />
    </div>
  )
}
