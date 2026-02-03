-- ============================================
-- DATA QUALITY GATING FOR BENCHMARKS
-- Prevents misleading conclusions by excluding low-quality orgs
-- ============================================

-- 1. Add quality metadata columns to benchmark_snapshots
ALTER TABLE public.benchmark_snapshots 
ADD COLUMN IF NOT EXISTS excluded_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS excluded_low_completeness INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS excluded_high_latency INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS excluded_low_consistency INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS included_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_summary JSONB DEFAULT '{}';

-- 2. Create quality thresholds config table
CREATE TABLE IF NOT EXISTS public.benchmark_quality_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_key TEXT UNIQUE NOT NULL,
  threshold_value NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default thresholds
INSERT INTO public.benchmark_quality_thresholds (threshold_key, threshold_value, description)
VALUES 
  ('min_completeness', 0.85, 'Minimum data completeness score (0-1)'),
  ('min_consistency', 0.80, 'Minimum data consistency score (0-1)'),
  ('max_latency_days', 45, 'Maximum reporting delay in days')
ON CONFLICT (threshold_key) DO NOTHING;

-- RLS for thresholds (master admin only)
ALTER TABLE public.benchmark_quality_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master admins can manage quality thresholds" ON public.benchmark_quality_thresholds;
CREATE POLICY "Master admins can manage quality thresholds" ON public.benchmark_quality_thresholds
  FOR ALL TO authenticated USING (public.is_master_admin());

