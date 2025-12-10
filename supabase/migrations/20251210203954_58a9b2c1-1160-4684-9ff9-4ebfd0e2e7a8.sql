-- Add column to store VTO impact analysis result
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS vto_last_impact_result jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.teams.vto_last_impact_result IS 'Stores the last VTO change impact analysis result including changed sections, impact score, and reasoning';