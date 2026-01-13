-- Drop duplicate constraint if exists
ALTER TABLE public.metric_breakdowns DROP CONSTRAINT IF EXISTS metric_breakdowns_unique_key;