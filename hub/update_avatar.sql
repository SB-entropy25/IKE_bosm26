-- 1. ADD AVATAR NAME TO SPEED SCORES
ALTER TABLE public.speed_scores ADD COLUMN IF NOT EXISTS avatar_name text;

-- 2. ADD LEADERBOARD TOGGLE SETTING
ALTER TABLE public.hub_settings ADD COLUMN IF NOT EXISTS show_speed_leaderboard boolean DEFAULT false;
