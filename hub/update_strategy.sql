ALTER TABLE public.strategy_scores ADD COLUMN IF NOT EXISTS principal_name text;
ALTER TABLE public.strategy_scores ADD COLUMN IF NOT EXISTS team_name text;
