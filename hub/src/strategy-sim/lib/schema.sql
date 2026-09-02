-- ============================================================================
-- F1 STRATEGY QUEST 2.0 - SUPABASE POSTGRESQL SCHEMA
-- Copy and paste this into the Supabase SQL Editor and click 'RUN'.
-- ============================================================================

-- 1. Create table for participants & live telemetry
CREATE TABLE IF NOT EXISTS public.f1_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id TEXT UNIQUE NOT NULL,
    principal_name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    driver_profile JSONB DEFAULT '{}'::jsonb,
    upgrades JSONB DEFAULT '[]'::jsonb,
    race_position INT DEFAULT 20,
    status TEXT DEFAULT 'Racing',
    strategy_score INT DEFAULT 0,
    total_score INT DEFAULT 0,
    score_breakdown JSONB DEFAULT '{}'::jsonb,
    decisions_count INT DEFAULT 0,
    current_lap INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create index for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_f1_participants_total_score ON public.f1_participants(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_f1_participants_team_id ON public.f1_participants(team_id);

-- 3. Enable Row Level Security (RLS) and allow public read & upsert for live games
ALTER TABLE public.f1_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.f1_participants;
CREATE POLICY "Allow public read access"
ON public.f1_participants
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public upsert access" ON public.f1_participants;
CREATE POLICY "Allow public upsert access"
ON public.f1_participants
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Enable Supabase Realtime Replication for instant 70-candidate sync
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.f1_participants;

-- ============================================================================
-- GAME CONFIGURATION TABLES (Dynamic Hosting)
-- ============================================================================

-- 5. Quiz Questions Table
CREATE TABLE IF NOT EXISTS public.f1_quiz_questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    category TEXT NOT NULL,
    options JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.f1_quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to quiz" ON public.f1_quiz_questions;
CREATE POLICY "Allow public read access to quiz" ON public.f1_quiz_questions FOR SELECT TO anon, authenticated USING (true);

-- 6. Race Events Table (Strategy Scenarios)
CREATE TABLE IF NOT EXISTS public.f1_race_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    short_desc TEXT NOT NULL,
    description TEXT NOT NULL,
    hidden_impact INT NOT NULL DEFAULT 0,
    possible_actions JSONB NOT NULL DEFAULT '["Push", "Save Tires", "Defend", "Pit"]'::jsonb,
    expected_consequences TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.f1_race_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to events" ON public.f1_race_events;
CREATE POLICY "Allow public read access to events" ON public.f1_race_events FOR SELECT TO anon, authenticated USING (true);

-- 7. Upgrades Table
CREATE TABLE IF NOT EXISTS public.f1_upgrades (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cost INT NOT NULL,
    tag TEXT NOT NULL,
    description TEXT NOT NULL,
    benefit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.f1_upgrades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to upgrades" ON public.f1_upgrades;
CREATE POLICY "Allow public read access to upgrades" ON public.f1_upgrades FOR SELECT TO anon, authenticated USING (true);

-- 8. Game Config Table (Master Sheet for Scores and Themes)
CREATE TABLE IF NOT EXISTS public.f1_game_config (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.f1_game_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to config" ON public.f1_game_config;
CREATE POLICY "Allow public read access to config" ON public.f1_game_config FOR SELECT TO anon, authenticated USING (true);

-- ============================================================================
-- SEED DEFAULT DATA
-- Run these inserts to populate the initial game content
-- ============================================================================

-- Seed Game Config
INSERT INTO public.f1_game_config (id, settings) VALUES
(1, '{
  "theme": {
    "title": "F1 STRATEGY QUEST",
    "primaryColor": "cyan"
  },
  "penalties": {
    "crashDnf": -130,
    "fuelDsq": -150,
    "engineBlowout": -120,
    "tireBlowout": -100,
    "wrongTireWeather": -40,
    "minorPuncture": -20
  },
  "bonuses": {
    "fastestLap": 50,
    "perfectCrossover": 50,
    "timelyPit": 25
  },
  "mechanics": {
    "pitLossNormal": 23.0,
    "pitLossUpgraded": 18.5,
    "confidenceWearMultiplier": 1.25,
    "reliabilityErsMultiplier": 1.5
  }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings;

-- Seed Upgrades
INSERT INTO public.f1_upgrades (id, name, cost, tag, description, benefit) VALUES
('pit_crew', 'Elite Pit Crew', 30, 'Execution Speed', 'Sub-2.0s wheel gun synchronization and flawless traffic release drills.', 'Reduces pit lane stationary loss from 23.0s down to 18.5s (-4.5s saved per stop).'),
('weather_center', 'Weather Doppler Radar', 40, 'Strategy Foresight', 'Micro-climate track sensor array providing 4-lap predictive rain intensity telemetry.', 'Displays incoming precipitation alerts and precision dampness countdowns.'),
('ai_assistant', 'AI Pit Wall Strategist', 50, 'Decision Matrix', 'Real-time neural simulator processing 10,000 Monte Carlo race delta projections.', 'Provides live optimal decision recommendations directly on your telemetry dashboard.'),
('reliability_pkg', 'Reliability & Cooling Package', 35, 'Car Longevity', 'Reinforced hydraulic seals, ceramic brake duct liners, and ICE thermal shielding.', 'Cuts chassis and subsystem degradation rate by 50%, preventing costly terminal DNFs.'),
('tire_engineers', 'Pirelli Compound Specialists', 45, 'Tire Mastery', 'Dedicated trackside tire chemists optimizing surface camber and thermal wear curves.', 'Reduces tire degradation rate by 20% across all dry and wet tire compounds.')
ON CONFLICT DO NOTHING;

-- Seed Quiz Questions
INSERT INTO public.f1_quiz_questions (id, category, question, options) VALUES
(1, 'Thermal & Graining Phase', 'Telemetry indicates asymmetric surface temperatures: front-left is 115°C (overheated) while rear-right is 85°C (cold). The driver is experiencing mid-corner understeer followed by snap oversteer. What is the optimal driver adjustment?', '[{"text": "Shift brake bias 3% rearward and increase apex minimum speed.", "description": "Reduces front axle locking energy, transferring thermal load to the rears to equalize temps.", "score": 1}, {"text": "Execute severe lift-and-coast before corner entry.", "description": "Cools the front brakes but starves the rear axle of necessary acceleration energy.", "score": 2}, {"text": "Demand an immediate pit stop for compound swap.", "description": "Panic reaction to manageable graining phase, destroying strategy delta.", "score": 3}, {"text": "Attack the kerbs harder to artificially generate grip.", "description": "Maximum scrub angle will immediately blister the overheated front-left to the carcass.", "score": 4}]'),
(2, 'ERS Harvesting & Deployment', 'Trapped in a 4-car DRS train on Lap 42. The State of Charge (SOC) is dropping below 15% due to MGU-K clipping at the end of the straight. The car ahead is vulnerable into Turn 1. The driver should:', '[{"text": "Wait for the rival ahead to deploy first, then counter-attack using slipstream alone.", "description": "Highly tactical patience, saving electrical energy while using aerodynamic tow for the overtake.", "score": 1}, {"text": "Harvest heavily in Sector 2 to guarantee a 100% SOC deployment into Turn 1.", "description": "Calculated risk: drops back slightly to ensure maximum kinetic deployment for a guaranteed strike.", "score": 2}, {"text": "Offset line in dirty air to cool ICE, while keeping ERS mapped to neutral.", "description": "Maintains status quo but wastes a strategic overtaking window.", "score": 3}, {"text": "Demand full overtake button deployment on the next straight.", "description": "Depletes remaining SOC, leaving the car defenseless on the following lap if the move fails.", "score": 4}]'),
(3, 'Crossover Calculation (Wet to Dry)', 'Track dampness is at 18% and dropping rapidly. Intermediate tires are blistering heavily on the dry racing line, losing 1.5s per lap. The undercut window to P1 is 2 laps away. Your driver:', '[{"text": "Searches for wet patches offline to cool the Inters while closing the gap.", "description": "Masterful tire preservation, extending the stint until the crossover is mathematically perfect.", "score": 1}, {"text": "Radios in corner-by-corner grip levels to feed the Monte Carlo simulation.", "description": "Excellent data synthesis, acting as an organic track sensor for the strategy team.", "score": 2}, {"text": "Waits for the pit wall to confirm the exact crossover lap via Doppler radar.", "description": "Relies 100% on pit wall data, missing the opportunity for a driver-instigated tactical jump.", "score": 3}, {"text": "Dives into the pits immediately demanding Soft slicks.", "description": "Extreme gamble. If Turn 4 is still wet, they will spin and crash immediately.", "score": 4}]'),
(4, 'Undercut Defense & Track Position', 'The car 1.2s behind just boxed for fresh Hard tires on Lap 20. Your tires are 25% degraded. Pit lane loss is 22s. Do you react?', '[{"text": "Stay out and execute a 3-lap qualifying pace push (Overcut).", "description": "Requires supreme confidence in tire preservation to gap the rival while they warm up their Hards.", "score": 1}, {"text": "Box immediately to cover the undercut.", "description": "Standard conservative reaction, guarantees track position but forces a very long final stint.", "score": 2}, {"text": "Switch engine to Save mode and accept the position loss.", "description": "Plays the extreme long game, banking on a late Safety Car or massive tire delta at the end.", "score": 3}, {"text": "Defend aggressively on track when they catch up in 5 laps.", "description": "Strategically flawed; defending on 40-lap old tires against fresh Hards is a guaranteed loss.", "score": 4}]'),
(5, 'Crisis Management & Reliability', 'Critical alarm: Hydraulic pressure is dropping 1 bar per lap. Gear shifts are becoming erratic. Pushing hard will induce a terminal Power Unit failure within 3 laps.', '[{"text": "Switch to a fail-safe engine map, short-shift early, and surrender 0.5s per lap.", "description": "Disciplined mechanical preservation. Secures points by bringing a wounded car home.", "score": 1}, {"text": "Ask for specific delta targets to exactly balance wear vs speed.", "description": "Analytical approach, squeezing every drop of performance right up to the failure threshold.", "score": 2}, {"text": "Complain relentlessly on the radio, demanding engineers fix it remotely.", "description": "High frustration, losing focus on driving while waiting for a miracle.", "score": 3}, {"text": "Ignore the alarms: I am a racing driver, I will drive it until it blows!", "description": "Maximum aggression, zero mechanical sympathy. Guaranteed DNF.", "score": 4}]')
ON CONFLICT DO NOTHING;

-- Seed Race Events
INSERT INTO public.f1_race_events (event_id, event_type, severity, short_desc, description, hidden_impact, possible_actions, expected_consequences) VALUES
('EVT-WTH-01', 'Weather Shift', 'High', 'Rain Cell Approaching', 'The weather radar shows a patch of rain will hit part of the track in about 4 laps. It''s dry right now. Do you pit early for wet-weather tires before it arrives, or wait and see if it actually hits?', -10, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pitting too early for rain that doesn''t come costs you time for nothing. Waiting too long means you''re stuck on the wrong tires once the rain lands.'),
('EVT-WTH-02', 'Weather Shift', 'Critical', 'Track Getting Slippery Fast', 'Light rain is starting to fall and the track is getting slippery. You''re still on dry-weather tires, and the car has already twitched sideways twice in the last two laps.', -20, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing hard on dry tires in these conditions is how drivers lose the car completely. Pitting for wet tires is safer but costs track position if the rain turns out to be light and brief.'),
('EVT-WTH-03', 'Weather Shift', 'Medium', 'Track Drying Out Unevenly', 'Part of the track has dried up while another section is still wet. You''re on full wet tires, and cars on the in-between tire (intermediates) are noticeably faster on the dry parts.', -8, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Staying on wets too long once the track dries loses you time everywhere. Switching to intermediates too soon risks a slide if the still-wet section catches you out.'),
('EVT-WTH-04', 'Weather Shift', 'Low', 'Strong Crosswind on the Straight', 'A gusty crosswind is hitting the main straight, making the car feel unsettled under braking. No tire change is needed, but braking points keep shifting lap to lap.', -4, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing hard through the gusts risks a mistake under braking. Backing off slightly for a lap or two is the safer, low-cost choice here.'),
('EVT-SFC-01', 'Safety Car', 'High', 'Safety Car Comes Out', 'A crash brings out the Safety Car and the field bunches up. Pit stops are effectively free right now since everyone is going slow anyway. You''re running 3rd with tires that are about half worn.', 10, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'This is the classic cheap pit stop moment — swapping tires now costs you almost nothing in track position. Staying out and pushing behind the Safety Car gains you nothing and risks a penalty.'),
('EVT-SFC-02', 'Safety Car', 'Critical', 'Rivals Already Pitting Under Safety Car', 'Safety Car is out, and the two cars ahead of you have already ducked into the pits for fresh tires. Your tires are still decent, but the free pit-stop window is closing fast.', -12, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'If you don''t pit now, you''ll be the only one out there on old tires once racing resumes. Pitting locks in the cheap stop but means giving up any advantage from staying out longer.'),
('EVT-SFC-03', 'Safety Car', 'Medium', 'Restart Coming Up, Tires Have Gone Cold', 'The Safety Car is about to come in and racing will restart. Your tires have cooled down a lot from driving slowly behind it, and the car right behind you is known for aggressive restarts.', -6, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Attacking hard the moment the restart happens, before the tires warm back up, is a common way to lose grip and spin. Easing into it costs a little time but is much safer.'),
('EVT-SFC-04', 'Safety Car', 'High', 'Race Stopped, Field Reset', 'The race has been red-flagged after a big crash. Cars will line up again once it''s safe, and this effectively gives everyone a free chance to change tires with no time penalty.', 8, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'This is about as free as a tire change gets — pitting now costs you nothing in position. Not using this window means missing a rare free reset.'),
('EVT-TIR-01', 'Tire Wear', 'Medium', 'Front Tire Starting to Wear Unevenly', 'The front-left tire is showing early wear after a hard defensive move a couple of laps back. Grip is still fine for now, but the wear pattern isn''t even.', -5, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Backing off a bit now lets the tire even itself back out. Continuing to attack hard locks in the uneven wear and speeds up the tire''s decline later.'),
('EVT-TIR-02', 'Tire Wear', 'Critical', 'Rear Tire Close to Failing', 'The rear-left tire is badly worn and starting to blister after running in another car''s dirty air. You''re 1.2 seconds ahead of the car chasing you.', -20, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing on a tire this worn risks it failing outright, which would end your race. Pitting gives up the lead you''re protecting but takes the tire failure risk off the table.'),
('EVT-TIR-03', 'Tire Wear', 'High', 'Tire Wear Getting Dangerous', 'Tire wear has dropped to a level where the tire is close to its structural limit — the rubber is very thin. It''s still holding together, but only just.', -15, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Continuing to push a tire this worn risks it letting go suddenly, which can also damage the car. Pitting is really the only option that removes the risk.'),
('EVT-TIR-04', 'Tire Wear', 'Low', 'Riding the Kerbs Too Hard', 'Running over the kerbs aggressively at one corner over the last few laps has caused slightly uneven wear on the front tires. Nothing serious yet, but the car''s balance is starting to shift.', -3, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Keep attacking the kerbs and the uneven wear gets worse over time. Easing off there for a few laps lets things settle at very little cost.'),
('EVT-TIR-05', 'Tire Wear', 'Medium', 'Chance to Jump the Rival With a Pit Stop', 'The car ahead just posted a much slower lap, a sign their tires are falling off. Your tires still have some life left, and pitting now for fresh ones could let you jump ahead once they make their stop.', 6, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pitting now while your tires are still okay is a clean way to leapfrog a rival whose tires are fading. Waiting longer to push out more laps risks your own tires wearing too far down first.'),
('EVT-TIR-06', 'Tire Wear', 'High', 'Tires About to Fall Off a Cliff', 'Track temperature is high and your engineers warn the current tires are about to hit a steep drop in performance within the next lap or two.', -12, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing hard right before that drop makes it happen even faster. Backing off might buy you one more lap before you''re forced to pit anyway.'),
('EVT-SUB-01', 'Subsystem Issue', 'Critical', 'Hybrid System Overheating', 'A warning light shows the car''s hybrid power system is overheating and cutting back its own power to protect itself. The extra boost of speed it normally gives is becoming unreliable.', -18, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing hard adds more heat into a system that''s already struggling, making things worse. Easing off gives it a chance to cool down and recover some of its power.'),
('EVT-SUB-02', 'Subsystem Issue', 'High', 'Brakes Feeling Inconsistent', 'After several laps of hard, late braking while defending position, the driver reports the brake pedal feels different lap to lap — sometimes sharp, sometimes soft.', -10, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Continuing to brake hard while defending makes the inconsistent feel worse and raises the risk of missing a braking point entirely. A few calmer laps lets the brakes settle back to normal.'),
('EVT-SUB-03', 'Subsystem Issue', 'Medium', 'Battery Not Charging Properly', 'The car''s energy recovery battery isn''t charging up as well as it should be. It can still give a boost of power when needed, but it''s not refilling as fast between corners.', -6, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Using the extra power boost heavily while it''s already struggling to refill will drain it faster than it can recover. Driving a bit more conservatively lets it top back up.'),
('EVT-SUB-04', 'Subsystem Issue', 'Critical', 'Power Boost System Failing', 'The car''s hybrid boost system is now cutting out unpredictably during acceleration. This is the extra push drivers usually count on to defend or overtake, and it''s becoming unreliable.', -20, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Trying to defend a position without reliable extra power leaves you exposed to being passed. A pit stop lets the team check whether it can be reset or fixed.'),
('EVT-SUB-05', 'Subsystem Issue', 'High', 'Floor Damage After Hitting Debris', 'A piece of debris on track hit the underside of the car. The team estimates a small but real loss of downforce, and the car feels looser than usual through fast corners.', -11, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing hard with less grip than normal raises the chance of losing the car in a fast corner. Pitting lets the team look at the damage, though a full fix may not be possible during the race.'),
('EVT-TRK-01', 'Track Position', 'Medium', 'Cars Bunching Up Behind You', 'A group of three cars has caught up and is running close behind, each one able to use the speed-boost zone to try a pass. Your tires are still in reasonably good shape.', -5, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Constantly defending against this group burns through your energy boost for only a small gain each time. Pushing to open up a bigger gap is riskier on tires but solves the problem for longer.'),
('EVT-TRK-02', 'Track Position', 'High', 'Rival Pits — Threat of Losing Position', 'The car right behind you has just pitted for fresh tires. If they come out ahead of you after your own stop, you''ll lose the position. Your current tires are quite worn.', -10, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing hard on already-worn tires to build a bigger gap raises the risk of a tire failure. Pitting in response covers the threat but costs you a lap of track position either way.'),
('EVT-TRK-03', 'Track Position', 'Low', 'Slower Car Ahead About to Move Aside', 'A slower car that''s a lap down is just ahead of you and is required to let you past soon. The delay could cost a bit of time in a tricky part of the track.', -3, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Forcing a pass right away adds tire wear for barely any time gained, since the car has to move over anyway. Being patient for a lap costs almost nothing.'),
('EVT-TRK-04', 'Track Position', 'Critical', 'Fuel Running Low', 'Fuel is getting close to the legal minimum with a few laps still to go. Continuing to push hard would burn fuel faster than the car can afford before the finish.', -16, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Keep pushing at this rate and there''s a real risk of running under the legal fuel amount, which can get you disqualified after the race. Backing off the pace saves enough fuel to finish safely.'),
('EVT-TRK-05', 'Track Position', 'Medium', 'Warned About Running Off Track', 'Race officials have warned you after repeatedly running wide at one corner. One more time and it''ll cost a time penalty.', -7, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Attacking that corner at the same limit again risks the penalty landing regardless of how the rest of the race goes. Taking it a touch more carefully removes that risk completely.'),
('EVT-DRV-01', 'Driver State', 'High', 'Driver Rattled After a Near-Spin', 'The car snapped sideways in a fast corner but the driver caught it. You can hear it in their voice on the radio — they''re a bit shaken heading into the next lap.', -13, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing right away while still rattled makes another mistake more likely. A lap or two at a calmer pace helps the driver settle back down.'),
('EVT-DRV-02', 'Driver State', 'Medium', 'Odd Vibration Through the Car', 'The driver radios in saying they can feel a strange vibration through the steering wheel. It''s not clear yet if it''s a tire issue or something mechanical, and no warning lights have come on.', -6, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Ignoring it and continuing to push could let a small problem turn into a bigger one before anyone notices. Coming in lets the team take a look and catch anything early.'),
('EVT-DRV-03', 'Driver State', 'Critical', 'Driver Reports Fatigue', 'Late in a long, hot stint, the driver radios in that they''re feeling tired and losing a bit of sharpness in the fast corners. Reaction times are almost certainly slower than earlier in the race.', -17, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing at the limit while fatigued raises the odds of a mistake significantly. A calmer pace for a while helps the driver recover some sharpness before the final push.'),
('EVT-DRV-04', 'Driver State', 'High', 'Driver Finding Rhythm Again', 'After an earlier off-track moment, the driver has strung together two clean, confident laps. The tires are in good shape and the car ahead is now within reach.', 9, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'With confidence back and the tires healthy, this is a good window to push hard and attack without the extra risk that comes from a rattled driver or worn tires.'),
('EVT-WTH-05', 'Weather Shift', 'Critical', 'Sudden Heavy Rain', 'Rain has arrived much heavier and faster than expected. Several drivers are already reporting standing water and losing grip in the slower corners.', -19, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pushing through standing water on the wrong tires is a common cause of a spin or crash in these conditions. Pitting for full wet tires right away is the safest response.'),
('EVT-SFC-05', 'Safety Car', 'Medium', 'Teammate Pitting at the Same Time', 'Your teammate is about to pit this lap during a caution period. If you also come in, the crew may not be ready for both cars back-to-back, which could mean a slower stop for one of you.', -7, '["Push","Save Tires","Defend","Pit"]'::jsonb, 'Pitting at the same time risks a slower stop if the crew can''t handle both cars smoothly. Waiting one extra lap avoids that but means paying more for the tire change since the caution period may be ending.')
ON CONFLICT (event_id) DO UPDATE SET 
  event_type = EXCLUDED.event_type,
  severity = EXCLUDED.severity,
  short_desc = EXCLUDED.short_desc,
  description = EXCLUDED.description,
  hidden_impact = EXCLUDED.hidden_impact,
  possible_actions = EXCLUDED.possible_actions,
  expected_consequences = EXCLUDED.expected_consequences;
