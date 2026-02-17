-- =====================================================
-- Week 1 Day 1: Core RLS Hardening & Multi-Tenancy Audit Fixes
-- Target: Ensure Clinic Owner/Admin role is team-scoped and eliminate cross-tenant leakage.
-- =====================================================

-- 1. Helper Function Hardening
-- current_user_team() already exists and is security definer.
-- We need a helper that checks if a user is an admin WITHIN THEIR OWN TEAM.

CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = auth.email() 
    AND role IN ('owner', 'director')
    -- Implicitly scoped to their own team because we're checking the role of the user matching the auth email.
    -- However, for RLS on other tables, we need to ensure they can only see records for THEIR team.
  );
$$;

-- 2. KPI Table Hardening
DROP POLICY IF EXISTS "Admins can manage all kpis" ON public.kpis;
CREATE POLICY "Admins can manage their team kpis" ON public.kpis
  FOR ALL TO authenticated
  USING (
    public.is_admin() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  )
  WITH CHECK (
    public.is_admin() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

-- 3. Rocks Table Hardening
DROP POLICY IF EXISTS "Admins can manage all rocks" ON public.rocks;
CREATE POLICY "Admins can manage their team rocks" ON public.rocks
  FOR ALL TO authenticated
  USING (
    public.is_admin() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  )
  WITH CHECK (
    public.is_admin() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

-- 4. Issues Table Hardening
DROP POLICY IF EXISTS "Admins can manage all issues" ON public.issues;
CREATE POLICY "Admins can manage their team issues" ON public.issues
  FOR ALL TO authenticated
  USING (public.is_admin() AND public.is_same_team(team_id))
  WITH CHECK (public.is_admin() AND public.is_same_team(team_id));

-- 5. Todos Table Hardening
DROP POLICY IF EXISTS "Admins can manage all todos" ON public.todos;
CREATE POLICY "Admins can manage their team todos" ON public.todos
  FOR ALL TO authenticated
  USING (
    public.is_admin() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  )
  WITH CHECK (
    public.is_admin() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

-- 6. AR Aging Hardening (Critical Leak Fix)
ALTER TABLE public.ar_aging ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.teams(id);

-- Backfill organization_id for ar_aging if missing
UPDATE public.ar_aging
SET organization_id = (SELECT team_id FROM public.users WHERE users.id = ar_aging.owner_id)
WHERE organization_id IS NULL;

DROP POLICY IF EXISTS "Admins can manage ar_aging" ON public.ar_aging;
DROP POLICY IF EXISTS "Billing can manage ar_aging" ON public.ar_aging;

CREATE POLICY "Admins can manage team ar_aging" ON public.ar_aging
  FOR ALL TO authenticated
  USING (public.is_admin() AND public.is_same_team(organization_id))
  WITH CHECK (public.is_admin() AND public.is_same_team(organization_id));

CREATE POLICY "Billing can manage team ar_aging" ON public.ar_aging
  FOR ALL TO authenticated
  USING (public.is_billing() AND public.is_same_team(organization_id))
  WITH CHECK (public.is_billing() AND public.is_same_team(organization_id));

-- 7. Referral Sources & Weekly Hardening (Data Correctness & Isolation)
-- Referral sources are currently global. Moving to tenant-isolated.
ALTER TABLE public.referral_sources ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.teams(id);
ALTER TABLE public.referrals_weekly ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.teams(id);

-- Drop global unique constraint on referral_sources name to allow same name across different clinics
ALTER TABLE public.referral_sources DROP CONSTRAINT IF EXISTS referral_sources_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_sources_name_org ON public.referral_sources(name, organization_id);

-- Backfill organization_id for referral_sources (default to a team or leave NULL if you want them to be seeded)
-- For existing data, we might need a better strategy, but for hardening, we isolate new data.

-- Fix RLS for Referral Sources
DROP POLICY IF EXISTS "Authenticated users can read referral_sources" ON public.referral_sources;
DROP POLICY IF EXISTS "Admins can manage referral_sources" ON public.referral_sources;

CREATE POLICY "Users can read their team referral_sources" ON public.referral_sources
  FOR SELECT TO authenticated
  USING (public.is_same_team(organization_id));

CREATE POLICY "Admins can manage their team referral_sources" ON public.referral_sources
  FOR ALL TO authenticated
  USING (public.is_admin() AND public.is_same_team(organization_id))
  WITH CHECK (public.is_admin() AND public.is_same_team(organization_id));

-- Fix RLS for Referrals Weekly
DROP POLICY IF EXISTS "Authenticated users can read referrals_weekly" ON public.referrals_weekly;
DROP POLICY IF EXISTS "Admins can manage referrals_weekly" ON public.referrals_weekly;
DROP POLICY IF EXISTS "Managers can manage referrals_weekly" ON public.referrals_weekly;
DROP POLICY IF EXISTS "Staff can read referrals_weekly" ON public.referrals_weekly;

CREATE POLICY "Users can read their team referrals_weekly" ON public.referrals_weekly
  FOR SELECT TO authenticated
  USING (public.is_same_team(organization_id));

CREATE POLICY "Admins/Managers can manage team referrals_weekly" ON public.referrals_weekly
  FOR ALL TO authenticated
  USING ((public.is_admin() OR public.is_manager()) AND public.is_same_team(organization_id))
  WITH CHECK ((public.is_admin() OR public.is_manager()) AND public.is_same_team(organization_id));

-- 8. Audit Log Hardening
-- Admin should only read their OWN org's audit logs
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.teams(id);

-- Backfill audit logs
UPDATE public.audit_log
SET organization_id = (SELECT team_id FROM public.users WHERE users.id = audit_log.actor_id)
WHERE organization_id IS NULL;

DROP POLICY IF EXISTS "Admins can read audit_log" ON public.audit_log;
CREATE POLICY "Admins can read their team audit_logs" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin() AND public.is_same_team(organization_id));
