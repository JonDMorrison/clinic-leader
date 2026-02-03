-- ============================================
-- RPC: org_get_benchmark_summary
-- Returns org's benchmark position vs their cohort
-- Org admin only - never exposes cohort membership
-- ============================================
CREATE OR REPLACE FUNCTION public.org_get_benchmark_summary(
  _metric_id UUID,
  _period_type TEXT,
  _period_start DATE
)
RETURNS TABLE (
  team_value NUMERIC,
  cohort_name TEXT,
  cohort_p25 NUMERIC,
  cohort_p50 NUMERIC,
  cohort_p75 NUMERIC,
  cohort_n_orgs INT,
  bucket_label TEXT,
  percentile_position INT,
  computed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _team_id UUID;
  _data_mode TEXT;
  _cohort_id UUID;
  _cohort_name_val TEXT;
  _team_value_val NUMERIC;
  _snapshot public.benchmark_snapshots;
  _bucket TEXT;
  _percentile INT;
BEGIN
  -- Check if caller is org admin (using existing is_admin function)
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: Organization admin access required';
  END IF;

  -- Get caller's team_id
  _team_id := public.current_user_team();
  IF _team_id IS NULL THEN
    RAISE EXCEPTION 'User not associated with any organization';
  END IF;

  -- Determine data_mode for cohort assignment
  SELECT data_mode INTO _data_mode
  FROM public.teams
  WHERE id = _team_id;

  -- Assign to appropriate cohort based on data_mode
  IF _data_mode = 'jane' THEN
    SELECT id, name INTO _cohort_id, _cohort_name_val
    FROM public.benchmark_cohorts
    WHERE name = 'jane_users';
  ELSE
    SELECT id, name INTO _cohort_id, _cohort_name_val
    FROM public.benchmark_cohorts
    WHERE name = 'non_jane_users';
  END IF;

  -- If no cohort found, return empty
  IF _cohort_id IS NULL THEN
    RETURN;
  END IF;

  -- Get team's metric value for the period
  SELECT mr.value INTO _team_value_val
  FROM public.metric_results mr
  WHERE mr.organization_id = _team_id
    AND mr.metric_id = _metric_id
    AND mr.period_start = _period_start
  LIMIT 1;

  -- Get cohort snapshot
  SELECT * INTO _snapshot
  FROM public.benchmark_snapshots bs
  WHERE bs.cohort_id = _cohort_id
    AND bs.metric_id = _metric_id
    AND bs.period_type = _period_type
    AND bs.period_start = _period_start;

  -- If no snapshot, return with just team value
  IF _snapshot IS NULL THEN
    RETURN QUERY SELECT 
      _team_value_val,
      _cohort_name_val,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      0,
      'no_benchmark_data'::TEXT,
      NULL::INT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Determine bucket and percentile position
  IF _team_value_val IS NULL THEN
    _bucket := 'no_data';
    _percentile := NULL;
  ELSIF _snapshot.p25 IS NULL THEN
    _bucket := 'insufficient_cohort_data';
    _percentile := NULL;
  ELSIF _team_value_val >= _snapshot.p75 THEN
    _bucket := 'top_25';
    _percentile := 75;
  ELSIF _team_value_val >= _snapshot.p50 THEN
    _bucket := 'above_median';
    _percentile := 50;
  ELSIF _team_value_val >= _snapshot.p25 THEN
    _bucket := 'below_median';
    _percentile := 25;
  ELSE
    _bucket := 'bottom_25';
    _percentile := 0;
  END IF;

  RETURN QUERY SELECT
    _team_value_val,
    _cohort_name_val,
    _snapshot.p25,
    _snapshot.p50,
    _snapshot.p75,
    _snapshot.n_orgs,
    _bucket,
    _percentile,
    _snapshot.computed_at;
END;
$$;