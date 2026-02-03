-- ============================================
-- BENCHMARK RPC SUITE: SECURITY DEFINER + SUPPRESSION
-- All cross-org benchmark data access through audited RPCs
-- ============================================

-- Minimum sample size for suppression
-- If either group has < 5 orgs, aggregates are NULLed

-- A) bench_get_cohorts() - List all cohorts with member counts
-- Already exists, ensure it has proper security
DROP FUNCTION IF EXISTS public.bench_get_cohorts();
CREATE OR REPLACE FUNCTION public.bench_get_cohorts()
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  member_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hard permission check
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Audit log
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'list_cohorts',
    jsonb_build_object('called_at', now())
  );

  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.created_at,
    COALESCE(COUNT(cm.team_id), 0)::BIGINT as member_count
  FROM public.benchmark_cohorts c
  LEFT JOIN public.benchmark_cohort_memberships cm ON cm.cohort_id = c.id
  GROUP BY c.id, c.name, c.description, c.created_at
  ORDER BY c.name;
END;
$$;

-- B) bench_get_cohort_members(cohort_id uuid) - Get members with EMR source
DROP FUNCTION IF EXISTS public.bench_get_cohort_members(UUID);
CREATE OR REPLACE FUNCTION public.bench_get_cohort_members(_cohort_id UUID)
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  emr_source_type TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hard permission check
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Audit log
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'list_cohort_members',
    jsonb_build_object('cohort_id', _cohort_id)
  );

  RETURN QUERY
  SELECT 
    cm.team_id,
    t.name as team_name,
    COALESCE(t.emr_source_type, 'unknown') as emr_source_type,
    cm.created_at as joined_at
  FROM public.benchmark_cohort_memberships cm
  JOIN public.teams t ON t.id = cm.team_id
  WHERE cm.cohort_id = _cohort_id
  ORDER BY t.name;
END;
$$;

