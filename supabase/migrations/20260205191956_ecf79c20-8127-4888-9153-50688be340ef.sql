-- Add missing columns to audit table first
ALTER TABLE public.intervention_pattern_audit
ADD COLUMN IF NOT EXISTS cluster_run_id UUID,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS outcome_count_processed INTEGER,
ADD COLUMN IF NOT EXISTS cluster_count_generated INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success',
ADD COLUMN IF NOT EXISTS error_summary TEXT;

-- Drop existing function to change return type
DROP FUNCTION IF EXISTS public.recompute_intervention_patterns();

-- Create admin RPC for manual recomputation
CREATE FUNCTION public.recompute_intervention_patterns()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  run_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  run_id := gen_random_uuid();
  
  -- Log that admin triggered manual recompute
  INSERT INTO intervention_pattern_audit (
    cluster_run_id,
    start_time,
    status,
    version
  ) VALUES (
    run_id,
    now(),
    'pending',
    '3.0'
  );

  RETURN run_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.recompute_intervention_patterns() TO authenticated;

-- Create or replace cache invalidation RPC
CREATE OR REPLACE FUNCTION public.invalidate_recommendation_caches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE NOTICE 'Recommendation caches invalidated';
END;
$$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pattern_audit_run_id 
ON public.intervention_pattern_audit(cluster_run_id);