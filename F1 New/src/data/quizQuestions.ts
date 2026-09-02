import type { DriverProfile } from '../types';

export interface QuizQuestion {
  id: number;
  question: string;
  category: string;
  categoryIcon: string;
  options: {
    text: string;
    description: string;
    score: number; // 1-4 scale: 1 = strategic elite, 4 = impulsive/wrong
  }[];
}

// ============================================================
// QUIZ QUESTIONS — deeply interlinked with physics engine
// Each answer maps to score 1-4, which feeds calculateDriverProfile()
// to produce real Aggression, Tire Management, Data Reliance stats
// that directly change race physics multipliers.
// ============================================================

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    category: 'Tire Strategy & Thermal Management',
    categoryIcon: '🛞',
    question: 'Lap 18. Your front-left tire temperature is 118°C — well above operating window — causing understeer on corner entry. The car behind is 1.8s back. What do you tell your driver?',
    options: [
      {
        text: 'Back off 3% at the apex and shift brake bias slightly rearward to balance heat.',
        description: 'Precise thermal management. Drops front temps without losing significant lap time.',
        score: 1,
      },
      {
        text: 'Lift-and-coast into the braking zone to cool the fronts.',
        description: 'Reduces tire temp but gives back gap to the car chasing. Acceptable tactical compromise.',
        score: 2,
      },
      {
        text: 'Keep pushing — a 1.8s gap is enough buffer to get the tires working.',
        description: 'Ignoring thermal data leads to blistering. High-wear drivers cause cascading mechanical failures.',
        score: 3,
      },
      {
        text: 'Box immediately for a new set of Mediums.',
        description: 'Panic stop for a manageable thermal issue. Destroys undercut window and costs 22 seconds.',
        score: 4,
      },
    ],
  },
  {
    id: 2,
    category: 'ERS Deployment & Energy Recovery',
    categoryIcon: '⚡',
    question: 'Lap 42. You are 0.8s behind the car ahead with DRS. Your battery is at 18% — below the safe deployment threshold. What is your call?',
    options: [
      {
        text: 'Harvest aggressively through Sector 2 braking zones to rebuild battery to 60%, then attack next lap.',
        description: 'Patient energy management. Guarantees a full battery deployment for a clean move on the next attempt.',
        score: 1,
      },
      {
        text: 'Deploy what remains of the battery now and use slipstream to close the gap.',
        description: 'Calculated gamble — uses the aero tow to compensate for low battery. May work if tires are fresh.',
        score: 2,
      },
      {
        text: 'Full attack mode. Deploy everything and overtake at Turn 1.',
        description: 'Drains the battery completely. Leaves you defenseless if the move fails and the car re-passes you.',
        score: 3,
      },
      {
        text: 'Demand the pit wall deploy "magic" engine modes to get more power.',
        description: 'Misunderstands how ERS works. Wastes radio time and breaks driver-engineer trust at a critical moment.',
        score: 4,
      },
    ],
  },
  {
    id: 3,
    category: 'Weather Crossover Decision',
    categoryIcon: '🌧️',
    question: 'Track dampness is at 22% and rising after light rain began. You are on Softs. Your rivals are staying out. The pit window for Intermediates is now open. What do you do?',
    options: [
      {
        text: 'Stay out one more lap. Get the driver to report grip levels corner-by-corner to confirm the crossover.',
        description: 'Uses the driver as a live sensor. Avoids premature compound change while gathering real data.',
        score: 1,
      },
      {
        text: 'Pit now for Intermediates to be safe — the track is getting slippery.',
        description: 'Conservative call. Gives up track position but removes crash risk. Can backfire if rain stops.',
        score: 2,
      },
      {
        text: 'Push hard on the Softs to gap the rivals before the rain gets worse.',
        description: 'Aggressive play on a slippery track. High confidence driver may pull it off, but crash risk rises sharply.',
        score: 3,
      },
      {
        text: 'Do nothing and wait for Race Control to issue a mandatory tire change.',
        description: 'Race Control does not issue mandatory changes for light rain. This is a fundamental misunderstanding of the rules.',
        score: 4,
      },
    ],
  },
  {
    id: 4,
    category: 'Undercut vs. Overcut',
    categoryIcon: '🔁',
    question: 'Lap 28. The car 1.5 seconds behind just pitted for fresh Hards. Your current Mediums are at 38% health. Pit lane loss is 22 seconds. What is your strategy?',
    options: [
      {
        text: 'Box this lap to cover the undercut. Accept a slightly longer final stint on Hards.',
        description: 'Standard reactive move. Protects track position at the cost of a longer push to the flag.',
        score: 2,
      },
      {
        text: 'Stay out 2-3 laps and push to build a gap large enough to cover the pit stop (Overcut).',
        description: 'Aggressive overcut. Requires tire health to hold long enough to open a 22+ second gap. High risk, high reward.',
        score: 1,
      },
      {
        text: 'Defend aggressively on track when they catch you on their fresh tires.',
        description: 'Defending on 38% worn Mediums against fresh Hards will fail. Increases tire and incident risk with no strategy.',
        score: 4,
      },
      {
        text: 'Switch to engine Save mode to extend the stint as long as possible.',
        description: 'Going slow on old tires while rivals have new rubber is a guaranteed position loss. Saving engine here is wrong.',
        score: 3,
      },
    ],
  },
  {
    id: 5,
    category: 'Mechanical Crisis Management',
    categoryIcon: '⚠️',
    question: 'Lap 50 of 60. A warning light shows hydraulic pressure dropping 1 bar per lap. Engineers say pushing at full power risks a terminal engine failure by Lap 53. You are P4.',
    options: [
      {
        text: 'Switch to a reduced engine map immediately. Accept 0.4s per lap slower to bring the car home.',
        description: 'Disciplined mechanical sympathy. Secures P4 points and protects the power unit for the next race.',
        score: 1,
      },
      {
        text: 'Ask engineers for exact delta targets — push right up to the failure threshold without crossing it.',
        description: 'Analytical and precise. Maximises pace within the mechanical constraints. Requires excellent engineer communication.',
        score: 2,
      },
      {
        text: 'Push flat out for 2 more laps to attack P3, then back off.',
        description: 'Rolls the dice on mechanical failure for a position gain. Engine failure ends the race entirely.',
        score: 3,
      },
      {
        text: 'Ignore the engineers. Racing drivers do not retire cars.',
        description: 'Zero mechanical sympathy. Guaranteed terminal DNF. Costs the team both the points and an expensive power unit.',
        score: 4,
      },
    ],
  },
];

