
-- PHASE 2: Harden system_regression_events RLS
-- Drop existing permissive INSERT policy (users should not insert directly)
DROP POLICY IF EXISTS "Users can log regression events" ON public.system_regression_events;
DROP POLICY IF EXISTS "Owners can view regression events" ON public.system_regression_events;

-- Read: Master admins see all, org admins see their org's events only
CREATE POLICY "Master admins can read all regression events"
ON public.system_regression_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.platform_roles 
    WHERE user_id = auth.uid() AND role = 'master_admin'
  )
);

CREATE POLICY "Org admins can read their org regression events"
ON public.system_regression_events
FOR SELECT
USING (
  organization_id IS NOT NULL
  AND organization_id = public.current_user_team()
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('owner', 'director')
  )
);

-- No INSERT/UPDATE/DELETE for regular users - service role only

-- PHASE 3: Add treat_zero_as_missing to metrics table
ALTER TABLE public.metrics 
ADD COLUMN IF NOT EXISTS treat_zero_as_missing BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.metrics.treat_zero_as_missing IS 'When true, zero values are displayed as "No data yet" instead of rendering normally';
