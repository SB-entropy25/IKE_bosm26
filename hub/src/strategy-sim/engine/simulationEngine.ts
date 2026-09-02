import { Compound, DecisionAction, DriverProfile, RaceEvent, RaceState, GameConfig } from '../types';


export function createInitialRaceState(): RaceState {
  return {
    lap: 1,
    totalLaps: 60,
    position: Math.floor(Math.random() * 10) + 5, // P5 to P14 starting grid
    tire_health: 100,
    tire_compound: 'Medium',
    tire_age: 0,
    track_dampness: 0,
    fuel_load: 110.0,
    ers_percent: 100,
    gap_ahead: +(Math.random() * 4 + 1.2).toFixed(1),
    gap_behind: +(Math.random() * 4 + 1.5).toFixed(1),
    reliability: 100,
    driver_confidence: 100,
    pit_stops: 0,
    risk_efficiency: 50,
    resource_management: 50,
    prediction_accuracy: 50,
    strategy_bonus: 0,
    fastest_lap_bonus: 0,
    status: 'Racing',
  };
}

export function getLogicalEvent(state: RaceState, raceEvents: RaceEvent[]): RaceEvent {
  const dampness = state.track_dampness;
  const tireHealth = state.tire_health;
  const reliability = state.reliability;
  const gapAhead = state.gap_ahead;

  if (!raceEvents || raceEvents.length === 0) return {} as RaceEvent;

  const weightedEvents: { event: RaceEvent; weight: number }[] = raceEvents.map((evt) => {
    let weight = 1.0;

    if (dampness > 20 && evt.event_type === 'Weather Shift') {
      weight = 16.0;
    }
    if (tireHealth < 35 && evt.event_type === 'Tire Wear') {
      weight = 20.0;
    }
    if (reliability < 40 && evt.event_type === 'Subsystem Issue') {
      weight = 15.0;
    }
    if (gapAhead < 1.5 && evt.event_type === 'Track Position') {
      weight = 12.0;
    }
    if (evt.event_type === 'Safety Car') {
      weight = 3.0; // Chance of SC across the race
    }

    return { event: evt, weight };
  });

  const totalWeight = weightedEvents.reduce((sum, item) => sum + item.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const item of weightedEvents) {
    if (randomVal < item.weight) {
      return item.event;
    }
    randomVal -= item.weight;
  }

  return raceEvents[0];
}

export interface DecisionResult {
  nextState: RaceState;
  driverRadio: string;
  commentary: string;
  penaltyOrBonusNote?: string;
}

