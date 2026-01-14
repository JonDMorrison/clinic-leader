-- Enforce import_key NOT NULL
ALTER TABLE public.metric_breakdowns ALTER COLUMN import_key SET NOT NULL;

-- Drop existing check constraints if they exist (to avoid conflicts)
ALTER TABLE public.metric_breakdowns DROP CONSTRAINT IF EXISTS metric_breakdowns_period_type_check;
ALTER TABLE public.metric_breakdowns DROP CONSTRAINT IF EXISTS metric_breakdowns_dimension_type_check;

-- Add CHECK constraints
ALTER TABLE public.metric_breakdowns ADD CONSTRAINT metric_breakdowns_period_type_check 
  CHECK (period_type IN ('weekly', 'monthly', 'ytd'));

ALTER TABLE public.metric_breakdowns ADD CONSTRAINT metric_breakdowns_dimension_type_check 
  CHECK (dimension_type IN ('clinician', 'discipline', 'location'));

-- Add supporting index for reads
CREATE INDEX IF NOT EXISTS idx_metric_breakdowns_lookup 
  ON public.metric_breakdowns (organization_id, import_key, period_type, period_key, dimension_type);