-- C) bench_list_snapshots(cohort_id, limit) - List snapshots with suppression
DROP FUNCTION IF EXISTS public.bench_list_snapshots(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.bench_list_snapshots(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.bench_list_snapshots(
  _cohort_id UUID,
  _limit INTEGER DEFAULT 24
)
RETURNS TABLE(
  id UUID,
  cohort_id UUID,
  metric_id UUID,
  metric_name TEXT,
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
  computed_at TIMESTAMPTZ,
  suppressed BOOLEAN,
  suppression_reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hard permission check
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Audit log
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'list_snapshots',
    jsonb_build_object('cohort_id', _cohort_id, 'limit', _limit)
  );

  RETURN QUERY
  SELECT 
    s.id,
    s.cohort_id,
    s.metric_id,
    m.name as metric_name,
    s.period_type,
    s.period_start,
    -- Apply suppression: if n_orgs < 5, NULL out aggregates
    CASE WHEN s.n_orgs >= 5 THEN s.n_orgs ELSE NULL END as n_orgs,
    CASE WHEN s.n_orgs >= 5 THEN s.p10 ELSE NULL END as p10,
    CASE WHEN s.n_orgs >= 5 THEN s.p25 ELSE NULL END as p25,
    CASE WHEN s.n_orgs >= 5 THEN s.p50 ELSE NULL END as p50,
    CASE WHEN s.n_orgs >= 5 THEN s.p75 ELSE NULL END as p75,
    CASE WHEN s.n_orgs >= 5 THEN s.p90 ELSE NULL END as p90,
    CASE WHEN s.n_orgs >= 5 THEN s.mean ELSE NULL END as mean,
    CASE WHEN s.n_orgs >= 5 THEN s.stddev ELSE NULL END as stddev,
    s.computed_at,
    (s.n_orgs < 5) as suppressed,
    CASE WHEN s.n_orgs < 5 THEN 'Insufficient sample size (min 5 orgs required)' ELSE NULL END as suppression_reason
  FROM public.benchmark_snapshots s
  LEFT JOIN public.metrics m ON m.id = s.metric_id
  WHERE s.cohort_id = _cohort_id
  ORDER BY s.period_start DESC, m.name
  LIMIT _limit;
END;
$$;

-- D) bench_get_snapshot(snapshot_id) - Get single snapshot with full suppression
DROP FUNCTION IF EXISTS public.bench_get_snapshot(UUID, UUID, TEXT, DATE);
DROP FUNCTION IF EXISTS public.bench_get_snapshot(UUID);
CREATE OR REPLACE FUNCTION public.bench_get_snapshot(_snapshot_id UUID)
RETURNS TABLE(
  id UUID,
  cohort_id UUID,
  cohort_name TEXT,
  metric_id UUID,
  metric_name TEXT,
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
  computed_at TIMESTAMPTZ,
  suppressed BOOLEAN,
  suppression_reason TEXT,
  confidence_label TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _raw_n_orgs INTEGER;
  _suppressed BOOLEAN;
BEGIN
  -- Hard permission check
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Get raw n_orgs to determine suppression
  SELECT s.n_orgs INTO _raw_n_orgs
  FROM public.benchmark_snapshots s
  WHERE s.id = _snapshot_id;

  _suppressed := COALESCE(_raw_n_orgs, 0) < 5;

  -- Audit log
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'get_snapshot',
    jsonb_build_object('snapshot_id', _snapshot_id, 'suppressed', _suppressed)
  );

  RETURN QUERY
  SELECT 
    s.id,
    s.cohort_id,
    c.name as cohort_name,
    s.metric_id,
    m.name as metric_name,
    s.period_type,
    s.period_start,
    -- Apply suppression
    CASE WHEN s.n_orgs >= 5 THEN s.n_orgs ELSE NULL END as n_orgs,
    CASE WHEN s.n_orgs >= 5 THEN s.p10 ELSE NULL END as p10,
    CASE WHEN s.n_orgs >= 5 THEN s.p25 ELSE NULL END as p25,
    CASE WHEN s.n_orgs >= 5 THEN s.p50 ELSE NULL END as p50,
    CASE WHEN s.n_orgs >= 5 THEN s.p75 ELSE NULL END as p75,
    CASE WHEN s.n_orgs >= 5 THEN s.p90 ELSE NULL END as p90,
    CASE WHEN s.n_orgs >= 5 THEN s.mean ELSE NULL END as mean,
    CASE WHEN s.n_orgs >= 5 THEN s.stddev ELSE NULL END as stddev,
    s.computed_at,
    (s.n_orgs < 5) as suppressed,
    CASE WHEN s.n_orgs < 5 THEN 'Insufficient sample size (min 5 orgs required)' ELSE NULL END as suppression_reason,
    CASE 
      WHEN s.n_orgs < 5 THEN 'suppressed'
      WHEN s.n_orgs >= 20 THEN 'high'
      WHEN s.n_orgs >= 10 THEN 'medium'
      ELSE 'low'
    END as confidence_label
  FROM public.benchmark_snapshots s
  LEFT JOIN public.benchmark_cohorts c ON c.id = s.cohort_id
  LEFT JOIN public.metrics m ON m.id = s.metric_id
  WHERE s.id = _snapshot_id;
END;
$$;

-- E) bench_get_aggregate_comparison - Jane vs Non-Jane with suppression
DROP FUNCTION IF EXISTS public.bench_get_aggregate_comparison(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.bench_get_aggregate_comparison(
  _metric_key TEXT,
  _period_key TEXT
)
RETURNS TABLE(
  metric_key TEXT,
  period_key TEXT,
  jane_n_orgs INTEGER,
  jane_p25 NUMERIC,
  jane_p50 NUMERIC,
  jane_p75 NUMERIC,
  jane_mean NUMERIC,
  non_jane_n_orgs INTEGER,
  non_jane_p25 NUMERIC,
  non_jane_p50 NUMERIC,
  non_jane_p75 NUMERIC,
  non_jane_mean NUMERIC,
  delta_p50 NUMERIC,
  delta_percent NUMERIC,
  jane_suppressed BOOLEAN,
  non_jane_suppressed BOOLEAN,
  confidence_label TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _jane_cohort_id UUID;
  _non_jane_cohort_id UUID;
  _jane_n INT;
  _non_jane_n INT;
  _metric_id UUID;
BEGIN
  -- Hard permission check
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Get cohort IDs
  SELECT id INTO _jane_cohort_id FROM public.benchmark_cohorts WHERE name = 'jane_users';
  SELECT id INTO _non_jane_cohort_id FROM public.benchmark_cohorts WHERE name = 'non_jane_users';

  -- Get metric ID (if key is a name, find it)
  SELECT id INTO _metric_id FROM public.metrics WHERE name = _metric_key OR id::TEXT = _metric_key LIMIT 1;

  -- Get sample sizes for suppression check
  SELECT n_orgs INTO _jane_n
  FROM public.benchmark_snapshots
  WHERE cohort_id = _jane_cohort_id 
    AND metric_id = _metric_id
    AND period_start::TEXT = _period_key
  ORDER BY computed_at DESC LIMIT 1;

  SELECT n_orgs INTO _non_jane_n
  FROM public.benchmark_snapshots
  WHERE cohort_id = _non_jane_cohort_id
    AND metric_id = _metric_id
    AND period_start::TEXT = _period_key
  ORDER BY computed_at DESC LIMIT 1;

  -- Audit log
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'get_aggregate_comparison',
    jsonb_build_object(
      'metric_key', _metric_key, 
      'period_key', _period_key,
      'jane_n', _jane_n,
      'non_jane_n', _non_jane_n,
      'jane_suppressed', COALESCE(_jane_n, 0) < 5,
      'non_jane_suppressed', COALESCE(_non_jane_n, 0) < 5
    )
  );

  RETURN QUERY
  WITH jane_data AS (
    SELECT s.*
    FROM public.benchmark_snapshots s
    WHERE s.cohort_id = _jane_cohort_id
      AND s.metric_id = _metric_id
      AND s.period_start::TEXT = _period_key
    ORDER BY s.computed_at DESC
    LIMIT 1
  ),
  non_jane_data AS (
    SELECT s.*
    FROM public.benchmark_snapshots s
    WHERE s.cohort_id = _non_jane_cohort_id
      AND s.metric_id = _metric_id
      AND s.period_start::TEXT = _period_key
    ORDER BY s.computed_at DESC
    LIMIT 1
  )
  SELECT
    _metric_key as metric_key,
    _period_key as period_key,
    -- Jane with suppression
    CASE WHEN COALESCE(j.n_orgs, 0) >= 5 THEN j.n_orgs ELSE NULL END as jane_n_orgs,
    CASE WHEN COALESCE(j.n_orgs, 0) >= 5 THEN j.p25 ELSE NULL END as jane_p25,
    CASE WHEN COALESCE(j.n_orgs, 0) >= 5 THEN j.p50 ELSE NULL END as jane_p50,
    CASE WHEN COALESCE(j.n_orgs, 0) >= 5 THEN j.p75 ELSE NULL END as jane_p75,
    CASE WHEN COALESCE(j.n_orgs, 0) >= 5 THEN j.mean ELSE NULL END as jane_mean,
    -- Non-Jane with suppression
    CASE WHEN COALESCE(nj.n_orgs, 0) >= 5 THEN nj.n_orgs ELSE NULL END as non_jane_n_orgs,
    CASE WHEN COALESCE(nj.n_orgs, 0) >= 5 THEN nj.p25 ELSE NULL END as non_jane_p25,
    CASE WHEN COALESCE(nj.n_orgs, 0) >= 5 THEN nj.p50 ELSE NULL END as non_jane_p50,
    CASE WHEN COALESCE(nj.n_orgs, 0) >= 5 THEN nj.p75 ELSE NULL END as non_jane_p75,
    CASE WHEN COALESCE(nj.n_orgs, 0) >= 5 THEN nj.mean ELSE NULL END as non_jane_mean,
    -- Delta (only if both unsuppressed)
    CASE 
      WHEN COALESCE(j.n_orgs, 0) >= 5 AND COALESCE(nj.n_orgs, 0) >= 5 
      THEN j.p50 - nj.p50 
      ELSE NULL 
    END as delta_p50,
    CASE 
      WHEN COALESCE(j.n_orgs, 0) >= 5 AND COALESCE(nj.n_orgs, 0) >= 5 AND nj.p50 != 0
      THEN ((j.p50 - nj.p50) / ABS(nj.p50)) * 100
      ELSE NULL 
    END as delta_percent,
    -- Suppression flags
    (COALESCE(j.n_orgs, 0) < 5) as jane_suppressed,
    (COALESCE(nj.n_orgs, 0) < 5) as non_jane_suppressed,
    -- Confidence label
    CASE
      WHEN COALESCE(j.n_orgs, 0) < 5 OR COALESCE(nj.n_orgs, 0) < 5 THEN 'suppressed'
      WHEN COALESCE(j.n_orgs, 0) >= 20 AND COALESCE(nj.n_orgs, 0) >= 20 THEN 'high'
      WHEN COALESCE(j.n_orgs, 0) >= 10 AND COALESCE(nj.n_orgs, 0) >= 10 THEN 'medium'
      ELSE 'low'
    END as confidence_label
  FROM jane_data j
  FULL OUTER JOIN non_jane_data nj ON true;
END;
$$;

-- Update bench_compute_snapshot to include suppression in output
DROP FUNCTION IF EXISTS public.bench_compute_snapshot(UUID, UUID, TEXT, DATE);
CREATE OR REPLACE FUNCTION public.bench_compute_snapshot(
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
  computed_at TIMESTAMPTZ,
  suppressed BOOLEAN,
  suppression_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result_id UUID;
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
  RETURNING benchmark_snapshots.id INTO _result_id;

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
      'n_orgs', COALESCE(_n_orgs, 0),
      'suppressed', COALESCE(_n_orgs, 0) < 5
    )
  );

  -- Return with suppression applied
  RETURN QUERY
  SELECT 
    _result_id as id,
    _cohort_id as cohort_id,
    _metric_id as metric_id,
    _period_type as period_type,
    _period_start as period_start,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _n_orgs ELSE NULL END as n_orgs,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p10 ELSE NULL END as p10,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p25 ELSE NULL END as p25,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p50 ELSE NULL END as p50,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p75 ELSE NULL END as p75,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p90 ELSE NULL END as p90,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _mean ELSE NULL END as mean,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _stddev ELSE NULL END as stddev,
    now() as computed_at,
    (COALESCE(_n_orgs, 0) < 5) as suppressed,
    CASE WHEN COALESCE(_n_orgs, 0) < 5 THEN 'Insufficient sample size (min 5 orgs required)' ELSE NULL END as suppression_reason;