export function processDecision(
  currentState: RaceState,
  decision: DecisionAction,
  newCompound: Compound | undefined,
  driverProfile: DriverProfile,
  upgrades: string[],
  raceEvents: RaceEvent[],
  gameConfig: GameConfig,
  currentEvent?: RaceEvent
): DecisionResult {
  const nextState: RaceState = { ...currentState };

  // Upgrades
  const hasPitCrew = upgrades.some((u) => u.toLowerCase().includes('pit crew'));
  const hasTireEng = upgrades.some((u) => u.toLowerCase().includes('tire') || u.toLowerCase().includes('pirelli'));
  const hasReliability = upgrades.some((u) => u.toLowerCase().includes('reliability'));

  let activeCompound = currentState.tire_compound;
  if (decision === 'Pit' && newCompound) {
    activeCompound = newCompound;
    nextState.tire_compound = newCompound;
  }

  // Base Compound Attributes
  let wearRate = 1.0;
  if (activeCompound === 'Soft') wearRate = 1.6;
  else if (activeCompound === 'Hard') wearRate = 0.7;
  else if (activeCompound === 'Intermediate') wearRate = 1.2;
  else if (activeCompound === 'Wet') wearRate = 1.0;

  if (hasTireEng) {
    wearRate *= 0.8; // 20% wear reduction
  }

  // Driver Tire Management stat modifier
  const driverTireMod = 1.5 - (driverProfile.tire_management || 70) / 100.0;
  wearRate *= driverTireMod;

  // INTERLINK: Low Driver Confidence causes lockups, increasing wear
  if (currentState.driver_confidence < 50) {
    wearRate *= gameConfig.mechanics.confidenceWearMultiplier;
  }

  const dampness = nextState.track_dampness;
  const isSlick = ['Soft', 'Medium', 'Hard'].includes(activeCompound);

  let penaltyOrBonusNote: string | undefined;

  // INTERLINK: Damp track on slicks drains driver confidence rapidly
  if (dampness > 15 && isSlick) {
    nextState.driver_confidence = Math.max(0, nextState.driver_confidence - 15);
  }

  // Wet track on slicks physics
  if (dampness > 30 && isSlick) {
    const wetPenalty = (dampness - 30) * 0.2;
    nextState.gap_ahead += wetPenalty;
    nextState.reliability = Math.max(0, nextState.reliability - (Math.floor(Math.random() * 8) + 6));
  } else if (dampness < 20 && !isSlick) {
    // Wet tires on dry asphalt disintegrate rapidly
    wearRate *= 3.0;
    nextState.gap_ahead += (20 - dampness) * 0.15;
  }

  // Process Action Execution
  if (decision === 'Push') {
    const wear = (Math.floor(Math.random() * 11) + 12) * wearRate;
    nextState.tire_health = Math.max(0, nextState.tire_health - Math.round(wear));

    const agg = driverProfile.aggression || 70;
    const conf = nextState.driver_confidence || 70;
    const successChance = (agg + conf) / 2;

    if (Math.random() * 100 < successChance) {
      nextState.position = Math.max(1, nextState.position - 1);
      nextState.gap_ahead = +(Math.random() * 1.5 + 0.6).toFixed(1);
    } else {
      nextState.gap_ahead += +(Math.random() * 0.8 + 0.5).toFixed(1);
    }

    let fuelBurn = Math.random() * 1.5 + 3.5;
    if (currentState.driver_confidence < 50) fuelBurn *= 1.15; // Erratic driving uses more fuel
    nextState.fuel_load = Math.max(0, +(nextState.fuel_load - fuelBurn).toFixed(1));

    let ersDrain = Math.floor(Math.random() * 15) + 20;
    // INTERLINK: Low reliability causes MGU-K clipping, draining ERS faster
    if (currentState.reliability < 45) ersDrain = Math.floor(ersDrain * gameConfig.mechanics.reliabilityErsMultiplier);
    nextState.ers_percent = Math.max(0, nextState.ers_percent - ersDrain);
    
    nextState.risk_efficiency += 12;

    // INTERLINK: Pushing on dead tires causes extreme vibrations, destroying reliability
    if (currentState.tire_health < 35) {
      nextState.reliability = Math.max(0, nextState.reliability - (Math.floor(Math.random() * 10) + 8));
      nextState.resource_management = Math.max(0, nextState.resource_management - 15);
    }

    // Check for Fastest Lap Opportunity: Softs + Low Fuel + Pushing
    if (activeCompound === 'Soft' && nextState.fuel_load < 35 && nextState.tire_health > 45) {
      nextState.fastest_lap_bonus = 50;
      penaltyOrBonusNote = '🟣 FASTEST LAP! Pushed to the limit on low fuel Softs (+50 pts)';
    }
  } else if (decision === 'Save Tires') {
    const wear = (Math.floor(Math.random() * 5) + 3) * wearRate;
    nextState.tire_health = Math.max(0, nextState.tire_health - Math.round(wear));
    nextState.gap_ahead += +(Math.random() * 1.0 + 0.8).toFixed(1);
    nextState.fuel_load = Math.max(0, +(nextState.fuel_load - (Math.random() * 0.8 + 1.2)).toFixed(1));
    
    let ersGain = Math.floor(Math.random() * 15) + 20;
    // INTERLINK: Low reliability reduces harvesting efficiency
    if (currentState.reliability < 45) ersGain = Math.floor(ersGain * 0.6);
    nextState.ers_percent = Math.min(100, nextState.ers_percent + ersGain);
    
    nextState.resource_management += 15;
    // Saving tires helps rebuild confidence slightly
    nextState.driver_confidence = Math.min(100, nextState.driver_confidence + 5);
  } else if (decision === 'Pit') {
    nextState.tire_health = 100;
    nextState.tire_age = 0;
    nextState.pit_stops += 1;
    nextState.resource_management += 10;

    const pitLoss = hasPitCrew ? gameConfig.mechanics.pitLossUpgraded : gameConfig.mechanics.pitLossNormal;
    nextState.gap_ahead += pitLoss;

    // Crossover Genius or Disaster Check
    if (dampness > 28 && ['Intermediate', 'Wet'].includes(activeCompound)) {
      nextState.strategy_bonus += gameConfig.bonuses.perfectCrossover;
      penaltyOrBonusNote = `🌟 MASTERCLASS STRATEGY! Boxed for wet rubber at the exact crossover window (+${gameConfig.bonuses.perfectCrossover} pts)`;
    } else if (currentState.tire_health < 30) {
      nextState.strategy_bonus += gameConfig.bonuses.timelyPit;
      penaltyOrBonusNote = `🔧 TIMELY STOP! Boxed right as tires reached the cliff (+${gameConfig.bonuses.timelyPit} pts)`;
    } else if (dampness < 18 && ['Intermediate', 'Wet'].includes(activeCompound)) {
      nextState.strategy_bonus += gameConfig.penalties.wrongTireWeather;
      penaltyOrBonusNote = `⚠️ STRATEGY BLUNDER! Pitted for wet tires on dry asphalt (${gameConfig.penalties.wrongTireWeather} pts)`;
    }
  } else if (decision === 'Defend') {
    const wear = (Math.floor(Math.random() * 7) + 8) * wearRate;
    nextState.tire_health = Math.max(0, nextState.tire_health - Math.round(wear));
    nextState.gap_behind = Math.max(0.6, +(nextState.gap_behind + (Math.random() * 1.2 + 0.6)).toFixed(1));
    
    let ersDrain = Math.floor(Math.random() * 10) + 12;
    if (currentState.reliability < 45) ersDrain = Math.floor(ersDrain * gameConfig.mechanics.reliabilityErsMultiplier);
    nextState.ers_percent = Math.max(0, nextState.ers_percent - ersDrain);
    
    nextState.risk_efficiency += 6;
  }

  // Tire Cliff Penalties (<30%)
  if (nextState.tire_health < 30) {
    const cliffPenalty = (30 - nextState.tire_health) * 0.25;
    nextState.gap_ahead += cliffPenalty;
  }

  // --- CRITICAL F1 SPORTING & TECHNICAL REGULATIONS PENALTIES ---

  // 1. CRITICAL TIRES (<25% health)
  if (currentState.tire_health < 25) {
    if (decision === 'Push') {
      if (Math.random() * 100 < 60) {
        nextState.reliability = 0;
        nextState.driver_confidence = 0;
        nextState.status = 'DNF - Tire Blowout';
        nextState.strategy_bonus += gameConfig.penalties.tireBlowout;
        penaltyOrBonusNote = `🚨 TERMINAL BLOWOUT DNF! High-speed tire delamination from pushing on dead tires (${gameConfig.penalties.tireBlowout} pts)`;
      }
    } else if (decision === 'Defend') {
      if (Math.random() * 100 < 30) {
        nextState.reliability = Math.max(0, nextState.reliability - 40);
        nextState.gap_ahead += 14.0;
        nextState.resource_management -= 20;
        penaltyOrBonusNote = `⚠️ Minor puncture incurred while defending on worn tires (+14s lost)`;
      }
    }
  }

  // 2. WET TRACK ON SLICKS (>30% dampness on dry slicks)
  if (dampness > 30 && isSlick) {
    if (decision === 'Push' || decision === 'Defend') {
      if (Math.random() * 100 < 65) {
        nextState.reliability = 0;
        nextState.status = 'DNF - Crash in Wet';
        nextState.driver_confidence = 10;
        nextState.resource_management -= 50;
        nextState.strategy_bonus += gameConfig.penalties.crashDnf;
        penaltyOrBonusNote = `💥 CRASH DNF! Aquaplaned into the barrier at Turn 4 on slick tires in the wet (${gameConfig.penalties.crashDnf} pts)`;
      }
    }
  }

  // 3. CRITICAL FUEL (<8.0 kg)
  if (currentState.fuel_load < 8.0) {
    if (decision === 'Push' || decision === 'Defend') {
      if (nextState.fuel_load <= 0.0) {
        nextState.reliability = 0;
        nextState.status = 'DSQ - Out of Fuel';
        nextState.strategy_bonus += gameConfig.penalties.fuelDsq;
        penaltyOrBonusNote = `⛔ DISQUALIFIED! Car stopped on track with empty fuel tank (FIA Technical Reg 6.6.2) (${gameConfig.penalties.fuelDsq} pts)`;
      }
    }
  }

  // 4. CRITICAL RELIABILITY (<25%)
  if (currentState.reliability < 25) {
    if (decision === 'Push') {
      if (Math.random() * 100 < 70) {
        nextState.reliability = 0;
        nextState.status = 'DNF - Engine Failure';
        nextState.strategy_bonus += gameConfig.penalties.engineBlowout;
        penaltyOrBonusNote = `🔥 ENGINE BLOWOUT DNF! Terminal Power Unit explosion from pushing with overheating hydraulics (${gameConfig.penalties.engineBlowout} pts)`;
      }
    }
  }

  // Apply hidden scenario impact
  if (currentEvent && currentEvent.hidden_impact) {
    nextState.strategy_bonus += currentEvent.hidden_impact;
  }

  // Natural Reliability Decay
  let relDecay = Math.floor(Math.random() * 3) + 1;
  if (hasReliability) relDecay = Math.round(relDecay * 0.5);
  nextState.reliability = Math.max(0, nextState.reliability - relDecay);

  // Weather dynamics progression
  if (dampness > 0) {
    nextState.track_dampness = Math.max(0, Math.min(100, dampness + Math.floor(Math.random() * 36) - 15));
  } else {
    // 15% chance for weather front to hit
    if (Math.random() < 0.15) {
      nextState.track_dampness = Math.floor(Math.random() * 25) + 10;
    }
  }

  // Lap progression (progresses 4 to 7 laps per strategic window)
  const lapsAdded = Math.floor(Math.random() * 4) + 4;
  nextState.lap = Math.min(60, nextState.lap + lapsAdded);
  nextState.tire_age += lapsAdded;

  if (nextState.lap >= 60 && nextState.reliability > 0 && nextState.fuel_load > 0) {
    nextState.status = 'Finished';
  }

  // Generate radio and commentary
  const driverRadio = generateDriverRadio(nextState);
  const commentary = generateCommentary(nextState, decision);

  return {
    nextState,
    driverRadio,
    commentary,
    penaltyOrBonusNote,
  };
}

