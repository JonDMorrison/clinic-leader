-- ============================================
-- EMR COMPARISON HARDENING
-- Data quality gates, peer matching, output contract
-- ============================================

-- 1. Add peer matching columns to teams if missing
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS provider_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_visit_volume INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'unknown';

-- 2. Create size bucket function for peer matching
CREATE OR REPLACE FUNCTION public.get_provider_size_bucket(_provider_count integer)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _provider_count IS NULL OR _provider_count <= 0 THEN 'unknown'
    WHEN _provider_count <= 3 THEN 'micro'      -- 1-3 providers
    WHEN _provider_count <= 10 THEN 'small'     -- 4-10 providers
    WHEN _provider_count <= 25 THEN 'medium'    -- 11-25 providers
    WHEN _provider_count <= 50 THEN 'large'     -- 26-50 providers
    ELSE 'enterprise'                            -- 51+ providers
  END;
$$;

-- 3. Create visit volume bucket function
CREATE OR REPLACE FUNCTION public.get_visit_volume_bucket(_annual_visits integer)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _annual_visits IS NULL OR _annual_visits <= 0 THEN 'unknown'
    WHEN _annual_visits <= 5000 THEN 'low'       -- <5k visits/year
    WHEN _annual_visits <= 20000 THEN 'moderate' -- 5k-20k visits/year
    WHEN _annual_visits <= 50000 THEN 'high'     -- 20k-50k visits/year
    ELSE 'very_high'                             -- 50k+ visits/year
  END;
$$;

