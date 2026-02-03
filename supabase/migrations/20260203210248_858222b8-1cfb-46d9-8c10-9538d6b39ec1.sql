-- ============================================
-- RPC A: bench_get_cohorts()
-- Returns list of cohorts (master admin only)
-- ============================================
CREATE OR REPLACE FUNCTION public.bench_get_cohorts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  member_count BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check master admin permission
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    bc.id,
    bc.name,
    bc.description,
    bc.created_at,
    COUNT(bcm.team_id)::BIGINT as member_count
  FROM public.benchmark_cohorts bc
  LEFT JOIN public.benchmark_cohort_memberships bcm ON bc.id = bcm.cohort_id
  GROUP BY bc.id, bc.name, bc.description, bc.created_at
  ORDER BY bc.name;
END;
$$;

-- ============================================
-- RPC B: bench_get_cohort_members(cohort_id)
-- Returns teams in cohort (master admin only)
-- ============================================
CREATE OR REPLACE FUNCTION public.bench_get_cohort_members(_cohort_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check master admin permission
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    bcm.created_at as joined_at
  FROM public.benchmark_cohort_memberships bcm
  JOIN public.teams t ON bcm.team_id = t.id
  WHERE bcm.cohort_id = _cohort_id
  ORDER BY t.name;
END;
$$;

-- ============================================
-- RPC C: bench_compute_snapshot(...)
-- Computes percentiles from metric_results and upserts snapshot
-- Master admin only
-- ============================================
CREATE OR REPLACE FUNCTION public.bench_compute_snapshot(
  _cohort_id UUID,
  _metric_id UUID,
  _period_type TEXT,
  _period_start DATE
)
RETURNS public.benchmark_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result public.benchmark_snapshots;
  _n_orgs INT;
  _p10 NUMERIC;
  _p25 NUMERIC;
  _p50 NUMERIC;
  _p75 NUMERIC;
  _p90 NUMERIC;
  _mean NUMERIC;
  _stddev NUMERIC;
BEGIN
  -- Check master admin permission
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Validate period_type
  IF _period_type NOT IN ('monthly', 'weekly') THEN
    RAISE EXCEPTION 'Invalid period_type: must be monthly or weekly';
  END IF;

  -- Compute aggregates from metric_results for teams in cohort
  WITH cohort_teams AS (
    SELECT team_id FROM public.benchmark_cohort_memberships WHERE cohort_id = _cohort_id
  ),
  metric_values AS (
    SELECT 
      mr.organization_id,
      mr.value
    FROM public.metric_results mr
    WHERE mr.metric_id = _metric_id
      AND mr.organization_id IN (SELECT team_id FROM cohort_teams)
      AND mr.period_start = _period_start
      AND mr.value IS NOT NULL
  )
  SELECT 
    COUNT(DISTINCT organization_id)::INT,
    PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY value),
    AVG(value),
    STDDEV(value)
  INTO _n_orgs, _p10, _p25, _p50, _p75, _p90, _mean, _stddev
  FROM metric_values;

  -- Upsert into benchmark_snapshots
  INSERT INTO public.benchmark_snapshots (
    cohort_id, metric_id, period_type, period_start,
    n_orgs, p10, p25, p50, p75, p90, mean, stddev, computed_at
  )
  VALUES (
    _cohort_id, _metric_id, _period_type, _period_start,
    COALESCE(_n_orgs, 0), _p10, _p25, _p50, _p75, _p90, _mean, _stddev, now()
  )
  ON CONFLICT (cohort_id, metric_id, period_type, period_start)
  DO UPDATE SET
    n_orgs = COALESCE(_n_orgs, 0),
    p10 = _p10,
    p25 = _p25,
    p50 = _p50,
    p75 = _p75,
    p90 = _p90,
    mean = _mean,
    stddev = _stddev,
    computed_at = now()
  RETURNING * INTO _result;

  -- Log to audit
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'compute_snapshot',
    jsonb_build_object(
      'cohort_id', _cohort_id,
      'metric_id', _metric_id,
      'period_type', _period_type,
      'period_start', _period_start,
      'n_orgs', COALESCE(_n_orgs, 0)
    )
  );

  RETURN _result;
