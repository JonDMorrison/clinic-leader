-- Add unique constraint on metrics(organization_id, import_key) where import_key is not null
CREATE UNIQUE INDEX IF NOT EXISTS metrics_org_import_key_unique 
ON public.metrics (organization_id, import_key) 
WHERE import_key IS NOT NULL AND import_key != '';

-- Add raw_row column to metric_results for audit/debug
ALTER TABLE public.metric_results 
ADD COLUMN IF NOT EXISTS raw_row jsonb NULL;