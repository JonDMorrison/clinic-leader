-- =====================================================
-- Intervention Pattern Cluster Computation Infrastructure
-- =====================================================

-- 1. Add missing columns to intervention_pattern_clusters
ALTER TABLE intervention_pattern_clusters
ADD COLUMN IF NOT EXISTS source_outcome_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS aggregation_parameters jsonb DEFAULT '{}';

-- 2. Create index for pattern lookups
CREATE INDEX IF NOT EXISTS idx_pattern_clusters_metric_type 
ON intervention_pattern_clusters(metric_id, intervention_type);

CREATE INDEX IF NOT EXISTS idx_pattern_clusters_confidence 
ON intervention_pattern_clusters(pattern_confidence DESC);

-- 3. Harden RLS on intervention_pattern_clusters
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow anonymous read for aggregated patterns" ON intervention_pattern_clusters;
DROP POLICY IF EXISTS "Service role full access" ON intervention_pattern_clusters;

-- Enable RLS if not already enabled
ALTER TABLE intervention_pattern_clusters ENABLE ROW LEVEL SECURITY;

-- Allow SELECT only for authenticated users (aggregated safe access)
-- Patterns contain NO org-identifiable data
CREATE POLICY "Authenticated users can read anonymized patterns"
ON intervention_pattern_clusters
FOR SELECT
TO authenticated
USING (
  -- Only allow reading patterns with sufficient sample size
  sample_size >= 5
);

-- Service role can manage patterns (for edge function)
CREATE POLICY "Service role manages patterns"
ON intervention_pattern_clusters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Create recommendation cache invalidation function
CREATE OR REPLACE FUNCTION invalidate_recommendation_caches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update a metadata table or trigger cache refresh
  -- For now, we update the pattern audit to mark cache as stale
  INSERT INTO intervention_pattern_audit (
    patterns_generated,
    interventions_analyzed,
    orgs_included,
    computation_duration_ms,
    version
  ) VALUES (
    0,
    0,
    0,
    0,
    'cache_invalidated'
  );
END;
$$;

-- 5. Create admin RPC for manual recompute trigger
CREATE OR REPLACE FUNCTION recompute_intervention_patterns()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only admins can trigger pattern recomputation';
  END IF;

  -- Log the manual trigger
  INSERT INTO intervention_pattern_audit (
    patterns_generated,
    interventions_analyzed,
    orgs_included,
    computation_duration_ms,
    version
  ) VALUES (
    0,
    0,
    0,
    0,
    'manual_trigger'
  );

  -- Return confirmation (actual computation happens via edge function call)
  result := jsonb_build_object(
    'triggered', true,
    'triggered_by', auth.uid(),
    'triggered_at', now()
  );

  RETURN result;
END;
$$;

-- 6. Grant execute on functions
GRANT EXECUTE ON FUNCTION invalidate_recommendation_caches() TO service_role;
GRANT EXECUTE ON FUNCTION recompute_intervention_patterns() TO authenticated;

-- 7. Add index on intervention_pattern_audit for version queries
CREATE INDEX IF NOT EXISTS idx_pattern_audit_version 
ON intervention_pattern_audit(version);

-- 8. Ensure intervention_outcomes has proper indexes for the query
CREATE INDEX IF NOT EXISTS idx_intervention_outcomes_confidence 
ON intervention_outcomes(confidence_score)
WHERE confidence_score >= 30;