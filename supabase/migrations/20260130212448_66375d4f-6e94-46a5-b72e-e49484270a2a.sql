-- Step 1: Add data_mode column to teams table
ALTER TABLE public.teams 
ADD COLUMN data_mode text NOT NULL DEFAULT 'default';

-- Add CHECK constraint to restrict values
ALTER TABLE public.teams 
ADD CONSTRAINT teams_data_mode_check 
CHECK (data_mode IN ('default', 'jane'));

-- Add comment for documentation
COMMENT ON COLUMN public.teams.data_mode IS 
'Controls which /data view to render: default (manual/Excel legacy) or jane (EMR integration)';

-- Step 2: Backfill - set data_mode to 'jane' for orgs with active Jane connector
UPDATE public.teams t
SET data_mode = 'jane'
WHERE EXISTS (
  SELECT 1 
  FROM public.bulk_analytics_connectors c 
  WHERE c.organization_id = t.id 
    AND c.source_system = 'jane'
    AND c.status IN ('receiving_data', 'awaiting_first_file', 'active', 'awaiting_jane_setup')
);

-- Step 3: Create legacy_monthly_reports table for Lori's workbook payloads
CREATE TABLE public.legacy_monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  source_file_name text NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one report per org per month
  CONSTRAINT legacy_monthly_reports_org_period_unique UNIQUE (organization_id, period_key)
);

-- Add comment for documentation
COMMENT ON TABLE public.legacy_monthly_reports IS 
'Stores raw payloads from Lori workbook Excel imports, one row per org per month';

COMMENT ON COLUMN public.legacy_monthly_reports.period_key IS 
'Month in YYYY-MM format';

COMMENT ON COLUMN public.legacy_monthly_reports.payload IS 
'Complete parsed workbook data as JSON, preserving original structure';

-- Step 4: Enable RLS on legacy_monthly_reports
ALTER TABLE public.legacy_monthly_reports ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for legacy_monthly_reports
CREATE POLICY "Users can view own org legacy reports"
ON public.legacy_monthly_reports
FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Users can insert own org legacy reports"
ON public.legacy_monthly_reports
FOR INSERT
WITH CHECK (is_same_team(organization_id));

CREATE POLICY "Users can update own org legacy reports"
ON public.legacy_monthly_reports
FOR UPDATE
USING (is_same_team(organization_id));

CREATE POLICY "Users can delete own org legacy reports"
ON public.legacy_monthly_reports
FOR DELETE
USING (is_same_team(organization_id));

-- Step 6: Create trigger for automatic updated_at timestamp
CREATE TRIGGER update_legacy_monthly_reports_updated_at
BEFORE UPDATE ON public.legacy_monthly_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Add index for common query patterns
CREATE INDEX idx_legacy_monthly_reports_org_period 
ON public.legacy_monthly_reports(organization_id, period_key DESC);