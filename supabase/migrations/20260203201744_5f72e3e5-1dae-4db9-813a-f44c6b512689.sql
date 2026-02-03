-- Add ai_summary field to interventions for rollup summary
ALTER TABLE public.interventions
ADD COLUMN IF NOT EXISTS ai_summary TEXT;