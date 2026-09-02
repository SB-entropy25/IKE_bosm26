-- 1. ADD THE NEW COLUMN (Safe to run multiple times)
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS time_allotted int DEFAULT 90;

-- 2. CLEAR OLD QUESTIONS
DELETE FROM public.questions;

-- 3. INSERT THE SPEED ROUND QUESTIONS FROM THE PDF
INSERT INTO public.questions (text, type, options, correct_answer, max_points, time_allotted, sort_order) VALUES
('This team''s papaya-orange & blue livery lit up the grid. Which team is it?', 'mcq', '["Alpine", "McLaren", "Williams", "Haas"]', 'McLaren', 35, 90, 1),
('Navy blue with red & yellow bull accents. Which team is it?', 'mcq', '["Visa Cash App RB", "Oracle Red Bull Racing", "Williams", "Sauber"]', 'Oracle Red Bull Racing', 35, 90, 2),
('British Racing Green with a lime-yellow accent stripe. Which team is it?', 'mcq', '["Aston Martin Aramco", "Mercedes", "Alpine", "Haas"]', 'Aston Martin Aramco', 50, 90, 3),
('Rosso Corsa red with yellow accents. Which team is it?', 'mcq', '["Alfa Romeo", "Scuderia Ferrari", "Toro Rosso", "Haas"]', 'Scuderia Ferrari', 35, 90, 4),
('Silver-black with Petronas teal-green stripes. Which team is it?', 'mcq', '["Williams", "Aston Martin", "Mercedes-AMG Petronas", "McLaren"]', 'Mercedes-AMG Petronas', 50, 90, 5),
('DRS may be activated by the driver:', 'mcq', '["Anywhere on the track", "Only in designated DRS zones, within 1 sec of the car ahead", "Only on the main straight", "Only during qualifying"]', 'Only in designated DRS zones, within 1 sec of the car ahead', 35, 90, 6),
('Which braking-assist technology is banned on MotoGP bikes, unlike on most road-going motorcycles?', 'mcq', '["ABS", "Traction control", "Engine braking", "Launch control"]', 'ABS', 50, 90, 7),
('How many laps make up the Monaco Grand Prix?', 'mcq', '["58", "66", "78", "87"]', '78', 50, 90, 8),
('In which year was the first-ever Formula 1 World Championship season held?', 'mcq', '["1946", "1950", "1955", "1961"]', '1950', 35, 90, 9),
('Monza earned a famous nickname because of its blistering average lap speeds. What is it called?', 'mcq', '["The Temple of Speed", "The Green Hell", "The Cathedral of Curves", "The Silverstone of Italy"]', 'The Temple of Speed', 50, 90, 10);
