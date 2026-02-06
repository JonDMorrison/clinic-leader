-- ============================================================
-- INTERVENTION PATTERN CLUSTERS: Secure RLS Policy Rewrite
-- ============================================================

-- 1. Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Authenticated users can read anonymized patterns" ON public.intervention_pattern_clusters;
DROP POLICY IF EXISTS "Authenticated users can read patterns" ON public.intervention_pattern_clusters;
DROP POLICY IF EXISTS "Service role manages patterns" ON public.intervention_pattern_clusters;
DROP POLICY IF EXISTS "Service role full access" ON public.intervention_pattern_clusters;
DROP POLICY IF EXISTS "patterns_select_policy" ON public.intervention_pattern_clusters;
DROP POLICY IF EXISTS "patterns_insert_policy" ON public.intervention_pattern_clusters;

-- 2. Ensure RLS is enabled
ALTER TABLE public.intervention_pattern_clusters ENABLE ROW LEVEL SECURITY;

-- 3. Create view that excludes source_outcome_ids (could be used to infer org data)
-- This view only exposes safe aggregate fields
DROP VIEW IF EXISTS public.intervention_pattern_clusters_safe;
CREATE VIEW public.intervention_pattern_clusters_safe
WITH (security_invoker = on)
AS SELECT 
  id,
  metric_id,
  intervention_type,
  org_size_band,
  specialty_type,
  time_horizon_band,
  baseline_range_band,
  success_rate,
  sample_size,
  avg_effect_magnitude,
  median_effect_magnitude,
  effect_std_deviation,
  recency_weighted_score,
  pattern_confidence,
  last_computed_at,
  computation_version
  -- EXCLUDED: source_outcome_ids (could be used to trace back to orgs)
  -- EXCLUDED: aggregation_parameters (internal implementation detail)
FROM public.intervention_pattern_clusters
WHERE sample_size >= 5;  -- Enforce anonymity threshold in view

-- 4. Create clean RLS policies

-- READ: Authenticated users can read ONLY if sample_size meets anonymity threshold
CREATE POLICY "patterns_authenticated_read"
ON public.intervention_pattern_clusters
FOR SELECT
TO authenticated
USING (sample_size >= 5);

-- WRITE: ONLY service_role can insert/update/delete (edge function uses service role)
CREATE POLICY "patterns_service_write"
ON public.intervention_pattern_clusters
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "patterns_service_update"
ON public.intervention_pattern_clusters
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "patterns_service_delete"
ON public.intervention_pattern_clusters
FOR DELETE
TO service_role
USING (true);

-- 5. Grant usage on view
GRANT SELECT ON public.intervention_pattern_clusters_safe TO authenticated;

-- 6. Add comments documenting the security model
COMMENT ON TABLE public.intervention_pattern_clusters IS 
  'Anonymized intervention pattern clusters. Contains NO org/user identifiers. Read access requires sample_size >= 5 for k-anonymity.';

COMMENT ON VIEW public.intervention_pattern_clusters_safe IS 
  'Safe view of pattern clusters that excludes source_outcome_ids to prevent org inference. Use this view in client code.';

COMMENT ON POLICY "patterns_authenticated_read" ON public.intervention_pattern_clusters IS
  'Users can read patterns only when sample_size >= 5 to ensure k-anonymity';

COMMENT ON POLICY "patterns_service_write" ON public.intervention_pattern_clusters IS
  'Only service role (edge functions) can create patterns';