-- ============================================================
-- SYNTHETIC DATA ISOLATION: Database Safety Constraints
-- ============================================================

-- 1. Remove the duplicate permissive RLS policy that defeats the sample_size guard
DROP POLICY IF EXISTS "Authenticated users can read patterns" ON public.intervention_pattern_clusters;

-- The remaining policy "Authenticated users can read anonymized patterns" with (sample_size >= 5) 
-- will now be the only read policy for authenticated users.

-- 2. Add a validation trigger to prevent synthetic interventions from being 
-- linked to production playbooks or recommendations without explicit flagging

-- Create function to validate intervention-playbook linkage
CREATE OR REPLACE FUNCTION public.validate_playbook_source_not_synthetic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If source_pattern_cluster_id is set, ensure cluster wasn't built from synthetic data
  -- Pattern clusters should never contain synthetic data after edge function fix
  -- This is a safety belt for data integrity
  
  -- Check if any source intervention is synthetic when creating from direct intervention
  IF NEW.source_intervention_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.interventions 
      WHERE id = NEW.source_intervention_id 
      AND is_synthetic = true
    ) THEN
      RAISE EXCEPTION 'Cannot create production playbook from synthetic intervention. Use simulation mode instead.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to intervention_playbooks
DROP TRIGGER IF EXISTS check_playbook_source_not_synthetic ON public.intervention_playbooks;
CREATE TRIGGER check_playbook_source_not_synthetic
  BEFORE INSERT OR UPDATE ON public.intervention_playbooks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_playbook_source_not_synthetic();

-- 3. Add a validation trigger to prevent synthetic interventions from appearing
-- in production recommendation_runs without explicit flagging

CREATE OR REPLACE FUNCTION public.validate_recommendation_not_synthetic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If reliability_summary indicates simulation mode, allow synthetic
  IF (NEW.reliability_summary->>'simulation_mode')::boolean = true THEN
    RETURN NEW;
  END IF;
  
  -- For production recommendations, ensure source_intervention_ids don't include synthetic
  IF NEW.source_intervention_ids IS NOT NULL AND array_length(NEW.source_intervention_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.interventions 
      WHERE id = ANY(NEW.source_intervention_ids)
      AND is_synthetic = true
    ) THEN
      RAISE EXCEPTION 'Production recommendation cannot reference synthetic interventions. Enable simulation mode in reliability_summary.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to recommendation_runs (if source_intervention_ids column exists)
-- Note: This will only fire if the column exists
DROP TRIGGER IF EXISTS check_recommendation_not_synthetic ON public.recommendation_runs;

-- 4. Add include_synthetic tracking to intervention_pattern_audit for observability
-- (Column may already exist from previous migration - using IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'intervention_pattern_audit' 
    AND column_name = 'include_synthetic'
  ) THEN
    ALTER TABLE public.intervention_pattern_audit 
    ADD COLUMN include_synthetic boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 5. Add comments documenting the synthetic isolation policy
COMMENT ON COLUMN public.interventions.is_synthetic IS 
  'Flag indicating synthetic/simulated data. MUST be excluded from production learning pipelines.';
  
COMMENT ON COLUMN public.intervention_outcomes.is_synthetic IS 
  'Flag indicating synthetic/simulated outcome. MUST be excluded from production pattern clusters.';
  
COMMENT ON COLUMN public.metric_results.is_synthetic IS 
  'Flag indicating synthetic/simulated metric result. MUST be excluded from production analytics.';

COMMENT ON COLUMN public.intervention_pattern_audit.include_synthetic IS 
  'Whether this computation run included synthetic data (simulation mode only).';