END;
$$;

-- Ensure RLS on all benchmark tables blocks direct access
-- (already done in earlier migration, but reinforce)
DO $$
BEGIN
  -- Ensure RLS is enabled
  ALTER TABLE public.benchmark_cohorts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.benchmark_cohort_memberships ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.benchmark_snapshots ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.benchmark_audit_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.benchmark_metric_aggregates ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Tables may not exist yet
END;
$$;

-- Drop any existing open policies and replace with master-admin-only
DROP POLICY IF EXISTS "Master admins can select benchmark_cohorts" ON public.benchmark_cohorts;
DROP POLICY IF EXISTS "Master admins can insert benchmark_cohorts" ON public.benchmark_cohorts;
DROP POLICY IF EXISTS "Master admins can update benchmark_cohorts" ON public.benchmark_cohorts;
DROP POLICY IF EXISTS "Master admins can delete benchmark_cohorts" ON public.benchmark_cohorts;

CREATE POLICY "Master admins can select benchmark_cohorts" ON public.benchmark_cohorts
  FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "Master admins can insert benchmark_cohorts" ON public.benchmark_cohorts
  FOR INSERT TO authenticated WITH CHECK (public.is_master_admin());
CREATE POLICY "Master admins can update benchmark_cohorts" ON public.benchmark_cohorts
  FOR UPDATE TO authenticated USING (public.is_master_admin());