export function generateDriverRadio(state: RaceState): string {
  if (state.status.startsWith('DNF') || state.status.startsWith('DSQ')) {
    if (state.status === 'DSQ - Out of Fuel') {
      return 'Engine cut out! I am completely out of fuel. Stopping on the straight...';
    }
    if (state.status === 'DNF - Tire Blowout') {
      return 'REAR TIRE BLEW OUT at 300km/h! I have hit the wall, suspension is gone. It is over.';
    }
    if (state.status === 'DNF - Crash in Wet') {
      return 'I have lost the rear on the curbs! Total aquaplaning... I am stuck in the gravel barrier!';
    }
    return 'Smoke in the cockpit! Loss of power unit drive. I am parking next to the marshal post.';
  }

  const tire = state.tire_health;
  const damp = state.track_dampness;
  const rel = state.reliability;
  const gap = state.gap_ahead;

  if (tire < 20) {
    return 'I am driving on the steel canvas! Box, box, box! I have zero traction on throttle!';
  }
  if (tire < 35) {
    return 'Rear tires are overheating like crazy. Rear axle is sliding in every medium corner.';
  }
  if (damp > 38 && ['Soft', 'Medium', 'Hard'].includes(state.tire_compound)) {
    return 'It is way too wet for slicks! I can barely hold the car in a straight line! We need Inters!';
  }
  if (damp > 20 && damp <= 38) {
    return 'Rain drops on my visor. Grip is dropping in Sector 2, let me know the crossover!';
  }
  if (rel < 30) {
    return 'Dashboard warning lights are flashing! Hydraulic pressure alarm, check telemetry!';
  }
  if (gap < 1.0) {
    return 'I am in his slipstream with DRS open! Give me full battery deploy, I am going for the move!';
  }

  const defaultMessages = [
    'Tires feeling responsive. Pace is steady, keeping to the target delta.',
    'Balance feels solid through the fast sweepers. Let me know when the pit window opens.',
    'Understood the delta time. Managing fuel lift-and-coast into Turn 1.',
    'Car is hooked up nicely. We have clean air ahead.',
  ];

  return defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
}

export function generateCommentary(state: RaceState, decision: DecisionAction): string {
  const damp = state.track_dampness;
  const tire = state.tire_health;

  if (decision === 'Pit') {
    if (damp > 28) {
      return 'A defining pit stop call as rain blankets the circuit! This crossover timing could decide the race winner.';
    }
    if (tire < 30) {
      return 'Strategic box call executed right as the tires hit the cliff! Fresh rubber will unlock seconds per lap.';
    }
    return 'The pit crew is ready. Clean tire swap executed. Returning to the track with optimal track position.';
  }
  if (decision === 'Push') {
    if (tire < 35) {
      return 'High-stakes gamble! Pushing on blistered tires... the strategist is walking a razor-thin line with puncture risk.';
    }
    return 'Engine map turned to maximum attack! ERS deployment active as they hunt down the car ahead.';
  }
  if (decision === 'Save Tires') {
    return 'Masterful tire conservation. Managing the delta and saving power unit lifecycle for the final sprint.';
  }
  if (decision === 'Defend') {
    return 'Steely defense into the heavy braking zone! Positioning the car squarely on the racing line.';
  }
  return 'Tactical standoff on the pit wall timing screens.';
}
