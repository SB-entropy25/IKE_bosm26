import { RaceState, ScoreBreakdown } from '../types';

export function calculateScoreBreakdown(state: RaceState): ScoreBreakdown {
  const pos = state.position;
  const isFinished = state.status === 'Finished';

  // F1 Championship Points scale (Max 500 pts)
  const f1PointsMap: Record<number, number> = {
    1: 500, // P1 Winner
    2: 360, // P2
    3: 300, // P3
    4: 240, // P4
    5: 200, // P5
    6: 160, // P6
    7: 120, // P7
    8: 80,  // P8
    9: 40,  // P9
    10: 20, // P10
  };

  let raceResultScore = 0;
  if (isFinished) {
    raceResultScore = f1PointsMap[pos] !== undefined ? f1PointsMap[pos] : 10;
  }

  // Strategy accuracy based on decisions, upgrades, and penalties (Max 150 pts)
  const rawStrategy = 50 + state.strategy_bonus + Math.round(state.risk_efficiency * 0.8);
  const strategyScore = Math.max(0, Math.min(150, rawStrategy));

  // Tire preservation (Max 120 pts)
  const tireScore = isFinished ? Math.max(0, Math.min(120, Math.round(state.tire_health * 1.2))) : 0;

  // Fuel & energy efficiency (Max 100 pts)
  const fuelPct = state.fuel_load / 110.0;
  const ersPct = state.ers_percent / 100.0;
  const fuelErsScore = isFinished ? Math.max(0, Math.min(100, Math.round(fuelPct * 50 + ersPct * 50))) : 0;

  // Subsystem reliability preservation (Max 80 pts)
  const reliabilityScore = Math.max(0, Math.min(80, Math.round(state.reliability * 0.8)));

  // Driver confidence & synergy (Max 50 pts)
  const driverScore = Math.max(0, Math.min(50, Math.round(state.driver_confidence * 0.5)));

  // Fastest lap bonus (Max 50 pts)
  const fastestLapScore = isFinished ? (state.fastest_lap_bonus || 0) : 0;

  const totalScore = raceResultScore + strategyScore + tireScore + fuelErsScore + reliabilityScore + driverScore + fastestLapScore;

  let rankGrade = 'F (DNF / DSQ)';
  if (isFinished) {
    if (totalScore >= 850) rankGrade = 'S (Grand Prix Legend)';
    else if (totalScore >= 700) rankGrade = 'A (Master Strategist)';
    else if (totalScore >= 500) rankGrade = 'B (Solid Points Finish)';
    else if (totalScore >= 300) rankGrade = 'C (Midfield Scrapper)';
    else rankGrade = 'D (Backmarker)';
  }

  return {
    race_result: raceResultScore,
    strategy_accuracy: strategyScore,
    tire_management: tireScore,
    fuel_ers_efficiency: fuelErsScore,
    car_preservation: reliabilityScore,
    driver_confidence: driverScore,
    fastest_lap_bonus: fastestLapScore,
    total_score: totalScore,
    rank_grade: rankGrade,
  };
}