CREATE POLICY "Master admins can delete benchmark_cohorts" ON public.benchmark_cohorts
  FOR DELETE TO authenticated USING (public.is_master_admin());

DROP POLICY IF EXISTS "Master admins can select benchmark_cohort_memberships" ON public.benchmark_cohort_memberships;
DROP POLICY IF EXISTS "Master admins can insert benchmark_cohort_memberships" ON public.benchmark_cohort_memberships;
DROP POLICY IF EXISTS "Master admins can delete benchmark_cohort_memberships" ON public.benchmark_cohort_memberships;

CREATE POLICY "Master admins can select benchmark_cohort_memberships" ON public.benchmark_cohort_memberships
  FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "Master admins can insert benchmark_cohort_memberships" ON public.benchmark_cohort_memberships
  FOR INSERT TO authenticated WITH CHECK (public.is_master_admin());
CREATE POLICY "Master admins can delete benchmark_cohort_memberships" ON public.benchmark_cohort_memberships
  FOR DELETE TO authenticated USING (public.is_master_admin());

DROP POLICY IF EXISTS "Master admins can select benchmark_snapshots" ON public.benchmark_snapshots;
DROP POLICY IF EXISTS "Master admins can insert benchmark_snapshots" ON public.benchmark_snapshots;
DROP POLICY IF EXISTS "Master admins can update benchmark_snapshots" ON public.benchmark_snapshots;
DROP POLICY IF EXISTS "Master admins can delete benchmark_snapshots" ON public.benchmark_snapshots;

