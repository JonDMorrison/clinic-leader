-- Add import_key and period_end columns to metric_breakdowns
ALTER TABLE public.metric_breakdowns 
ADD COLUMN IF NOT EXISTS import_key text,
ADD COLUMN IF NOT EXISTS period_end date;

-- Backfill import_key from metrics table for existing rows
UPDATE public.metric_breakdowns mb
SET import_key = m.import_key
FROM public.metrics m
WHERE mb.metric_id = m.id AND mb.import_key IS NULL;

-- Drop the old unique constraint
ALTER TABLE public.metric_breakdowns 
DROP CONSTRAINT IF EXISTS metric_breakdowns_org_metric_period_dim_unique;

-- Create new unique constraint using import_key instead of metric_id
ALTER TABLE public.metric_breakdowns 
ADD CONSTRAINT metric_breakdowns_org_import_period_dim_unique 
UNIQUE (organization_id, import_key, period_type, period_key, dimension_type, dimension_id);

-- Make import_key NOT NULL after backfill (new inserts must have it)
-- Note: We keep metric_id for backwards compatibility but it's no longer required
ALTER TABLE public.metric_breakdowns ALTER COLUMN metric_id DROP NOT NULL;