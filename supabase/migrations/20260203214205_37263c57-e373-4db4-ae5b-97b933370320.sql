-- ============================================
-- PEER MATCHING FOR EMR COMPARISONS
-- Reduces selection bias by matching Jane to non-Jane orgs
-- ============================================

-- 1. Create bucketing functions
CREATE OR REPLACE FUNCTION public.get_provider_count_bucket(provider_count INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN provider_count IS NULL THEN 'unknown'
    WHEN provider_count <= 2 THEN '1-2'
    WHEN provider_count <= 5 THEN '3-5'
    WHEN provider_count <= 10 THEN '6-10'
    ELSE '11+'
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_visits_quartile_bucket(
  org_visits NUMERIC,
  cohort_p25 NUMERIC,
  cohort_p50 NUMERIC,
  cohort_p75 NUMERIC
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN org_visits IS NULL THEN 'unknown'
    WHEN org_visits <= cohort_p25 THEN 'q1'
    WHEN org_visits <= cohort_p50 THEN 'q2'
    WHEN org_visits <= cohort_p75 THEN 'q3'
    ELSE 'q4'
  END;
$$;

-- 2. Add peer matching columns to teams if not exists
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS provider_count INTEGER,
ADD COLUMN IF NOT EXISTS region TEXT;

-- 3. Create peer matching function
CREATE OR REPLACE FUNCTION public.bench_get_matched_comparison(
  _metric_key TEXT,
  _period_key TEXT,
  _use_peer_matching BOOLEAN DEFAULT false
)
RETURNS TABLE(
  metric_key TEXT,
  period_key TEXT,
  peer_matching_used BOOLEAN,
  peer_match_criteria TEXT,
  
  -- Jane group
  jane_sample_size INTEGER,
  jane_included_count INTEGER,
  jane_excluded_count INTEGER,
  jane_median NUMERIC,
  jane_p25 NUMERIC,
  jane_p75 NUMERIC,
  jane_std_deviation NUMERIC,
  jane_coefficient_of_variation NUMERIC,
  jane_quality_summary JSONB,
  
  -- Non-Jane group
  non_jane_sample_size INTEGER,
  non_jane_included_count INTEGER,
  non_jane_excluded_count INTEGER,
  non_jane_median NUMERIC,
  non_jane_p25 NUMERIC,
  non_jane_p75 NUMERIC,
  non_jane_std_deviation NUMERIC,
  non_jane_coefficient_of_variation NUMERIC,
  non_jane_quality_summary JSONB,
  
  -- Comparison
  delta_percent NUMERIC,
  
  -- Confidence
  confidence_label TEXT,
  confidence_reason TEXT,
  
  -- Suppression
  suppressed BOOLEAN,
  suppression_reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _jane_n INT;
  _non_jane_n INT;
  _jane_median NUMERIC;
  _non_jane_median NUMERIC;
  _jane_p25 NUMERIC;
  _jane_p75 NUMERIC;
  _non_jane_p25 NUMERIC;
  _non_jane_p75 NUMERIC;
  _jane_stddev NUMERIC;
  _non_jane_stddev NUMERIC;
  _jane_mean NUMERIC;
  _non_jane_mean NUMERIC;
  _jane_cv NUMERIC;
  _non_jane_cv NUMERIC;
  _jane_avg_quality NUMERIC;
  _non_jane_avg_quality NUMERIC;
  _delta NUMERIC;
  _confidence TEXT;
  _confidence_reason TEXT;
  _suppressed BOOLEAN := false;
  _suppression_reason TEXT;
  _match_criteria TEXT := NULL;
  _visits_p25 NUMERIC;
  _visits_p50 NUMERIC;
  _visits_p75 NUMERIC;
BEGIN
  -- Check master admin permission
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- If peer matching, compute visit quartiles first
  IF _use_peer_matching THEN
    WITH all_orgs AS (
      SELECT DISTINCT mr.organization_id, SUM(mr.value) as total_visits
      FROM public.metric_results mr
      JOIN public.metrics m ON m.id = mr.metric_id
      WHERE m.import_key = 'total_visits'
        AND mr.period_start >= (to_date(_period_key || '-01', 'YYYY-MM-DD') - INTERVAL '12 months')::DATE
        AND mr.period_start < to_date(_period_key || '-01', 'YYYY-MM-DD')
      GROUP BY mr.organization_id
    )
    SELECT 
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_visits),
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_visits),
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_visits)
    INTO _visits_p25, _visits_p50, _visits_p75
    FROM all_orgs;

    _match_criteria := 'provider_count_bucket,visits_quartile_bucket';
  END IF;

  -- Get Jane stats with optional peer matching
  WITH jane_orgs AS (
    SELECT t.id as org_id, t.provider_count, t.region
    FROM public.teams t
    WHERE t.emr_source_type = 'jane'
      AND EXISTS (
        SELECT 1 FROM public.org_passes_quality_gates(t.id, _period_key) qg WHERE qg.passes
      )
  ),
  jane_with_buckets AS (
    SELECT 
      jo.org_id,
      public.get_provider_count_bucket(jo.provider_count) as size_bucket,
      (SELECT public.get_visits_quartile_bucket(
        (SELECT SUM(mr.value) FROM public.metric_results mr 
         JOIN public.metrics m ON m.id = mr.metric_id 
         WHERE m.import_key = 'total_visits' 
           AND mr.organization_id = jo.org_id
           AND mr.period_start >= (to_date(_period_key || '-01', 'YYYY-MM-DD') - INTERVAL '12 months')::DATE),
        _visits_p25, _visits_p50, _visits_p75
      )) as visits_bucket,
      jo.region
    FROM jane_orgs jo
  ),
  jane_values AS (
    SELECT 
      jwb.org_id,
      jwb.size_bucket,
      jwb.visits_bucket,
      mr.value
    FROM jane_with_buckets jwb
    JOIN public.metric_results mr ON mr.organization_id = jwb.org_id
    JOIN public.metrics m ON m.id = mr.metric_id
    WHERE m.import_key = _metric_key
      AND to_char(mr.period_start, 'YYYY-MM') = _period_key
      AND mr.value IS NOT NULL
  )
  SELECT 
    COUNT(*)::INT,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value),
    STDDEV(value),
    AVG(value)
  INTO _jane_n, _jane_median, _jane_p25, _jane_p75, _jane_stddev, _jane_mean
  FROM jane_values;

  -- Get Non-Jane stats with optional peer matching
  WITH non_jane_orgs AS (
    SELECT t.id as org_id, t.provider_count, t.region
    FROM public.teams t
    WHERE t.emr_source_type != 'jane' AND t.emr_source_type IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.org_passes_quality_gates(t.id, _period_key) qg WHERE qg.passes
      )
  ),
  non_jane_with_buckets AS (
    SELECT 
      njo.org_id,
      public.get_provider_count_bucket(njo.provider_count) as size_bucket,
      (SELECT public.get_visits_quartile_bucket(
        (SELECT SUM(mr.value) FROM public.metric_results mr 
         JOIN public.metrics m ON m.id = mr.metric_id 
         WHERE m.import_key = 'total_visits' 
           AND mr.organization_id = njo.org_id
           AND mr.period_start >= (to_date(_period_key || '-01', 'YYYY-MM-DD') - INTERVAL '12 months')::DATE),
        _visits_p25, _visits_p50, _visits_p75
      )) as visits_bucket,
      njo.region
    FROM non_jane_orgs njo
  ),
  -- When peer matching, filter to buckets that exist in Jane cohort
  matched_non_jane AS (
    SELECT njwb.*
    FROM non_jane_with_buckets njwb
    WHERE NOT _use_peer_matching 
       OR EXISTS (
         SELECT 1 FROM (
           SELECT DISTINCT 
             public.get_provider_count_bucket(t.provider_count) as size_bucket,
             public.get_visits_quartile_bucket(
               (SELECT SUM(mr.value) FROM public.metric_results mr 
                JOIN public.metrics m ON m.id = mr.metric_id 
                WHERE m.import_key = 'total_visits' 
                  AND mr.organization_id = t.id
                  AND mr.period_start >= (to_date(_period_key || '-01', 'YYYY-MM-DD') - INTERVAL '12 months')::DATE),
               _visits_p25, _visits_p50, _visits_p75
             ) as visits_bucket
           FROM public.teams t
           WHERE t.emr_source_type = 'jane'
         ) jane_buckets
         WHERE jane_buckets.size_bucket = njwb.size_bucket 
           AND jane_buckets.visits_bucket = njwb.visits_bucket
       )
  ),
  non_jane_values AS (
    SELECT 
      mnj.org_id,
      mr.value
    FROM matched_non_jane mnj
    JOIN public.metric_results mr ON mr.organization_id = mnj.org_id
    JOIN public.metrics m ON m.id = mr.metric_id
    WHERE m.import_key = _metric_key
      AND to_char(mr.period_start, 'YYYY-MM') = _period_key
      AND mr.value IS NOT NULL
  )
  SELECT 
    COUNT(*)::INT,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value),
    STDDEV(value),
    AVG(value)
  INTO _non_jane_n, _non_jane_median, _non_jane_p25, _non_jane_p75, _non_jane_stddev, _non_jane_mean
  FROM non_jane_values;

  -- Calculate coefficients of variation
  _jane_cv := CASE WHEN COALESCE(_jane_mean, 0) != 0 
    THEN ROUND((_jane_stddev / _jane_mean * 100)::NUMERIC, 1) ELSE NULL END;
  _non_jane_cv := CASE WHEN COALESCE(_non_jane_mean, 0) != 0 
    THEN ROUND((_non_jane_stddev / _non_jane_mean * 100)::NUMERIC, 1) ELSE NULL END;

  -- Calculate delta
  _delta := CASE WHEN COALESCE(_non_jane_median, 0) != 0 
    THEN ROUND(((_jane_median - _non_jane_median) / _non_jane_median * 100)::NUMERIC, 1) 
    ELSE NULL END;

  -- Determine suppression
  IF COALESCE(_jane_n, 0) < 5 OR COALESCE(_non_jane_n, 0) < 5 THEN
    _suppressed := true;
    IF _use_peer_matching THEN
      _suppression_reason := 'Insufficient matched sample (min 5 orgs per group required after peer matching)';
    ELSE
      _suppression_reason := 'Insufficient sample size (min 5 orgs per group required)';
    END IF;
  END IF;

  -- Compute confidence label (deterministic rules)
  IF _suppressed THEN
    _confidence := 'insufficient_data';
    _confidence_reason := 'Sample size below minimum threshold';
  ELSIF COALESCE(_jane_n, 0) >= 20 AND COALESCE(_non_jane_n, 0) >= 20 THEN
    -- Check volatility
    IF COALESCE(_jane_cv, 100) < 30 AND COALESCE(_non_jane_cv, 100) < 30 THEN
      _confidence := 'high';
      _confidence_reason := '≥20 orgs per group with low volatility (CV<30%)';
    ELSE
      _confidence := 'medium';
      _confidence_reason := '≥20 orgs per group but high volatility detected';
    END IF;
  ELSIF COALESCE(_jane_n, 0) >= 10 AND COALESCE(_non_jane_n, 0) >= 10 THEN
    _confidence := 'medium';
    _confidence_reason := '10-19 orgs per group';
  ELSE
    _confidence := 'low';
    _confidence_reason := '5-9 orgs per group';
  END IF;

  -- Audit log
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'get_matched_comparison',
    jsonb_build_object(
      'metric_key', _metric_key,
      'period_key', _period_key,
      'peer_matching', _use_peer_matching,
      'jane_n', _jane_n,
      'non_jane_n', _non_jane_n,
      'confidence', _confidence,
      'suppressed', _suppressed
    )
  );

  -- Return results
  RETURN QUERY SELECT
    _metric_key as metric_key,
    _period_key as period_key,
    _use_peer_matching as peer_matching_used,
    _match_criteria as peer_match_criteria,
    
    -- Jane (suppressed if needed)
    CASE WHEN NOT _suppressed THEN _jane_n ELSE NULL END as jane_sample_size,
    _jane_n as jane_included_count,
    0 as jane_excluded_count,
    CASE WHEN NOT _suppressed THEN _jane_median ELSE NULL END as jane_median,
    CASE WHEN NOT _suppressed THEN _jane_p25 ELSE NULL END as jane_p25,
    CASE WHEN NOT _suppressed THEN _jane_p75 ELSE NULL END as jane_p75,
    CASE WHEN NOT _suppressed THEN _jane_stddev ELSE NULL END as jane_std_deviation,
    CASE WHEN NOT _suppressed THEN _jane_cv ELSE NULL END as jane_coefficient_of_variation,
    NULL::JSONB as jane_quality_summary,
    
    -- Non-Jane (suppressed if needed)
    CASE WHEN NOT _suppressed THEN _non_jane_n ELSE NULL END as non_jane_sample_size,
    _non_jane_n as non_jane_included_count,
    0 as non_jane_excluded_count,
    CASE WHEN NOT _suppressed THEN _non_jane_median ELSE NULL END as non_jane_median,
    CASE WHEN NOT _suppressed THEN _non_jane_p25 ELSE NULL END as non_jane_p25,
    CASE WHEN NOT _suppressed THEN _non_jane_p75 ELSE NULL END as non_jane_p75,
    CASE WHEN NOT _suppressed THEN _non_jane_stddev ELSE NULL END as non_jane_std_deviation,
    CASE WHEN NOT _suppressed THEN _non_jane_cv ELSE NULL END as non_jane_coefficient_of_variation,
    NULL::JSONB as non_jane_quality_summary,
    
    -- Comparison
    CASE WHEN NOT _suppressed THEN _delta ELSE NULL END as delta_percent,
    
    -- Confidence
    _confidence as confidence_label,
    _confidence_reason as confidence_reason,
    
    -- Suppression
    _suppressed as suppressed,
    _suppression_reason as suppression_reason;
END;
$$;