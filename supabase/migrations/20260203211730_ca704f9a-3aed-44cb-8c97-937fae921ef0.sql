-- ============================================
-- BENCHMARK SECURITY HARDENING
-- Lock down all benchmark tables to master admin only
-- Create audited RPCs as the ONLY access path
-- ============================================

-- 1. FIX CRITICAL VULNERABILITY: benchmark_metric_aggregates open to all
DROP POLICY IF EXISTS "Authenticated users can view benchmark aggregates" ON public.benchmark_metric_aggregates;

-- Add master admin only policy for benchmark_metric_aggregates
CREATE POLICY "Master admins can select benchmark aggregates"
ON public.benchmark_metric_aggregates FOR SELECT
TO authenticated
USING (public.is_master_admin());

CREATE POLICY "Master admins can insert benchmark aggregates"
ON public.benchmark_metric_aggregates FOR INSERT
TO authenticated
WITH CHECK (public.is_master_admin());

CREATE POLICY "Master admins can update benchmark aggregates"
ON public.benchmark_metric_aggregates FOR UPDATE
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

CREATE POLICY "Master admins can delete benchmark aggregates"
ON public.benchmark_metric_aggregates FOR DELETE
TO authenticated
USING (public.is_master_admin());

-- 2. ENHANCED RPCs with audit logging and sample suppression

-- Helper constant for minimum sample size
-- We'll use 5 as the minimum

-- bench_get_cohorts: List all cohorts with member counts
CREATE OR REPLACE FUNCTION public.bench_get_cohorts()
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  created_at timestamptz,
  member_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hard check master admin
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Log access
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'list_cohorts',
    jsonb_build_object('function', 'bench_get_cohorts')
  );

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

-- bench_get_cohort_members: Get members of a cohort (team IDs only for master admin)
CREATE OR REPLACE FUNCTION public.bench_get_cohort_members(_cohort_id uuid)
RETURNS TABLE(
  team_id uuid,
  team_name text,
  joined_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hard check master admin
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Log access
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'list_cohort_members',
    jsonb_build_object('cohort_id', _cohort_id)
  );

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

-- bench_list_snapshots: List snapshots for a cohort with sample suppression
CREATE OR REPLACE FUNCTION public.bench_list_snapshots(
  _cohort_id uuid,
  _limit int DEFAULT 24
)
RETURNS TABLE(
  id uuid,
  cohort_id uuid,
  metric_id uuid,
  metric_name text,
  period_type text,
  period_start date,
  n_orgs int,
  p25 numeric,
  p50 numeric,
  p75 numeric,
  mean numeric,
  stddev numeric,
  computed_at timestamptz,
  suppressed boolean,
  suppression_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min_sample_size CONSTANT int := 5;
BEGIN
  -- Hard check master admin
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Validate limit
  IF _limit < 1 OR _limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  -- Log access
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'list_snapshots',
    jsonb_build_object('cohort_id', _cohort_id, 'limit', _limit)
  );

  RETURN QUERY
  SELECT 
    bs.id,
    bs.cohort_id,
    bs.metric_id,
    m.name as metric_name,
    bs.period_type,
    bs.period_start,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.n_orgs ELSE NULL::int END as n_orgs,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.p25 ELSE NULL::numeric END as p25,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.p50 ELSE NULL::numeric END as p50,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.p75 ELSE NULL::numeric END as p75,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.mean ELSE NULL::numeric END as mean,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.stddev ELSE NULL::numeric END as stddev,
    bs.computed_at,
    bs.n_orgs < _min_sample_size as suppressed,
    CASE WHEN bs.n_orgs < _min_sample_size THEN 'Insufficient sample size (min 5 orgs required)' ELSE NULL::text END as suppression_reason
  FROM public.benchmark_snapshots bs
  LEFT JOIN public.metrics m ON bs.metric_id = m.id
  WHERE bs.cohort_id = _cohort_id
  ORDER BY bs.period_start DESC, m.name
  LIMIT _limit;
END;
$$;

-- bench_get_snapshot: Get a single snapshot with sample suppression
CREATE OR REPLACE FUNCTION public.bench_get_snapshot(_snapshot_id uuid)
RETURNS TABLE(
  id uuid,
  cohort_id uuid,
  cohort_name text,
  metric_id uuid,
  metric_name text,
  period_type text,
  period_start date,
  n_orgs int,
  p10 numeric,
  p25 numeric,
  p50 numeric,
  p75 numeric,
  p90 numeric,
  mean numeric,
  stddev numeric,
  computed_at timestamptz,
  suppressed boolean,
  suppression_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min_sample_size CONSTANT int := 5;
  _actual_n_orgs int;
BEGIN
  -- Hard check master admin
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Get actual n_orgs to check suppression
  SELECT bs.n_orgs INTO _actual_n_orgs
  FROM public.benchmark_snapshots bs
  WHERE bs.id = _snapshot_id;

  IF _actual_n_orgs IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found: %', _snapshot_id;
  END IF;

  -- Log access
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'get_snapshot',
    jsonb_build_object(
      'snapshot_id', _snapshot_id,
      'suppressed', _actual_n_orgs < _min_sample_size
    )
  );

  RETURN QUERY
  SELECT 
    bs.id,
    bs.cohort_id,
    bc.name as cohort_name,
    bs.metric_id,
    m.name as metric_name,
    bs.period_type,
    bs.period_start,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.n_orgs ELSE NULL::int END as n_orgs,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.p10 ELSE NULL::numeric END as p10,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.p25 ELSE NULL::numeric END as p25,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.p50 ELSE NULL::numeric END as p50,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.p75 ELSE NULL::numeric END as p75,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.p90 ELSE NULL::numeric END as p90,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.mean ELSE NULL::numeric END as mean,
    CASE WHEN bs.n_orgs >= _min_sample_size THEN bs.stddev ELSE NULL::numeric END as stddev,
    bs.computed_at,
    bs.n_orgs < _min_sample_size as suppressed,
    CASE WHEN bs.n_orgs < _min_sample_size THEN 'Insufficient sample size (min 5 orgs required)' ELSE NULL::text END as suppression_reason
  FROM public.benchmark_snapshots bs
  LEFT JOIN public.benchmark_cohorts bc ON bs.cohort_id = bc.id
  LEFT JOIN public.metrics m ON bs.metric_id = m.id
  WHERE bs.id = _snapshot_id;