CREATE POLICY "Master admins can select benchmark_snapshots" ON public.benchmark_snapshots
  FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "Master admins can insert benchmark_snapshots" ON public.benchmark_snapshots
  FOR INSERT TO authenticated WITH CHECK (public.is_master_admin());
CREATE POLICY "Master admins can update benchmark_snapshots" ON public.benchmark_snapshots
  FOR UPDATE TO authenticated USING (public.is_master_admin());
CREATE POLICY "Master admins can delete benchmark_snapshots" ON public.benchmark_snapshots
  FOR DELETE TO authenticated USING (public.is_master_admin());

DROP POLICY IF EXISTS "Master admins can select benchmark_audit_log" ON public.benchmark_audit_log;
DROP POLICY IF EXISTS "Master admins can insert benchmark_audit_log" ON public.benchmark_audit_log;

CREATE POLICY "Master admins can select benchmark_audit_log" ON public.benchmark_audit_log
  FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "Master admins can insert benchmark_audit_log" ON public.benchmark_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);  -- RPCs insert as SECURITY DEFINER

DROP POLICY IF EXISTS "Master admins can select benchmark_metric_aggregates" ON public.benchmark_metric_aggregates;
DROP POLICY IF EXISTS "Master admins can insert benchmark_metric_aggregates" ON public.benchmark_metric_aggregates;
DROP POLICY IF EXISTS "Master admins can update benchmark_metric_aggregates" ON public.benchmark_metric_aggregates;
DROP POLICY IF EXISTS "Master admins can delete benchmark_metric_aggregates" ON public.benchmark_metric_aggregates;

CREATE POLICY "Master admins can select benchmark_metric_aggregates" ON public.benchmark_metric_aggregates
  FOR SELECT TO authenticated USING (public.is_master_admin());
CREATE POLICY "Master admins can insert benchmark_metric_aggregates" ON public.benchmark_metric_aggregates
  FOR INSERT TO authenticated WITH CHECK (public.is_master_admin());
CREATE POLICY "Master admins can update benchmark_metric_aggregates" ON public.benchmark_metric_aggregates
  FOR UPDATE TO authenticated USING (public.is_master_admin());
CREATE POLICY "Master admins can delete benchmark_metric_aggregates" ON public.benchmark_metric_aggregates
  FOR DELETE TO authenticated USING (public.is_master_admin());