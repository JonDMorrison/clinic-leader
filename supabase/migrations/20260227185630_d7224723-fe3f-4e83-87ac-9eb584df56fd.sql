
-- Add organization_id with a temporary default so existing rows get populated
-- For this table, clinic_guid IS the org_id when no connector match exists
ALTER TABLE public.clinic_insights
  ADD COLUMN organization_id UUID;

-- Backfill using clinic_guid as UUID directly (it's already the org_id for fallback cases)
UPDATE public.clinic_insights
SET organization_id = clinic_guid::uuid;

-- Now enforce NOT NULL
ALTER TABLE public.clinic_insights
  ALTER COLUMN organization_id SET NOT NULL;

-- Index for RLS
CREATE INDEX idx_clinic_insights_org ON public.clinic_insights (organization_id);

-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view insights" ON public.clinic_insights;

-- Force RLS
ALTER TABLE public.clinic_insights FORCE ROW LEVEL SECURITY;

-- SELECT: only org members via existing current_user_team() pattern
CREATE POLICY "Org members can view their clinic insights"
  ON public.clinic_insights
  FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_team());

-- Explicit deny write ops (defense-in-depth; no policy = denied anyway, but belt+suspenders)
CREATE POLICY "Deny client inserts"
  ON public.clinic_insights FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client updates"
  ON public.clinic_insights FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Deny client deletes"
  ON public.clinic_insights FOR DELETE TO authenticated
  USING (false);

-- Revoke write grants from both roles
REVOKE INSERT, UPDATE, DELETE ON public.clinic_insights FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.clinic_insights FROM authenticated;
