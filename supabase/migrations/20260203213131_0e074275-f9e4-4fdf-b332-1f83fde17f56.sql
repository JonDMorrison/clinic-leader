-- Drop existing function and recreate with correct signature
DROP FUNCTION IF EXISTS public.bench_get_snapshot(uuid, uuid, text, date);

-- 11. Create secure RPC for getting a snapshot with master admin check
CREATE OR REPLACE FUNCTION public.bench_get_snapshot(
  _cohort_id UUID,
  _metric_id UUID,
  _period_type TEXT,
  _period_start DATE
)
RETURNS TABLE(
  id UUID,
  cohort_id UUID,
  metric_id UUID,
  period_type TEXT,
  period_start DATE,
  n_orgs INTEGER,
  p10 NUMERIC,
  p25 NUMERIC,
  p50 NUMERIC,
  p75 NUMERIC,
  p90 NUMERIC,
  mean NUMERIC,
  stddev NUMERIC,
  computed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify master admin
  IF NOT is_master_admin() THEN
    RAISE EXCEPTION 'Access denied: Master admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.cohort_id,
    s.metric_id,
    s.period_type,
    s.period_start,
    s.n_orgs,
    s.p10,
    s.p25,
    s.p50,
    s.p75,
    s.p90,
    s.mean,
    s.stddev,
    s.computed_at
  FROM public.benchmark_snapshots s
  WHERE s.cohort_id = _cohort_id
    AND s.metric_id = _metric_id
    AND s.period_type = _period_type
    AND s.period_start = _period_start
  LIMIT 1;
END;
$$;