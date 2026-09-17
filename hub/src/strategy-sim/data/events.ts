import { RaceEvent, RaceState } from '../types';

export const RACE_EVENTS: RaceEvent[] = [
  {
    id: 1,
    event_type: 'Early Jockeying',
    lap: 5,
    title: 'Lap 1 Chaos',
    description: 'The pack is bunched up tight. The driver behind has DRS and is attacking hard.',
    conditions: (state) => state.lap < 10,
    actions: {
      'Push': { tire_health_change: -15, ers_percent_change: -20, position_change: 0, strategy_score_change: 10, driver_radio: 'Copy, pushing to break the tow.', commentary: 'Driver uses battery to defend the position successfully.', penalty_bonus_note: '' },
      'Save Battery': { tire_health_change: -5, ers_percent_change: +10, position_change: +1, strategy_score_change: -10, driver_radio: 'Lifting and coasting...', commentary: 'Lost a place by saving battery too early in the fight.', penalty_bonus_note: 'PENALTY: Yielded track position without a fight.' },
      'Defend': { tire_health_change: -10, ers_percent_change: -10, position_change: 0, strategy_score_change: 25, driver_radio: 'Closing the door on the inside.', commentary: 'Textbook defense holds off the attack!', penalty_bonus_note: 'MASTERCLASS: Defended position under heavy pressure.' },
      'Pit': { tire_health_change: 100, ers_percent_change: 0, position_change: +15, strategy_score_change: -50, driver_radio: 'Box box.', commentary: 'Inexplicable early pit stop drops them to the back of the grid.', penalty_bonus_note: 'PENALTY: Terrible strategic call.' }
    }
  },
  {
    id: 2,
    event_type: 'Tire Wear',
    lap: 20,
    title: 'Tire Cliff Approaching',
    description: 'Tires are dropping off the cliff. Grip is completely gone.',
    conditions: (state) => state.tire_health < 35 && state.lap > 10,
    actions: {
      'Push': { tire_health_change: -25, ers_percent_change: -10, position_change: +3, strategy_score_change: -50, driver_radio: 'I have no grip! I am sliding everywhere!', commentary: 'A disastrous attempt to push on dead tires.', penalty_bonus_note: 'PENALTY: Massive time loss pushing on dead rubber.' },
      'Save Battery': { tire_health_change: -5, ers_percent_change: +20, position_change: +2, strategy_score_change: -10, driver_radio: 'Car is undriveable.', commentary: 'Lifting and coasting while sliding out of the corners.', penalty_bonus_note: '' },
      'Defend': { tire_health_change: -15, ers_percent_change: -10, position_change: +1, strategy_score_change: -20, driver_radio: 'I cannot hold them behind me.', commentary: 'Trying to defend but the tires have given up.', penalty_bonus_note: '' },
      'Pit': { tire_health_change: 100, ers_percent_change: 0, position_change: +2, strategy_score_change: 50, driver_radio: 'Box box, confirming new tires.', commentary: 'Perfectly timed pit stop right before the cliff.', penalty_bonus_note: 'MASTERCLASS: Pitted exactly as the tires gave out.' }
    }
  },
  {
    id: 3,
    event_type: 'Battery Issue',
    lap: 30,
    title: 'ERS Depletion',
    description: 'Battery charge is critically low. Deployment is failing on the straights.',
    conditions: (state) => state.ers_percent < 30,
    actions: {
      'Push': { tire_health_change: -15, ers_percent_change: -20, position_change: +2, strategy_score_change: -50, driver_radio: 'I have no deployment! We are clipping!', commentary: 'Attempting to push without battery results in heavy time loss.', penalty_bonus_note: 'PENALTY: Pushing with a dead battery.' },
      'Save Battery': { tire_health_change: -5, ers_percent_change: +40, position_change: +1, strategy_score_change: 50, driver_radio: 'Lifting and coasting, harvesting now.', commentary: 'Smart management. Recharging the pack for a later attack.', penalty_bonus_note: 'MASTERCLASS: Efficiently regenerated the ERS pack.' },
      'Defend': { tire_health_change: -10, ers_percent_change: -10, position_change: +1, strategy_score_change: -10, driver_radio: 'Defending but I have no straight line speed.', commentary: 'Easily overtaken on the straight due to no battery.', penalty_bonus_note: '' },
      'Pit': { tire_health_change: 100, ers_percent_change: 0, position_change: +10, strategy_score_change: -20, driver_radio: 'Box box.', commentary: 'Pitted, but the battery issue remains.', penalty_bonus_note: '' }
    }
  },
  {
    id: 4,
    event_type: 'Safety Car',
    lap: 40,
    title: 'Safety Car Deployed',
    description: 'A car has crashed in Sector 2! Safety Car is out, the pack is bunching up.',
    conditions: (state) => state.safety_cars < 2 && state.lap > 15,
    actions: {
      'Push': { tire_health_change: 0, ers_percent_change: 0, position_change: 0, strategy_score_change: -50, driver_radio: 'Delta negative! Delta negative!', commentary: 'Driver penalized for speeding under the Safety Car!', penalty_bonus_note: 'PENALTY: Speeding under Safety Car.' },
      'Save Battery': { tire_health_change: 0, ers_percent_change: +30, position_change: 0, strategy_score_change: 20, driver_radio: 'Delta positive. Harvesting.', commentary: 'Safely maintaining delta and recharging the battery.', penalty_bonus_note: '' },
      'Defend': { tire_health_change: 0, ers_percent_change: 0, position_change: 0, strategy_score_change: 0, driver_radio: 'Keeping temps up.', commentary: 'Weaving to keep heat in the tires.', penalty_bonus_note: '' },
      'Pit': { tire_health_change: 100, ers_percent_change: 0, position_change: 0, strategy_score_change: 80, driver_radio: 'Box box! Cheap pit stop!', commentary: 'Brilliant! Taking a cheap pit stop under the Safety Car.', penalty_bonus_note: 'MASTERCLASS: Capitalized on the Safety Car for a free pit stop!' }
    }
  },
  {
    id: 5,
    event_type: 'Track Position',
    lap: 55,
    title: 'Late Race Podiums',
    description: 'Final 5 laps! You are fighting for a podium position. The car ahead is struggling.',
    conditions: (state) => state.lap >= 50 && state.position <= 5,
    actions: {
      'Push': { tire_health_change: -25, ers_percent_change: -30, position_change: -1, strategy_score_change: 50, driver_radio: 'Mode push! I am going for it!', commentary: 'Incredible overtake for the podium position!', penalty_bonus_note: 'MASTERCLASS: Phenomenal late race overtake!' },
      'Save Battery': { tire_health_change: -5, ers_percent_change: +10, position_change: +1, strategy_score_change: -30, driver_radio: 'I cannot catch them.', commentary: 'Settling for position. A missed opportunity.', penalty_bonus_note: 'PENALTY: Too conservative when a podium was on the table.' },
      'Defend': { tire_health_change: -10, ers_percent_change: -20, position_change: 0, strategy_score_change: 10, driver_radio: 'Watching my mirrors.', commentary: 'Secured the position from behind, but missed the attack ahead.', penalty_bonus_note: '' },
      'Pit': { tire_health_change: 100, ers_percent_change: 0, position_change: +5, strategy_score_change: -80, driver_radio: 'Box box.', commentary: 'Threw away a podium for a late pit stop!', penalty_bonus_note: 'PENALTY: Horrible late race pit stop call.' }
    }
  },
  {
    id: 6,
    event_type: 'Standard',
    lap: 25,
    title: 'Mid-Stint Cruise',
    description: 'The race has settled into a rhythm. Track is clear.',
    conditions: (state) => true,
    actions: {
      'Push': { tire_health_change: -15, ers_percent_change: -15, position_change: -1, strategy_score_change: 10, driver_radio: 'Setting personal bests.', commentary: 'Putting in quick laps to close the gap.', penalty_bonus_note: '' },
      'Save Battery': { tire_health_change: -5, ers_percent_change: +25, position_change: +1, strategy_score_change: 15, driver_radio: 'Managing pace.', commentary: 'Smart resource management during a quiet phase.', penalty_bonus_note: '' },
      'Defend': { tire_health_change: -10, ers_percent_change: -10, position_change: 0, strategy_score_change: 0, driver_radio: 'Holding the gap.', commentary: 'Maintaining the current delta to the cars around.', penalty_bonus_note: '' },
      'Pit': { tire_health_change: 100, ers_percent_change: 0, position_change: +12, strategy_score_change: -10, driver_radio: 'Box box.', commentary: 'An early scheduled stop.', penalty_bonus_note: '' }
    }
  }
];
