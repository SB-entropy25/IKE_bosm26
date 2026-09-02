export type Compound = 'Soft' | 'Medium' | 'Hard' | 'Intermediate' | 'Wet';

export type DecisionAction = 'Push' | 'Save Tires' | 'Defend' | 'Pit';

export interface DriverProfile {
  driver_id: string;
  aggression: number;
  risk_appetite: number;
  data_reliance: number;
  tire_management: number;
  adaptability: number;
}

export interface UpgradePackage {
  id: string;
  name: string;
  cost: number;
  description: string;
  benefit: string;
  tag: string;
}

export interface RaceEvent {
  event_id: string;
  event_type: 'Safety Car' | 'Weather Shift' | 'Tire Wear' | 'Track Position' | 'Subsystem Issue' | 'Driver State';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  short_desc: string;
  description: string;
  hidden_impact: number;
  possible_actions: DecisionAction[];
  expected_consequences: string;
}

export interface DecisionLog {
  lap: number;
  event: string;
  short_desc: string;
  decision: DecisionAction;
  compound: Compound;
  tireHealth: number;
  position: number;
  gapAhead: number;
  gapBehind: number;
  commentary: string;
  driverRadio: string;
  impactScore: number;
}

export interface RaceState {
  lap: number;
  totalLaps: number;
  position: number;
  tire_health: number;
  tire_compound: Compound;
  tire_age: number;
  track_dampness: number;
  fuel_load: number;
  ers_percent: number;
  gap_ahead: number;
  gap_behind: number;
  reliability: number;
  driver_confidence: number;
  pit_stops: number;
  risk_efficiency: number;
  resource_management: number;
  prediction_accuracy: number;
  strategy_bonus: number;
  fastest_lap_bonus: number;
  status: 'Racing' | 'Finished' | 'DNF - Tire Blowout' | 'DNF - Crash in Wet' | 'DNF - Engine Failure' | 'DSQ - Out of Fuel';
}

export interface ScoreBreakdown {
  race_result: number;
  strategy_accuracy: number;
  tire_management: number;
  fuel_ers_efficiency: number;
  car_preservation: number;
  driver_confidence: number;
  fastest_lap_bonus: number;
  total_score: number;
  rank_grade: string;
}

export interface ParticipantRecord {
  id?: string;
  team_id: string;
  principal_name: string;
  team_name: string;
  driver_profile: DriverProfile;
  upgrades: string[];
  race_position: number;
  status: string;
  strategy_score: number;
  total_score: number;
  score_breakdown: ScoreBreakdown;
  decisions_count: number;
  current_lap: number;
  updated_at: string;
  created_at?: string;
}

export type AppPhase = 'registration' | 'quiz' | 'upgrades' | 'race' | 'debrief' | 'leaderboard' | 'spectator';

export interface GameConfig {
  theme: {
    title: string;
    primaryColor: string;
  };
  penalties: {
    crashDnf: number;
    fuelDsq: number;
    engineBlowout: number;
    tireBlowout: number;
    wrongTireWeather: number;
    minorPuncture: number;
  };
  bonuses: {
    fastestLap: number;
    perfectCrossover: number;
    timelyPit: number;
  };
  mechanics: {
    pitLossNormal: number;
    pitLossUpgraded: number;
    confidenceWearMultiplier: number;
    reliabilityErsMultiplier: number;
  };
}
