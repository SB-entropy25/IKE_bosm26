import { RaceState, ScoreBreakdown } from '../types';

export function calculateScoreBreakdown(state: RaceState): ScoreBreakdown {
  const pos = state.position;
  const isFinished = state.status === 'Finished';

  // F1 Championship Points scale (Max 500 pts)
  const f1PointsMap: Record<number, number> = {
    1: 500, 2: 360, 3: 300, 4: 240, 5: 200, 
    6: 160, 7: 120, 8: 80, 9: 40, 10: 20,
  };

  let raceResultScore = 0;
  if (isFinished) {
    raceResultScore = f1PointsMap[pos] !== undefined ? f1PointsMap[pos] : 10;
  }

  // Strategy accuracy based directly on the running tally (Max 300 pts)
  const strategyScore = Math.max(0, Math.min(300, state.strategy_score));

  // Tire preservation (Max 100 pts)
  const tireScore = isFinished ? Math.max(0, Math.min(100, Math.round(state.tire_health))) : 0;

  // Battery efficiency (Max 100 pts)
  const ersPct = state.ers_percent / 100.0;
  const fuelErsScore = isFinished ? Math.max(0, Math.min(100, Math.round(ersPct * 100))) : 0;

  const totalScore = raceResultScore + strategyScore + tireScore + fuelErsScore;

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
    car_preservation: 0, // Unused but kept for type compat
    driver_confidence: 0, // Unused but kept for type compat
    fastest_lap_bonus: 0, // Unused but kept for type compat
    total_score: totalScore,
    rank_grade: rankGrade,
  };
}
