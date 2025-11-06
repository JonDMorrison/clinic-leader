-- Add source column to metric_results to track manual vs synced data
ALTER TABLE public.metric_results
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' CHECK (source IN ('manual', 'jane'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_metric_results_metric_week 
ON public.metric_results(metric_id, week_start DESC);

-- Update RLS policies to ensure proper access control
DROP POLICY IF EXISTS "Admins can manage metric_results" ON public.metric_results;
DROP POLICY IF EXISTS "Managers can manage metric_results" ON public.metric_results;
DROP POLICY IF EXISTS "Team members can read metric_results" ON public.metric_results;

CREATE POLICY "Admins can manage metric_results"
ON public.metric_results
FOR ALL
TO authenticated
USING (
  metric_id IN (
    SELECT id FROM metrics WHERE is_admin() AND is_same_team(organization_id)
  )
)
WITH CHECK (
  metric_id IN (
    SELECT id FROM metrics WHERE is_admin() AND is_same_team(organization_id)
  )
);

CREATE POLICY "Managers can manage metric_results"
ON public.metric_results
FOR ALL
TO authenticated
USING (
  metric_id IN (
    SELECT id FROM metrics WHERE is_manager() AND is_same_team(organization_id)
  )
)
WITH CHECK (
  metric_id IN (
    SELECT id FROM metrics WHERE is_manager() AND is_same_team(organization_id)
  )
);

CREATE POLICY "Team members can read metric_results"
ON public.metric_results
FOR SELECT
TO authenticated
USING (
  metric_id IN (
    SELECT id FROM metrics WHERE is_same_team(organization_id)
  )
);