END;
$$;

-- bench_get_aggregate_comparison: Compare two EMR source groups with suppression
CREATE OR REPLACE FUNCTION public.bench_get_aggregate_comparison(
  _metric_key text,
  _period_key text
)
RETURNS TABLE(
  metric_key text,
  period_key text,
  jane_median numeric,
  jane_p25 numeric,
  jane_p75 numeric,
  jane_n_orgs int,
  jane_suppressed boolean,
  non_jane_median numeric,
  non_jane_p25 numeric,
  non_jane_p75 numeric,
  non_jane_n_orgs int,
  non_jane_suppressed boolean,
  delta_percent numeric,
  comparison_valid boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min_sample_size CONSTANT int := 5;
  _jane_record RECORD;
  _non_jane_record RECORD;
BEGIN
  -- Hard check master admin
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Get Jane aggregate
  SELECT * INTO _jane_record
  FROM public.benchmark_metric_aggregates
  WHERE metric_key = _metric_key 
    AND period_key = _period_key
    AND emr_source_group = 'jane'
  LIMIT 1;

  -- Get non-Jane aggregate
  SELECT * INTO _non_jane_record
  FROM public.benchmark_metric_aggregates
  WHERE metric_key = _metric_key 
    AND period_key = _period_key
    AND emr_source_group = 'non_jane'
  LIMIT 1;

  -- Log access
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'get_aggregate_comparison',
    jsonb_build_object(
      'metric_key', _metric_key,
      'period_key', _period_key,
      'jane_suppressed', COALESCE(_jane_record.organization_count, 0) < _min_sample_size,
      'non_jane_suppressed', COALESCE(_non_jane_record.organization_count, 0) < _min_sample_size
    )
  );

  RETURN QUERY
  SELECT
    _metric_key as metric_key,
    _period_key as period_key,
    -- Jane values (suppressed if < 5 orgs)
    CASE WHEN COALESCE(_jane_record.organization_count, 0) >= _min_sample_size 
         THEN _jane_record.median_value ELSE NULL::numeric END as jane_median,
    CASE WHEN COALESCE(_jane_record.organization_count, 0) >= _min_sample_size 
         THEN _jane_record.percentile_25 ELSE NULL::numeric END as jane_p25,
    CASE WHEN COALESCE(_jane_record.organization_count, 0) >= _min_sample_size 
         THEN _jane_record.percentile_75 ELSE NULL::numeric END as jane_p75,
    CASE WHEN COALESCE(_jane_record.organization_count, 0) >= _min_sample_size 
         THEN _jane_record.organization_count ELSE NULL::int END as jane_n_orgs,
    COALESCE(_jane_record.organization_count, 0) < _min_sample_size as jane_suppressed,
    -- Non-Jane values (suppressed if < 5 orgs)
    CASE WHEN COALESCE(_non_jane_record.organization_count, 0) >= _min_sample_size 
         THEN _non_jane_record.median_value ELSE NULL::numeric END as non_jane_median,
    CASE WHEN COALESCE(_non_jane_record.organization_count, 0) >= _min_sample_size 
         THEN _non_jane_record.percentile_25 ELSE NULL::numeric END as non_jane_p25,
    CASE WHEN COALESCE(_non_jane_record.organization_count, 0) >= _min_sample_size 
         THEN _non_jane_record.percentile_75 ELSE NULL::numeric END as non_jane_p75,
    CASE WHEN COALESCE(_non_jane_record.organization_count, 0) >= _min_sample_size 
         THEN _non_jane_record.organization_count ELSE NULL::int END as non_jane_n_orgs,
    COALESCE(_non_jane_record.organization_count, 0) < _min_sample_size as non_jane_suppressed,
    -- Delta (only if both have sufficient samples)
    CASE WHEN COALESCE(_jane_record.organization_count, 0) >= _min_sample_size 
          AND COALESCE(_non_jane_record.organization_count, 0) >= _min_sample_size
          AND _non_jane_record.median_value IS NOT NULL
          AND _non_jane_record.median_value != 0
         THEN ROUND(((_jane_record.median_value - _non_jane_record.median_value) / _non_jane_record.median_value) * 100, 2)
         ELSE NULL::numeric 
    END as delta_percent,
    -- Comparison valid only if both groups have sufficient samples
    (COALESCE(_jane_record.organization_count, 0) >= _min_sample_size 
     AND COALESCE(_non_jane_record.organization_count, 0) >= _min_sample_size) as comparison_valid;
END;
$$;