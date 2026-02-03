-- Enable RLS on all benchmark tables
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_cohort_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PLATFORM_ROLES POLICIES
-- Master admins can read, no self-assignment allowed
-- ============================================

-- Master admins can view platform roles
CREATE POLICY "Master admins can view platform roles"
ON public.platform_roles
FOR SELECT
TO authenticated
USING (public.is_master_admin());

-- Master admins can insert new platform roles (but not for themselves)
CREATE POLICY "Master admins can insert platform roles"
ON public.platform_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master_admin() 
  AND user_id != auth.uid()
);

-- Master admins can update platform roles (but not their own)
CREATE POLICY "Master admins can update platform roles"
ON public.platform_roles
FOR UPDATE
TO authenticated
USING (public.is_master_admin() AND user_id != auth.uid())
WITH CHECK (public.is_master_admin() AND user_id != auth.uid());

-- Master admins can delete platform roles (but not their own)
CREATE POLICY "Master admins can delete platform roles"
ON public.platform_roles
FOR DELETE
TO authenticated
USING (public.is_master_admin() AND user_id != auth.uid());

-- ============================================
-- BENCHMARK_COHORTS POLICIES
-- Master admin only for all operations
-- ============================================

CREATE POLICY "Master admins can select benchmark cohorts"
ON public.benchmark_cohorts
FOR SELECT
TO authenticated
USING (public.is_master_admin());

CREATE POLICY "Master admins can insert benchmark cohorts"
ON public.benchmark_cohorts
FOR INSERT
TO authenticated
WITH CHECK (public.is_master_admin());

CREATE POLICY "Master admins can update benchmark cohorts"
ON public.benchmark_cohorts
FOR UPDATE
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

CREATE POLICY "Master admins can delete benchmark cohorts"
ON public.benchmark_cohorts
FOR DELETE
TO authenticated
USING (public.is_master_admin());

-- ============================================
-- BENCHMARK_COHORT_MEMBERSHIPS POLICIES
-- Master admin only for all operations
-- ============================================

CREATE POLICY "Master admins can select cohort memberships"
ON public.benchmark_cohort_memberships
FOR SELECT
TO authenticated
USING (public.is_master_admin());

CREATE POLICY "Master admins can insert cohort memberships"
ON public.benchmark_cohort_memberships
FOR INSERT
TO authenticated
WITH CHECK (public.is_master_admin());

CREATE POLICY "Master admins can update cohort memberships"
ON public.benchmark_cohort_memberships
FOR UPDATE
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

CREATE POLICY "Master admins can delete cohort memberships"
ON public.benchmark_cohort_memberships
FOR DELETE
TO authenticated
USING (public.is_master_admin());

-- ============================================
-- BENCHMARK_SNAPSHOTS POLICIES
-- Master admin only for all operations
-- ============================================

CREATE POLICY "Master admins can select benchmark snapshots"
ON public.benchmark_snapshots
FOR SELECT
TO authenticated
USING (public.is_master_admin());

CREATE POLICY "Master admins can insert benchmark snapshots"
ON public.benchmark_snapshots
FOR INSERT
TO authenticated
WITH CHECK (public.is_master_admin());

CREATE POLICY "Master admins can update benchmark snapshots"
ON public.benchmark_snapshots
FOR UPDATE
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

CREATE POLICY "Master admins can delete benchmark snapshots"
ON public.benchmark_snapshots
FOR DELETE
TO authenticated
USING (public.is_master_admin());

-- ============================================
-- BENCHMARK_AUDIT_LOG POLICIES
-- Master admin only for select; insert restricted to master admin for now
-- ============================================

CREATE POLICY "Master admins can select audit logs"
ON public.benchmark_audit_log
FOR SELECT
TO authenticated
USING (public.is_master_admin());

CREATE POLICY "Master admins can insert audit logs"
ON public.benchmark_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_master_admin());