export type AppPhase = 'landing' | 'registration' | 'quiz' | 'upgrades' | 'race' | 'debrief' | 'leaderboard' | 'spectator';
export type DecisionAction = 'Push' | 'Save Battery' | 'Defend' | 'Pit';
export type Compound = 'Soft' | 'Medium' | 'Hard' | 'Intermediate' | 'Wet';

export interface DriverProfile {
  driver_id: string;
  name: string;
  team: string;
  base_pace: number;
  tire_management: number;
  aggression: number;
  experience: number;
  adaptability: number;
}

export interface ParticipantRecord {
  team_id: string;
  principal_name: string;
  team_name: string;
  driver_profile: DriverProfile;
  upgrades: string[];
  race_position: number;
  status: string;
  strategy_score: number;
  total_score: number;
  score_breakdown?: ScoreBreakdown;
  decisions_count: number;
  current_lap: number;
  updated_at?: string;
}

export interface ScoreBreakdown {
  race_result: number;
  strategy_accuracy: number;
  tire_management?: number;
  fuel_ers_efficiency?: number;
  car_preservation?: number;
  driver_confidence?: number;
  fastest_lap_bonus?: number;
  total_score: number;
  rank_grade: string;
}

export interface ActionConsequence {
  tire_health_change: number;
  ers_percent_change: number;
  position_change: number;
  strategy_score_change: number;
  driver_radio: string;
  commentary: string;
  penalty_bonus_note?: string;
}

export interface RaceEvent {
  id: number;
  event_type: string;
  lap: number;
  title: string;
  description: string;
  conditions: (state: RaceState) => boolean;
  actions: Record<DecisionAction, ActionConsequence>;
}

export interface RaceState {
  lap: number;
  totalLaps: number;
  position: number;
  tire_health: number;
  tire_compound: Compound;
  tire_age: number;
  ers_percent: number;
  strategy_score: number;
  pit_stops: number;
  safety_cars: number;
  status: 'Racing' | 'Finished' | 'DNF';
}

export interface DecisionLog {
  lap: number;
  event_title: string;
  action: DecisionAction;
  compound: Compound;
  consequence: string;
  impactScore?: number;
  pointsGained?: number;
}

export interface UpgradePackage {
  id: string;
  name: string;
  description: string;
  cost: number;
  effects: {
    pace?: number;
    tire_wear?: number;
    ers_efficiency?: number;
    reliability?: number;
  };
}

export interface GameConfig {
  max_laps: number;
  weather_volatility: number;
  safety_car_prob: number;
}