// ============================================================
// DRIVER PROFILE CALCULATOR
// Maps quiz answers to driver stats that feed the simulation engine.
// Score 1 = most strategic, Score 4 = most reckless/wrong.
//
// Physics Engine Connections:
//   aggression       → Push success probability, overtake chance
//   risk_appetite    → DNF probability multiplier on dangerous decisions
//   data_reliance    → Modifier for wet crossover timing accuracy
//   tire_management  → wearRate multiplier (lower = better)
//   adaptability     → Confidence recovery rate after incidents
// ============================================================
export function calculateDriverProfile(answers: number[]): DriverProfile {
  const a1 = answers[0] || 2; // Thermal management → tire_management
  const a2 = answers[1] || 2; // ERS → data_reliance
  const a3 = answers[2] || 2; // Weather crossover → adaptability
  const a4 = answers[3] || 2; // Undercut/Overcut → risk_appetite
  const a5 = answers[4] || 2; // Crisis management → aggression control

  // Tire Management: Q1 (thermal) + Q3 (weather reading) — lower score = better tire care
  const tire_management = Math.min(99, Math.max(35,
    100 - ((a1 - 1) * 18) - ((a3 - 1) * 10)
  ));

  // Aggression: Q4 (undercut/overcut aggressiveness) + Q5 (crisis response)
  // High aggression = high overtake chance but higher crash/blowout risk
  const aggression = Math.min(99, Math.max(35,
    35 + (a4 * 14) + (a5 * 8)
  ));

  // Risk Appetite: Q4 (overcut gamble) + Q2 (ERS gamble) — affects DNF probability
  const risk_appetite = Math.min(99, Math.max(35,
    30 + (a4 * 12) + (a2 * 10)
  ));

  // Data Reliance: Q2 (ERS patience) + Q1 (thermal analysis) — inverted: lower score = higher data trust
  const data_reliance = Math.min(99, Math.max(35,
    100 - ((a2 - 1) * 20) - ((a1 - 1) * 8)
  ));

  // Adaptability: Q3 (weather reading) + Q5 (crisis response) — affects Confidence recovery
  const adaptability = Math.min(99, Math.max(35,
    100 - ((a3 - 1) * 18) - ((a5 - 1) * 10)
  ));

  const idSuffix = Math.floor(10 + Math.random() * 90);
  return {
    driver_id: `SL-${idSuffix}`,
    aggression,
    risk_appetite,
    data_reliance,
    tire_management,
    adaptability,
  };
}