-- 3. Function to check if org passes quality gates
CREATE OR REPLACE FUNCTION public.org_passes_quality_gates(
  _org_id UUID,
  _period_key TEXT
)
RETURNS TABLE(
  passes BOOLEAN,
  completeness_score NUMERIC,
  consistency_score NUMERIC,
  latency_score NUMERIC,
  avg_latency_hours NUMERIC,
  fail_reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min_completeness NUMERIC;
  _min_consistency NUMERIC;
  _max_latency_days NUMERIC;
  _quality RECORD;
BEGIN
  -- Get thresholds
  SELECT threshold_value INTO _min_completeness 
  FROM public.benchmark_quality_thresholds WHERE threshold_key = 'min_completeness';
  SELECT threshold_value INTO _min_consistency 
  FROM public.benchmark_quality_thresholds WHERE threshold_key = 'min_consistency';
  SELECT threshold_value INTO _max_latency_days 
  FROM public.benchmark_quality_thresholds WHERE threshold_key = 'max_latency_days';

  -- Get quality scores for this org/period
  SELECT 
    dqs.completeness_score,
    dqs.consistency_score,
    dqs.latency_score,
    dqs.avg_reporting_delay_hours
  INTO _quality
  FROM public.emr_data_quality_scores dqs
  WHERE dqs.organization_id = _org_id
    AND dqs.period_key = _period_key
  ORDER BY dqs.calculated_at DESC
  LIMIT 1;

  -- No quality data = fail
  IF _quality IS NULL THEN
    RETURN QUERY SELECT 
      false,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      'no_quality_data'::TEXT;
    RETURN;
  END IF;

  -- Check each threshold
  IF _quality.completeness_score < COALESCE(_min_completeness, 0.85) THEN
    RETURN QUERY SELECT 
      false,
      _quality.completeness_score,
      _quality.consistency_score,
      _quality.latency_score,
      _quality.avg_reporting_delay_hours,
      'low_completeness'::TEXT;
    RETURN;
  END IF;

  IF _quality.consistency_score < COALESCE(_min_consistency, 0.80) THEN
    RETURN QUERY SELECT 
      false,
      _quality.completeness_score,
      _quality.consistency_score,
      _quality.latency_score,
      _quality.avg_reporting_delay_hours,
      'low_consistency'::TEXT;
    RETURN;
  END IF;

  IF (_quality.avg_reporting_delay_hours / 24.0) > COALESCE(_max_latency_days, 45) THEN
    RETURN QUERY SELECT 
      false,
      _quality.completeness_score,
      _quality.consistency_score,
      _quality.latency_score,
      _quality.avg_reporting_delay_hours,
      'high_latency'::TEXT;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT 
    true,
    _quality.completeness_score,
    _quality.consistency_score,
    _quality.latency_score,
    _quality.avg_reporting_delay_hours,
    NULL::TEXT;
END;
$$;

-- 4. Update bench_compute_snapshot to apply quality gates
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
  included_count INTEGER,
  excluded_count INTEGER,
  excluded_low_completeness INTEGER,
  excluded_high_latency INTEGER,
  excluded_low_consistency INTEGER,
  p10 NUMERIC,
  p25 NUMERIC,
  p50 NUMERIC,
  p75 NUMERIC,
  p90 NUMERIC,
  mean NUMERIC,
  stddev NUMERIC,
  computed_at TIMESTAMPTZ,
  quality_summary JSONB,
  suppressed BOOLEAN,
  suppression_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result_id UUID;
  _period_key TEXT;
  _n_orgs INT := 0;
  _included INT := 0;
  _excluded INT := 0;
  _excluded_completeness INT := 0;
  _excluded_latency INT := 0;
  _excluded_consistency INT := 0;
  _p10 NUMERIC;
  _p25 NUMERIC;
  _p50 NUMERIC;
  _p75 NUMERIC;
  _p90 NUMERIC;
  _mean NUMERIC;
  _stddev NUMERIC;
  _quality_summary JSONB;
BEGIN
  -- Check master admin permission
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Validate period_type
  IF _period_type NOT IN ('monthly', 'weekly') THEN
    RAISE EXCEPTION 'Invalid period_type: must be monthly or weekly';
  END IF;

  _period_key := to_char(_period_start, 'YYYY-MM');

  -- First pass: identify which orgs pass quality gates
  WITH cohort_teams AS (
    SELECT team_id FROM public.benchmark_cohort_memberships WHERE cohort_id = _cohort_id
  ),
  team_quality AS (
    SELECT 
      ct.team_id,
      qg.passes,
      qg.completeness_score,
      qg.consistency_score,
      qg.latency_score,
      qg.avg_latency_hours,
      qg.fail_reason
    FROM cohort_teams ct
    CROSS JOIN LATERAL public.org_passes_quality_gates(ct.team_id, _period_key) qg
  ),
  exclusion_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE NOT passes) as excluded,
      COUNT(*) FILTER (WHERE fail_reason = 'low_completeness') as exc_completeness,
      COUNT(*) FILTER (WHERE fail_reason = 'high_latency') as exc_latency,
      COUNT(*) FILTER (WHERE fail_reason = 'low_consistency') as exc_consistency
    FROM team_quality
  ),
  quality_stats AS (
    SELECT
      AVG(completeness_score) FILTER (WHERE passes) as avg_completeness,
      AVG(consistency_score) FILTER (WHERE passes) as avg_consistency,
      AVG(avg_latency_hours / 24.0) FILTER (WHERE passes) as avg_latency_days
    FROM team_quality
  )
  SELECT 
    ec.excluded, ec.exc_completeness, ec.exc_latency, ec.exc_consistency,
    jsonb_build_object(
      'avg_completeness', ROUND(qs.avg_completeness::NUMERIC, 3),
      'avg_consistency', ROUND(qs.avg_consistency::NUMERIC, 3),
      'avg_latency_days', ROUND(qs.avg_latency_days::NUMERIC, 1)
    )
  INTO _excluded, _excluded_completeness, _excluded_latency, _excluded_consistency, _quality_summary
  FROM exclusion_counts ec, quality_stats qs;

  -- Second pass: compute aggregates only for qualifying orgs
  WITH cohort_teams AS (
    SELECT team_id FROM public.benchmark_cohort_memberships WHERE cohort_id = _cohort_id
  ),
  qualifying_teams AS (
    SELECT ct.team_id
    FROM cohort_teams ct
    WHERE (SELECT passes FROM public.org_passes_quality_gates(ct.team_id, _period_key))
  ),
  metric_values AS (
    SELECT 
      mr.organization_id,
      mr.value
    FROM public.metric_results mr
    WHERE mr.metric_id = _metric_id
      AND mr.organization_id IN (SELECT team_id FROM qualifying_teams)
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
  INTO _included, _p10, _p25, _p50, _p75, _p90, _mean, _stddev
  FROM metric_values;

  _n_orgs := COALESCE(_included, 0);

  -- Upsert into benchmark_snapshots
  INSERT INTO public.benchmark_snapshots (
    cohort_id, metric_id, period_type, period_start,
    n_orgs, included_count, excluded_count, 
    excluded_low_completeness, excluded_high_latency, excluded_low_consistency,
    p10, p25, p50, p75, p90, mean, stddev, quality_summary, computed_at
  )
  VALUES (
    _cohort_id, _metric_id, _period_type, _period_start,
    _n_orgs, _included, _excluded,
    _excluded_completeness, _excluded_latency, _excluded_consistency,
    _p10, _p25, _p50, _p75, _p90, _mean, _stddev, _quality_summary, now()
  )
  ON CONFLICT (cohort_id, metric_id, period_type, period_start)
  DO UPDATE SET
    n_orgs = _n_orgs,
    included_count = _included,
    excluded_count = _excluded,
    excluded_low_completeness = _excluded_completeness,
    excluded_high_latency = _excluded_latency,
    excluded_low_consistency = _excluded_consistency,
    p10 = _p10,
    p25 = _p25,
    p50 = _p50,
    p75 = _p75,
    p90 = _p90,
    mean = _mean,
    stddev = _stddev,
    quality_summary = _quality_summary,
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
      'included_count', COALESCE(_included, 0),
      'excluded_count', COALESCE(_excluded, 0),
      'excluded_low_completeness', COALESCE(_excluded_completeness, 0),
      'excluded_high_latency', COALESCE(_excluded_latency, 0),
      'excluded_low_consistency', COALESCE(_excluded_consistency, 0),
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
    _included as included_count,
    _excluded as excluded_count,
    _excluded_completeness as excluded_low_completeness,
    _excluded_latency as excluded_high_latency,
    _excluded_consistency as excluded_low_consistency,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p10 ELSE NULL END as p10,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p25 ELSE NULL END as p25,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p50 ELSE NULL END as p50,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p75 ELSE NULL END as p75,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _p90 ELSE NULL END as p90,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _mean ELSE NULL END as mean,
    CASE WHEN COALESCE(_n_orgs, 0) >= 5 THEN _stddev ELSE NULL END as stddev,
    now() as computed_at,
    _quality_summary as quality_summary,
    (COALESCE(_n_orgs, 0) < 5) as suppressed,
    CASE WHEN COALESCE(_n_orgs, 0) < 5 THEN 'Insufficient sample size (min 5 orgs required)' ELSE NULL END as suppression_reason;
END;
$$;

-- 5. Update bench_list_snapshots to include quality info
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
  included_count INTEGER,
  excluded_count INTEGER,
  excluded_low_completeness INTEGER,
  excluded_high_latency INTEGER,
  excluded_low_consistency INTEGER,
  p10 NUMERIC,
  p25 NUMERIC,
  p50 NUMERIC,
  p75 NUMERIC,
  p90 NUMERIC,
  mean NUMERIC,
  stddev NUMERIC,
  computed_at TIMESTAMPTZ,
  quality_summary JSONB,
  suppressed BOOLEAN,
  suppression_reason TEXT,
  high_exclusion_warning BOOLEAN
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
    COALESCE(s.included_count, s.n_orgs) as included_count,
    COALESCE(s.excluded_count, 0) as excluded_count,
    COALESCE(s.excluded_low_completeness, 0) as excluded_low_completeness,
    COALESCE(s.excluded_high_latency, 0) as excluded_high_latency,
    COALESCE(s.excluded_low_consistency, 0) as excluded_low_consistency,
    CASE WHEN s.n_orgs >= 5 THEN s.p10 ELSE NULL END as p10,
    CASE WHEN s.n_orgs >= 5 THEN s.p25 ELSE NULL END as p25,
    CASE WHEN s.n_orgs >= 5 THEN s.p50 ELSE NULL END as p50,
    CASE WHEN s.n_orgs >= 5 THEN s.p75 ELSE NULL END as p75,
    CASE WHEN s.n_orgs >= 5 THEN s.p90 ELSE NULL END as p90,
    CASE WHEN s.n_orgs >= 5 THEN s.mean ELSE NULL END as mean,
    CASE WHEN s.n_orgs >= 5 THEN s.stddev ELSE NULL END as stddev,
    s.computed_at,
    s.quality_summary,
    (s.n_orgs < 5) as suppressed,
    CASE WHEN s.n_orgs < 5 THEN 'Insufficient sample size (min 5 orgs required)' ELSE NULL END as suppression_reason,
    -- Warn if >30% excluded
    (COALESCE(s.excluded_count, 0)::FLOAT / NULLIF(COALESCE(s.included_count, s.n_orgs) + COALESCE(s.excluded_count, 0), 0) > 0.30) as high_exclusion_warning
  FROM public.benchmark_snapshots s
  LEFT JOIN public.metrics m ON m.id = s.metric_id
  WHERE s.cohort_id = _cohort_id
  ORDER BY s.period_start DESC, m.name
  LIMIT _limit;
END;
$$;

-- 6. Update bench_get_snapshot to include quality info
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
  included_count INTEGER,
  excluded_count INTEGER,
  excluded_low_completeness INTEGER,
  excluded_high_latency INTEGER,
  excluded_low_consistency INTEGER,
  p10 NUMERIC,
  p25 NUMERIC,
  p50 NUMERIC,
  p75 NUMERIC,
  p90 NUMERIC,
  mean NUMERIC,
  stddev NUMERIC,
  computed_at TIMESTAMPTZ,
  quality_summary JSONB,
  suppressed BOOLEAN,
  suppression_reason TEXT,
  confidence_label TEXT,
  high_exclusion_warning BOOLEAN,
  exclusion_rate NUMERIC
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
    COALESCE(s.included_count, s.n_orgs) as included_count,
    COALESCE(s.excluded_count, 0) as excluded_count,
    COALESCE(s.excluded_low_completeness, 0) as excluded_low_completeness,
    COALESCE(s.excluded_high_latency, 0) as excluded_high_latency,
    COALESCE(s.excluded_low_consistency, 0) as excluded_low_consistency,
    CASE WHEN s.n_orgs >= 5 THEN s.p10 ELSE NULL END as p10,
    CASE WHEN s.n_orgs >= 5 THEN s.p25 ELSE NULL END as p25,
    CASE WHEN s.n_orgs >= 5 THEN s.p50 ELSE NULL END as p50,
    CASE WHEN s.n_orgs >= 5 THEN s.p75 ELSE NULL END as p75,
    CASE WHEN s.n_orgs >= 5 THEN s.p90 ELSE NULL END as p90,
    CASE WHEN s.n_orgs >= 5 THEN s.mean ELSE NULL END as mean,
    CASE WHEN s.n_orgs >= 5 THEN s.stddev ELSE NULL END as stddev,
    s.computed_at,
    s.quality_summary,
    (s.n_orgs < 5) as suppressed,
    CASE WHEN s.n_orgs < 5 THEN 'Insufficient sample size (min 5 orgs required)' ELSE NULL END as suppression_reason,
    CASE 
      WHEN s.n_orgs < 5 THEN 'suppressed'
      WHEN s.n_orgs >= 20 THEN 'high'
      WHEN s.n_orgs >= 10 THEN 'medium'
      ELSE 'low'
    END as confidence_label,
    (COALESCE(s.excluded_count, 0)::FLOAT / NULLIF(COALESCE(s.included_count, s.n_orgs) + COALESCE(s.excluded_count, 0), 0) > 0.30) as high_exclusion_warning,
    ROUND((COALESCE(s.excluded_count, 0)::FLOAT / NULLIF(COALESCE(s.included_count, s.n_orgs) + COALESCE(s.excluded_count, 0), 0) * 100)::NUMERIC, 1) as exclusion_rate
  FROM public.benchmark_snapshots s
  LEFT JOIN public.benchmark_cohorts c ON c.id = s.cohort_id
  LEFT JOIN public.metrics m ON m.id = s.metric_id
  WHERE s.id = _snapshot_id;
END;
$$;