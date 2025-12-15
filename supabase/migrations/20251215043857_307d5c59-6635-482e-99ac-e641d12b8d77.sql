-- Add rock_id and metric_id columns to issues table for linking
-- These enable tracking which rock/metric triggered the issue creation

ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS rock_id uuid REFERENCES public.rocks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metric_id uuid REFERENCES public.metrics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS period_key text;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_issues_rock_id ON public.issues(rock_id) WHERE rock_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_metric_id ON public.issues(metric_id) WHERE metric_id IS NOT NULL;

COMMENT ON COLUMN public.issues.rock_id IS 'Optional link to the rock this issue was created from';
COMMENT ON COLUMN public.issues.metric_id IS 'Optional link to the metric this issue was created from';
COMMENT ON COLUMN public.issues.period_key IS 'The period (YYYY-MM) when this issue was identified';