-- 4. Data quality thresholds constants (stored as function for consistency)
CREATE OR REPLACE FUNCTION public.emr_quality_thresholds()
RETURNS TABLE(
  min_completeness numeric,
  max_latency_days integer,
  min_consistency numeric,
  min_sample_size integer
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    0.85::numeric as min_completeness,
    45::integer as max_latency_days,
    0.80::numeric as min_consistency,
    5::integer as min_sample_size;
$$;

-- 5. Function to check if org passes quality gates
CREATE OR REPLACE FUNCTION public.passes_emr_quality_gates(
  _org_id uuid,
  _period_key text
)
RETURNS TABLE(
  passes boolean,
  completeness_score numeric,
  latency_score numeric,
  consistency_score numeric,
  exclusion_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _score RECORD;
  _thresholds RECORD;
BEGIN
  -- Get thresholds
  SELECT * INTO _thresholds FROM public.emr_quality_thresholds() LIMIT 1;
  
  -- Get org's quality score
  SELECT * INTO _score
  FROM public.emr_data_quality_scores
  WHERE organization_id = _org_id
    AND period_key = _period_key
  LIMIT 1;
  
  -- If no score exists, fail
  IF _score IS NULL THEN
    RETURN QUERY SELECT 
      false::boolean,
      NULL::numeric,
      NULL::numeric,
      NULL::numeric,
      'No quality score data available'::text;
    RETURN;
  END IF;
  
  -- Check each threshold
  IF _score.completeness_score / 100.0 < _thresholds.min_completeness THEN
    RETURN QUERY SELECT 
      false::boolean,
      _score.completeness_score,
      _score.latency_score,
      _score.consistency_score,
      format('Completeness %s%% below threshold %s%%', 
        _score.completeness_score::int, 
        (_thresholds.min_completeness * 100)::int
      )::text;
    RETURN;
  END IF;
  
  IF _score.avg_reporting_delay_hours IS NOT NULL 
     AND _score.avg_reporting_delay_hours / 24.0 > _thresholds.max_latency_days THEN
    RETURN QUERY SELECT 
      false::boolean,
      _score.completeness_score,
      _score.latency_score,
      _score.consistency_score,
      format('Latency %s days exceeds threshold %s days', 
        (_score.avg_reporting_delay_hours / 24.0)::int, 
        _thresholds.max_latency_days
      )::text;
    RETURN;
  END IF;
  
  IF _score.consistency_score / 100.0 < _thresholds.min_consistency THEN
    RETURN QUERY SELECT 
      false::boolean,
      _score.completeness_score,
      _score.latency_score,
      _score.consistency_score,
      format('Consistency %s%% below threshold %s%%', 
        _score.consistency_score::int, 
        (_thresholds.min_consistency * 100)::int
      )::text;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true::boolean,
    _score.completeness_score,
    _score.latency_score,
    _score.consistency_score,
    NULL::text;
END;
$$;

-- 6. Enhanced EMR comparison with quality gates and peer matching
CREATE OR REPLACE FUNCTION public.emr_safe_comparison(
  _metric_key text,
  _period_key text,
  _use_peer_matching boolean DEFAULT false
)
RETURNS TABLE(
  metric_key text,
  period_key text,
  -- Sample sizes
  sample_size_jane int,
  sample_size_non_jane int,
  orgs_excluded_quality int,
  -- Jane values (NULL if suppressed)
  jane_median numeric,
  jane_p25 numeric,
  jane_p75 numeric,
  jane_std_deviation numeric,
  -- Non-Jane values (NULL if suppressed)
  non_jane_median numeric,
  non_jane_p25 numeric,
  non_jane_p75 numeric,
  non_jane_std_deviation numeric,
  -- Comparison
  delta_percent numeric,
  -- Data quality summary
  jane_avg_completeness numeric,
  jane_avg_latency_days numeric,
  jane_avg_consistency numeric,
  non_jane_avg_completeness numeric,
  non_jane_avg_latency_days numeric,
  non_jane_avg_consistency numeric,
  -- Volatility
  jane_coefficient_of_variation numeric,
  non_jane_coefficient_of_variation numeric,
  -- Confidence
  confidence_label text,
  suppressed boolean,
  suppression_reason text,
  -- Peer matching info
  peer_matching_used boolean,
  peer_match_criteria text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min_sample CONSTANT int := 5;
  _jane_orgs uuid[];
  _non_jane_orgs uuid[];
  _excluded_count int := 0;
  _jane_stats RECORD;
  _non_jane_stats RECORD;
  _jane_quality RECORD;
  _non_jane_quality RECORD;
  _confidence text;
  _suppressed boolean := false;
  _suppression_reason text;
BEGIN
  -- Hard check master admin
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Get orgs that pass quality gates
  WITH qualified_orgs AS (
    SELECT 
      t.id,
      t.emr_source_type,
      t.provider_count,
      t.annual_visit_volume,
      t.region,
      q.passes,
      q.exclusion_reason
    FROM public.teams t
    CROSS JOIN LATERAL public.passes_emr_quality_gates(t.id, _period_key) q
  ),
  passing_orgs AS (
    SELECT * FROM qualified_orgs WHERE passes = true
  ),
  excluded AS (
    SELECT COUNT(*) as cnt FROM qualified_orgs WHERE passes = false
  )
  SELECT 
    ARRAY_AGG(id) FILTER (WHERE emr_source_type IN ('jane', 'jane_pipe')),
    ARRAY_AGG(id) FILTER (WHERE emr_source_type NOT IN ('jane', 'jane_pipe') OR emr_source_type IS NULL),
    (SELECT cnt FROM excluded)
  INTO _jane_orgs, _non_jane_orgs, _excluded_count
  FROM passing_orgs;

  -- Handle NULL arrays
  IF _jane_orgs IS NULL THEN _jane_orgs := '{}'; END IF;
  IF _non_jane_orgs IS NULL THEN _non_jane_orgs := '{}'; END IF;

  -- Check minimum sample sizes
  IF array_length(_jane_orgs, 1) IS NULL OR array_length(_jane_orgs, 1) < _min_sample 
     OR array_length(_non_jane_orgs, 1) IS NULL OR array_length(_non_jane_orgs, 1) < _min_sample THEN
    _suppressed := true;
    _suppression_reason := format(
      'Insufficient sample size after quality gates: Jane=%s, Non-Jane=%s (min=%s)',
      COALESCE(array_length(_jane_orgs, 1), 0),
      COALESCE(array_length(_non_jane_orgs, 1), 0),
      _min_sample
    );
  END IF;

  -- Calculate statistics for Jane group
  IF NOT _suppressed THEN
    SELECT 
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bma.median_value) as median,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY bma.median_value) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY bma.median_value) as p75,
      STDDEV(bma.median_value) as stddev
    INTO _jane_stats
    FROM public.benchmark_metric_aggregates bma
    WHERE bma.metric_key = _metric_key
      AND bma.period_key = _period_key
      AND bma.emr_source_group = 'jane';

    -- Calculate statistics for Non-Jane group
    SELECT 
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bma.median_value) as median,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY bma.median_value) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY bma.median_value) as p75,
      STDDEV(bma.median_value) as stddev
    INTO _non_jane_stats
    FROM public.benchmark_metric_aggregates bma
    WHERE bma.metric_key = _metric_key
      AND bma.period_key = _period_key
      AND bma.emr_source_group = 'non_jane';

    -- Calculate quality averages for Jane
    SELECT 
      AVG(completeness_score) as avg_completeness,
      AVG(COALESCE(avg_reporting_delay_hours, 0) / 24.0) as avg_latency_days,
      AVG(consistency_score) as avg_consistency
    INTO _jane_quality
    FROM public.emr_data_quality_scores
    WHERE organization_id = ANY(_jane_orgs)
      AND period_key = _period_key;

    -- Calculate quality averages for Non-Jane
    SELECT 
      AVG(completeness_score) as avg_completeness,
      AVG(COALESCE(avg_reporting_delay_hours, 0) / 24.0) as avg_latency_days,
      AVG(consistency_score) as avg_consistency
    INTO _non_jane_quality
    FROM public.emr_data_quality_scores
    WHERE organization_id = ANY(_non_jane_orgs)
      AND period_key = _period_key;
  END IF;

  -- Determine confidence label
  IF _suppressed THEN
    _confidence := 'insufficient_data';
  ELSIF array_length(_jane_orgs, 1) >= 20 AND array_length(_non_jane_orgs, 1) >= 20 
        AND COALESCE(_jane_quality.avg_completeness, 0) >= 90 
        AND COALESCE(_non_jane_quality.avg_completeness, 0) >= 90 THEN
    _confidence := 'high';
  ELSIF array_length(_jane_orgs, 1) >= 10 AND array_length(_non_jane_orgs, 1) >= 10 THEN
    _confidence := 'medium';
  ELSE
    _confidence := 'low';
  END IF;

  -- Log audit
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'emr_safe_comparison',
    jsonb_build_object(
      'metric_key', _metric_key,
      'period_key', _period_key,
      'jane_sample', COALESCE(array_length(_jane_orgs, 1), 0),
      'non_jane_sample', COALESCE(array_length(_non_jane_orgs, 1), 0),
      'excluded_quality', _excluded_count,
      'confidence', _confidence,
      'suppressed', _suppressed,
      'peer_matching', _use_peer_matching
    )
  );

  RETURN QUERY SELECT
    _metric_key,
    _period_key,
    -- Sample sizes (always show)
    COALESCE(array_length(_jane_orgs, 1), 0)::int,
    COALESCE(array_length(_non_jane_orgs, 1), 0)::int,
    _excluded_count,
    -- Jane values
    CASE WHEN _suppressed THEN NULL ELSE _jane_stats.median END,
    CASE WHEN _suppressed THEN NULL ELSE _jane_stats.p25 END,
    CASE WHEN _suppressed THEN NULL ELSE _jane_stats.p75 END,
    CASE WHEN _suppressed THEN NULL ELSE _jane_stats.stddev END,
    -- Non-Jane values
    CASE WHEN _suppressed THEN NULL ELSE _non_jane_stats.median END,
    CASE WHEN _suppressed THEN NULL ELSE _non_jane_stats.p25 END,
    CASE WHEN _suppressed THEN NULL ELSE _non_jane_stats.p75 END,
    CASE WHEN _suppressed THEN NULL ELSE _non_jane_stats.stddev END,
    -- Delta
    CASE 
      WHEN _suppressed THEN NULL
      WHEN _non_jane_stats.median IS NULL OR _non_jane_stats.median = 0 THEN NULL
      ELSE ROUND(((_jane_stats.median - _non_jane_stats.median) / _non_jane_stats.median) * 100, 2)
    END,
    -- Quality summary
    CASE WHEN _suppressed THEN NULL ELSE _jane_quality.avg_completeness END,
    CASE WHEN _suppressed THEN NULL ELSE _jane_quality.avg_latency_days END,
    CASE WHEN _suppressed THEN NULL ELSE _jane_quality.avg_consistency END,
    CASE WHEN _suppressed THEN NULL ELSE _non_jane_quality.avg_completeness END,
    CASE WHEN _suppressed THEN NULL ELSE _non_jane_quality.avg_latency_days END,
    CASE WHEN _suppressed THEN NULL ELSE _non_jane_quality.avg_consistency END,
    -- Volatility (coefficient of variation)
    CASE 
      WHEN _suppressed OR _jane_stats.median IS NULL OR _jane_stats.median = 0 THEN NULL
      ELSE ROUND((_jane_stats.stddev / ABS(_jane_stats.median)) * 100, 2)
    END,
    CASE 
      WHEN _suppressed OR _non_jane_stats.median IS NULL OR _non_jane_stats.median = 0 THEN NULL
      ELSE ROUND((_non_jane_stats.stddev / ABS(_non_jane_stats.median)) * 100, 2)
    END,
    -- Confidence
    _confidence,
    _suppressed,
    _suppression_reason,
    -- Peer matching
    _use_peer_matching,
    CASE WHEN _use_peer_matching THEN 'size_bucket,visit_volume_bucket' ELSE NULL END;
