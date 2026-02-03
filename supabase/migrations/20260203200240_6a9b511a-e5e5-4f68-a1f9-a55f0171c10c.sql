-- =============================================================
-- Enhanced RLS for Intervention Intelligence Feature
-- =============================================================

-- Step 1: Drop existing basic policies
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own org interventions" ON public.interventions;
DROP POLICY IF EXISTS "Users can create own org interventions" ON public.interventions;
DROP POLICY IF EXISTS "Users can update own org interventions" ON public.interventions;
DROP POLICY IF EXISTS "Users can delete own org interventions" ON public.interventions;

DROP POLICY IF EXISTS "Users can view own org intervention links" ON public.intervention_metric_links;
DROP POLICY IF EXISTS "Users can create own org intervention links" ON public.intervention_metric_links;
DROP POLICY IF EXISTS "Users can update own org intervention links" ON public.intervention_metric_links;
DROP POLICY IF EXISTS "Users can delete own org intervention links" ON public.intervention_metric_links;

DROP POLICY IF EXISTS "Users can view own org intervention outcomes" ON public.intervention_outcomes;
DROP POLICY IF EXISTS "Users can create own org intervention outcomes" ON public.intervention_outcomes;
DROP POLICY IF EXISTS "Users can update own org intervention outcomes" ON public.intervention_outcomes;
DROP POLICY IF EXISTS "Users can delete own org intervention outcomes" ON public.intervention_outcomes;

-- Step 2: Create helper function to check if user is creator of an intervention
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_intervention_creator(intervention_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.interventions
    WHERE id = intervention_id
    AND created_by = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_intervention_creator IS 'Returns true if current auth user created the specified intervention';

-- Step 3: Create helper to check admin OR creator for intervention updates
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_modify_intervention(intervention_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
    AND (
      -- User is an admin (owner/director)
      is_admin()
      OR
      -- User is the creator
      i.created_by = auth.uid()
    )
  );
$$;

COMMENT ON FUNCTION public.can_modify_intervention IS 'Returns true if user can update the intervention (admin or creator)';

-- Step 4: Create helper to check org admin status for a specific org
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_org_admin_for(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT is_same_team(org_id) AND is_admin();
$$;

COMMENT ON FUNCTION public.is_org_admin_for IS 'Returns true if user is an admin in the specified organization';

-- =============================================================
-- INTERVENTIONS POLICIES
-- =============================================================

-- SELECT: org members can read
CREATE POLICY "Members can view org interventions"
ON public.interventions
FOR SELECT
USING (is_same_team(organization_id));

-- INSERT: org members can create, created_by must equal auth.uid()
CREATE POLICY "Members can create interventions"
ON public.interventions
FOR INSERT
WITH CHECK (
  is_same_team(organization_id)
  AND created_by = auth.uid()
);

-- UPDATE: org admins OR creator can update
CREATE POLICY "Admins and creators can update interventions"
ON public.interventions
FOR UPDATE
USING (
  is_same_team(organization_id)
  AND (is_admin() OR created_by = auth.uid())
)
WITH CHECK (
  is_same_team(organization_id)
  AND (is_admin() OR created_by = auth.uid())
);

-- DELETE: org admins only
CREATE POLICY "Only admins can delete interventions"
ON public.interventions
FOR DELETE
USING (
  is_same_team(organization_id)
  AND is_admin()
);

-- =============================================================
-- INTERVENTION_METRIC_LINKS POLICIES
-- =============================================================

-- SELECT: org members via join to parent intervention
CREATE POLICY "Members can view intervention links"
ON public.intervention_metric_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);

-- INSERT: same as parent intervention UPDATE rules (admin or creator)
CREATE POLICY "Authorized users can create intervention links"
ON public.intervention_metric_links
FOR INSERT
WITH CHECK (can_modify_intervention(intervention_id));

-- UPDATE: same as parent intervention UPDATE rules
CREATE POLICY "Authorized users can update intervention links"
ON public.intervention_metric_links
FOR UPDATE
USING (can_modify_intervention(intervention_id))
WITH CHECK (can_modify_intervention(intervention_id));

-- DELETE: same as parent intervention DELETE rules (admin only)
CREATE POLICY "Admins can delete intervention links"
ON public.intervention_metric_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
    AND is_admin()
  )
);

-- =============================================================
-- INTERVENTION_OUTCOMES POLICIES
-- =============================================================

-- SELECT: org members via join to parent intervention
CREATE POLICY "Members can view intervention outcomes"
ON public.intervention_outcomes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);

-- INSERT: org admins only (system-generated)
CREATE POLICY "Admins can create intervention outcomes"
ON public.intervention_outcomes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
    AND is_admin()
  )
);

-- UPDATE: org admins only
CREATE POLICY "Admins can update intervention outcomes"
ON public.intervention_outcomes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
    AND is_admin()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
    AND is_admin()
  )
);

-- DELETE: org admins only
CREATE POLICY "Admins can delete intervention outcomes"
ON public.intervention_outcomes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
    AND is_admin()
  )
);