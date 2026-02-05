-- Add reliability_summary column to recommendation_runs
ALTER TABLE public.recommendation_runs
ADD COLUMN IF NOT EXISTS reliability_summary JSONB;