import { Compound, DecisionAction, DriverProfile, RaceEvent, RaceState, GameConfig, ActionConsequence } from '../types';

export function createInitialRaceState(): RaceState {
  return {
    lap: 1,
    totalLaps: 60,
    position: Math.floor(Math.random() * 10) + 5, // P5 to P14 starting grid
    tire_health: 100,
    tire_compound: 'Medium',
    tire_age: 0,
    ers_percent: 100,
    strategy_score: 50,
    pit_stops: 0,
    safety_cars: 0,
    status: 'Racing',
  };
}

export function getLogicalEvent(state: RaceState, raceEvents: RaceEvent[]): RaceEvent {
  // Find all events whose conditions are met
  let possibleEvents = raceEvents.filter(e => e.conditions(state));
  
  if (possibleEvents.length === 0) {
    // Fallback to the standard cruise event
    return raceEvents.find(e => e.id === 6) || raceEvents[0];
  }

  // Pick a random event from the possible ones (could be further prioritized by weight or urgency)
  return possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
}

export function processDecision(
  state: RaceState,
  action: DecisionAction,
  compound: Compound,
  event: RaceEvent,
  driver: DriverProfile,
  config: GameConfig
): { nextState: RaceState; consequence: ActionConsequence } {
  
  let nextState = { ...state };
  
  // Apply the explicitly mapped consequence from the event
  const consequence = event.actions[action];

  nextState.tire_health = Math.max(0, Math.min(100, nextState.tire_health + consequence.tire_health_change));
  nextState.ers_percent = Math.max(0, Math.min(100, nextState.ers_percent + consequence.ers_percent_change));
  
  // Position change (negative means moving UP the grid toward P1)
  nextState.position = Math.max(1, Math.min(20, nextState.position + consequence.position_change));
  
  nextState.strategy_score = Math.max(0, nextState.strategy_score + consequence.strategy_score_change);

  if (action === 'Pit') {
    nextState.tire_health = 100;
    nextState.tire_compound = compound;
    nextState.tire_age = 0;
    nextState.pit_stops += 1;
  } else {
    nextState.tire_age += 6; // Advancing 6 laps
  }

  if (event.event_type === 'Safety Car') {
    nextState.safety_cars += 1;
  }

  // Advance the race by 6 laps per decision to create 10 total scenarios
  nextState.lap += 6;
  if (nextState.lap > nextState.totalLaps) {
    nextState.lap = nextState.totalLaps;
    nextState.status = 'Finished';
  }

  return { nextState, consequence };
}
