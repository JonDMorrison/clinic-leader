-- ============================================
-- METRIC SEMANTICS GOVERNANCE – RLS POLICIES
-- ============================================

-- Drop all existing policies on these tables first
DROP POLICY IF EXISTS "Users can view metric definitions for their org metrics" ON public.metric_definitions;
DROP POLICY IF EXISTS "Admins can manage metric definitions" ON public.metric_definitions;

DROP POLICY IF EXISTS "Users can view normalization rules for their org metrics" ON public.metric_normalization_rules;
DROP POLICY IF EXISTS "Admins can manage normalization rules" ON public.metric_normalization_rules;

DROP POLICY IF EXISTS "Users can view source policies for their org metrics" ON public.metric_source_policies;
DROP POLICY IF EXISTS "Admins can manage source policies" ON public.metric_source_policies;

DROP POLICY IF EXISTS "Users can view precedence overrides for their org" ON public.metric_precedence_overrides;
DROP POLICY IF EXISTS "Admins can manage precedence overrides" ON public.metric_precedence_overrides;

DROP POLICY IF EXISTS "Users can view canonical results for their org" ON public.metric_canonical_results;
DROP POLICY IF EXISTS "Admins can manage canonical results" ON public.metric_canonical_results;

DROP POLICY IF EXISTS "Users can view selection audit log for their org" ON public.metric_selection_audit_log;
DROP POLICY IF EXISTS "System can insert selection audit log" ON public.metric_selection_audit_log;

-- ============================================
-- 1. metric_definitions
-- Org members: READ
-- Org admins: INSERT, UPDATE, DELETE
-- ============================================

CREATE POLICY "metric_definitions_select_org_member"
ON public.metric_definitions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_definitions.metric_id
    AND is_same_team(m.organization_id)
  )
);

CREATE POLICY "metric_definitions_insert_org_admin"
ON public.metric_definitions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_definitions.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

CREATE POLICY "metric_definitions_update_org_admin"
ON public.metric_definitions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_definitions.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_definitions.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

CREATE POLICY "metric_definitions_delete_org_admin"
ON public.metric_definitions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_definitions.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

-- ============================================
-- 2. metric_normalization_rules
-- Org members: READ
-- Org admins: INSERT, UPDATE, DELETE
-- ============================================

CREATE POLICY "metric_normalization_rules_select_org_member"
ON public.metric_normalization_rules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_normalization_rules.metric_id
    AND is_same_team(m.organization_id)
  )
);

CREATE POLICY "metric_normalization_rules_insert_org_admin"
ON public.metric_normalization_rules FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_normalization_rules.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

CREATE POLICY "metric_normalization_rules_update_org_admin"
ON public.metric_normalization_rules FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_normalization_rules.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_normalization_rules.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

CREATE POLICY "metric_normalization_rules_delete_org_admin"
ON public.metric_normalization_rules FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_normalization_rules.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

-- ============================================
-- 3. metric_source_policies
-- Org members: READ
-- Org admins: INSERT, UPDATE, DELETE
-- ============================================

CREATE POLICY "metric_source_policies_select_org_member"
ON public.metric_source_policies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_source_policies.metric_id
    AND is_same_team(m.organization_id)
  )
);

CREATE POLICY "metric_source_policies_insert_org_admin"
ON public.metric_source_policies FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_source_policies.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

CREATE POLICY "metric_source_policies_update_org_admin"
ON public.metric_source_policies FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_source_policies.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_source_policies.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

CREATE POLICY "metric_source_policies_delete_org_admin"
ON public.metric_source_policies FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_source_policies.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

-- ============================================
-- 4. metric_precedence_overrides
-- Org members: READ
-- Org admins: INSERT, UPDATE, DELETE
-- ============================================

CREATE POLICY "metric_precedence_overrides_select_org_member"
ON public.metric_precedence_overrides FOR SELECT
TO authenticated
USING (is_same_team(organization_id));

CREATE POLICY "metric_precedence_overrides_insert_org_admin"
ON public.metric_precedence_overrides FOR INSERT
TO authenticated
WITH CHECK (is_same_team(organization_id) AND is_admin());

CREATE POLICY "metric_precedence_overrides_update_org_admin"
ON public.metric_precedence_overrides FOR UPDATE
TO authenticated
USING (is_same_team(organization_id) AND is_admin())
WITH CHECK (is_same_team(organization_id) AND is_admin());

CREATE POLICY "metric_precedence_overrides_delete_org_admin"
ON public.metric_precedence_overrides FOR DELETE
TO authenticated
USING (is_same_team(organization_id) AND is_admin());

-- ============================================
-- 5. metric_canonical_results
-- Org members: READ only
-- Writes: Service role only (no client policies for INSERT/UPDATE/DELETE)
-- ============================================

CREATE POLICY "metric_canonical_results_select_org_member"
ON public.metric_canonical_results FOR SELECT
TO authenticated
USING (is_same_team(organization_id));

-- No INSERT/UPDATE/DELETE policies = writes blocked for clients
-- Service role bypasses RLS automatically

-- ============================================
-- 6. metric_selection_audit_log
-- Org admins: READ only
-- Writes: Service role only (no client policies for INSERT/UPDATE/DELETE)
-- ============================================

CREATE POLICY "metric_selection_audit_log_select_org_admin"
ON public.metric_selection_audit_log FOR SELECT
TO authenticated
USING (is_same_team(organization_id) AND is_admin());

-- No INSERT/UPDATE/DELETE policies = writes blocked for clients
-- Service role bypasses RLS automatically

-- ============================================
-- Add table comments for documentation
-- ============================================

COMMENT ON POLICY "metric_definitions_select_org_member" ON public.metric_definitions IS 
  'Org members can read definitions for metrics in their organization';

COMMENT ON POLICY "metric_definitions_insert_org_admin" ON public.metric_definitions IS 
  'Only org admins (owner/director) can create metric definitions';

COMMENT ON POLICY "metric_canonical_results_select_org_member" ON public.metric_canonical_results IS 
  'Org members can read canonical results; writes are service-role only';

COMMENT ON POLICY "metric_selection_audit_log_select_org_admin" ON public.metric_selection_audit_log IS 
  'Only org admins can read selection audit logs; writes are service-role only';