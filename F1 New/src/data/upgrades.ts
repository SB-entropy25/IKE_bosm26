import { UpgradePackage } from '../types';

export const UPGRADES: UpgradePackage[] = [
  {
    id: 'pit_crew',
    name: 'Elite Pit Crew',
    cost: 30,
    tag: 'Execution Speed',
    description: 'Sub-2.0s wheel gun synchronization and flawless traffic release drills.',
    benefit: 'Reduces pit lane stationary loss from 23.0s down to 18.5s (-4.5s saved per stop).',
  },
  {
    id: 'weather_center',
    name: 'Weather Doppler Radar',
    cost: 40,
    tag: 'Strategy Foresight',
    description: 'Micro-climate track sensor array providing 4-lap predictive rain intensity telemetry.',
    benefit: 'Displays incoming precipitation alerts and precision dampness countdowns.',
  },
  {
    id: 'ai_assistant',
    name: 'AI Pit Wall Strategist',
    cost: 50,
    tag: 'Decision Matrix',
    description: 'Real-time neural simulator processing 10,000 Monte Carlo race delta projections.',
    benefit: 'Provides live optimal decision recommendations directly on your telemetry dashboard.',
  },
  {
    id: 'reliability_pkg',
    name: 'Reliability & Cooling Package',
    cost: 35,
    tag: 'Car Longevity',
    description: 'Reinforced hydraulic seals, ceramic brake duct liners, and ICE thermal shielding.',
    benefit: 'Cuts chassis and subsystem degradation rate by 50%, preventing costly terminal DNFs.',
  },
  {
    id: 'tire_engineers',
    name: 'Pirelli Compound Specialists',
    cost: 45,
    tag: 'Tire Mastery',
    description: 'Dedicated trackside tire chemists optimizing surface camber and thermal wear curves.',
    benefit: 'Reduces tire degradation rate by 20% across all dry and wet tire compounds.',
  },
];