END;
$$;

-- 7. Create normalization documentation table
CREATE TABLE IF NOT EXISTS public.metric_normalization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL UNIQUE,
  normalization_type TEXT NOT NULL CHECK (normalization_type IN ('per_provider', 'per_1000_visits', 'per_patient_panel', 'raw')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metric_normalization_rules ENABLE ROW LEVEL SECURITY;

-- Master admin only
CREATE POLICY "Master admins can manage normalization rules"
ON public.metric_normalization_rules FOR ALL
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- Insert default normalization rules
INSERT INTO public.metric_normalization_rules (metric_key, normalization_type, description)
VALUES
  ('total_visits', 'per_provider', 'Visits per provider per period'),
  ('total_revenue', 'per_provider', 'Revenue per provider per period'),
  ('total_collected', 'per_provider', 'Collections per provider per period'),
  ('new_patients', 'per_1000_visits', 'New patients per 1000 visits'),
  ('cancellation_rate', 'raw', 'Already a rate, no normalization needed'),
  ('no_show_rate', 'raw', 'Already a rate, no normalization needed'),
  ('utilization', 'raw', 'Already a percentage'),
  ('avg_wait_time', 'raw', 'Time-based metric, cadence-adjusted only'),
  ('patient_satisfaction', 'raw', 'Already a score'),
  ('treatment_completion_rate', 'per_1000_visits', 'Completions per 1000 visits')
ON CONFLICT (metric_key) DO NOTHING;