END;
$$;

-- ============================================
-- RPC D: bench_get_snapshot(...)
-- Returns snapshot row (master admin only)
-- ============================================
CREATE OR REPLACE FUNCTION public.bench_get_snapshot(
  _cohort_id UUID,
  _metric_id UUID,
  _period_type TEXT,
  _period_start DATE
)
RETURNS public.benchmark_snapshots
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result public.benchmark_snapshots;
BEGIN
  -- Check master admin permission
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  SELECT * INTO _result
  FROM public.benchmark_snapshots
  WHERE cohort_id = _cohort_id
    AND metric_id = _metric_id
    AND period_type = _period_type
    AND period_start = _period_start;

  RETURN _result;
END;
$$;

-- ============================================
-- RPC E: bench_compare_team_to_cohort(...)
-- Returns comparison object with team value and rank bucket
-- Master admin only
-- ============================================
CREATE OR REPLACE FUNCTION public.bench_compare_team_to_cohort(
  _team_id UUID,
  _cohort_id UUID,
  _metric_id UUID,
  _period_type TEXT,
  _period_start DATE
)
RETURNS TABLE (
  -- Cohort stats
  cohort_p10 NUMERIC,
  cohort_p25 NUMERIC,
  cohort_p50 NUMERIC,
  cohort_p75 NUMERIC,
  cohort_p90 NUMERIC,
  cohort_mean NUMERIC,
  cohort_stddev NUMERIC,
  cohort_n_orgs INT,
  -- Team value
  team_value NUMERIC,
  -- Rank bucket
  rank_bucket TEXT,
  -- Metadata
  source TEXT,
  computed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _snapshot public.benchmark_snapshots;
  _team_value NUMERIC;
  _rank_bucket TEXT;
BEGIN
  -- Check master admin permission
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Get the snapshot
  SELECT * INTO _snapshot
  FROM public.benchmark_snapshots bs
  WHERE bs.cohort_id = _cohort_id
    AND bs.metric_id = _metric_id
    AND bs.period_type = _period_type
    AND bs.period_start = _period_start;

  -- Get team's metric value for the period
  SELECT mr.value INTO _team_value
  FROM public.metric_results mr
  WHERE mr.organization_id = _team_id
    AND mr.metric_id = _metric_id
    AND mr.period_start = _period_start
  LIMIT 1;

  -- Determine rank bucket
  IF _team_value IS NULL THEN
    _rank_bucket := 'no_data';
  ELSIF _snapshot.p25 IS NULL THEN
    _rank_bucket := 'insufficient_cohort_data';
  ELSIF _team_value < _snapshot.p25 THEN
    _rank_bucket := 'below_p25';
  ELSIF _team_value < _snapshot.p50 THEN
    _rank_bucket := 'p25_to_p50';
  ELSIF _team_value < _snapshot.p75 THEN
    _rank_bucket := 'p50_to_p75';
  ELSE
    _rank_bucket := 'above_p75';
  END IF;

  RETURN QUERY
  SELECT
    _snapshot.p10 as cohort_p10,
    _snapshot.p25 as cohort_p25,
    _snapshot.p50 as cohort_p50,
    _snapshot.p75 as cohort_p75,
    _snapshot.p90 as cohort_p90,
    _snapshot.mean as cohort_mean,
    _snapshot.stddev as cohort_stddev,
    _snapshot.n_orgs as cohort_n_orgs,
    _team_value as team_value,
    _rank_bucket as rank_bucket,
    'benchmark_snapshots'::TEXT as source,
    _snapshot.computed_at as computed_at;
END;
$$;