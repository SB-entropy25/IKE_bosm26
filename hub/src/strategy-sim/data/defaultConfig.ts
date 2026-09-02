import { GameConfig } from '../types';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  theme: {
    title: "F1 STRATEGY QUEST",
    primaryColor: "cyan"
  },
  penalties: {
    crashDnf: -130,
    fuelDsq: -150,
    engineBlowout: -120,
    tireBlowout: -100,
    wrongTireWeather: -40,
    minorPuncture: -20
  },
  bonuses: {
    fastestLap: 50,
    perfectCrossover: 50,
    timelyPit: 25
  },
  mechanics: {
    pitLossNormal: 23.0,
    pitLossUpgraded: 18.5,
    confidenceWearMultiplier: 1.25,
    reliabilityErsMultiplier: 1.5
  }
};
