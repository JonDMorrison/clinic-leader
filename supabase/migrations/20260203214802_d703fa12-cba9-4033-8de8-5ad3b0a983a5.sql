-- ============================================
-- RECOMMENDATION ENGINE HARDENING
-- Evidence snapshots, cooldown, target gating
-- ============================================

-- 1. Add missing columns to recommendation_runs if they don't exist
ALTER TABLE public.recommendation_runs 
ADD COLUMN IF NOT EXISTS inputs JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS recommendations JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS deviation_at_run NUMERIC,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Insert default config values into existing key-value config table
INSERT INTO public.recommendation_config (organization_id, config_key, config_value)
VALUES 
  (NULL, 'deviation_threshold_percent', '-10'),
  (NULL, 'min_sample_size', '3'),
  (NULL, 'cooldown_days', '30'),
  (NULL, 'cooldown_worsening_threshold', '5')
ON CONFLICT DO NOTHING;

-- 3. RLS Policies for recommendation_runs (drop if exist then recreate)
DROP POLICY IF EXISTS "Org members can read recommendation runs" ON public.recommendation_runs;
DROP POLICY IF EXISTS "Managers can create recommendation runs" ON public.recommendation_runs;

CREATE POLICY "Org members can read recommendation runs"
ON public.recommendation_runs
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);

-- Use correct role enum values: owner, director, manager
CREATE POLICY "Managers can create recommendation runs"
ON public.recommendation_runs
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'director', 'owner')
  )
);

-- 4. Helper function to get config value
CREATE OR REPLACE FUNCTION public.get_recommendation_config_value(
  _org_id UUID,
  _key TEXT,
  _default NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (config_value)::NUMERIC FROM public.recommendation_config 
     WHERE organization_id = _org_id AND config_key = _key),
    (SELECT (config_value)::NUMERIC FROM public.recommendation_config 
     WHERE organization_id IS NULL AND config_key = _key),
    _default
  );
$$;

-- 5. Function to check recommendation eligibility
CREATE OR REPLACE FUNCTION public.check_recommendation_eligibility(
  _org_id UUID,
  _metric_id UUID,
  _period_start DATE
)
RETURNS TABLE(
  eligible BOOLEAN,
  reason TEXT,
  current_value NUMERIC,
  target_value NUMERIC,
  deviation_percent NUMERIC,
  sample_size INTEGER,
  cooldown_active BOOLEAN,
  last_run_at TIMESTAMPTZ,
  last_deviation NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deviation_threshold NUMERIC;
  _min_sample NUMERIC;
  _cooldown_days NUMERIC;
  _cooldown_worsening NUMERIC;
  _metric RECORD;
  _current NUMERIC;
  _target NUMERIC;
  _deviation NUMERIC;
  _sample INT;
  _last_run RECORD;
  _cooldown_active BOOLEAN := false;
  _eligible BOOLEAN := true;
  _reason TEXT := 'eligible';
BEGIN
  -- Get config values
  _deviation_threshold := public.get_recommendation_config_value(_org_id, 'deviation_threshold_percent', -10);
  _min_sample := public.get_recommendation_config_value(_org_id, 'min_sample_size', 3);
  _cooldown_days := public.get_recommendation_config_value(_org_id, 'cooldown_days', 30);
  _cooldown_worsening := public.get_recommendation_config_value(_org_id, 'cooldown_worsening_threshold', 5);

  -- Get metric with target
  SELECT * INTO _metric
  FROM public.metrics m
  WHERE m.id = _metric_id;

  IF _metric IS NULL THEN
    RETURN QUERY SELECT false, 'Metric not found'::TEXT, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::INTEGER, false, NULL::TIMESTAMPTZ, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Check target exists
  IF _metric.target IS NULL THEN
    RETURN QUERY SELECT false, 'No target configured'::TEXT, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::INTEGER, false, NULL::TIMESTAMPTZ, NULL::NUMERIC;
    RETURN;
  END IF;

  _target := _metric.target;

  -- Get current value
  SELECT value INTO _current
  FROM public.metric_results
  WHERE metric_id = _metric_id
    AND organization_id = _org_id
    AND period_start = _period_start;

  IF _current IS NULL THEN
    RETURN QUERY SELECT false, 'No current value for period'::TEXT, NULL::NUMERIC, _target, NULL::NUMERIC, NULL::INTEGER, false, NULL::TIMESTAMPTZ, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Calculate deviation
  IF _target != 0 THEN
    _deviation := ((_current - _target) / ABS(_target)) * 100;
  ELSE
    _deviation := CASE WHEN _current > 0 THEN 100 ELSE 0 END;
  END IF;

  -- For metrics where lower is better (direction='down'), flip logic
  IF _metric.direction = 'down' THEN
    _deviation := -_deviation;
  END IF;

  -- Get sample size (count of historical periods with data)
  SELECT COUNT(*)::INT INTO _sample
  FROM public.metric_results
  WHERE metric_id = _metric_id
    AND organization_id = _org_id
    AND period_start < _period_start
    AND value IS NOT NULL;

  -- Check minimum sample size
  IF _sample < _min_sample THEN
    _eligible := false;
    _reason := format('Insufficient history (%s periods, need %s)', _sample, _min_sample::INT);
  END IF;

  -- Check deviation threshold (only recommend when below target)
  IF _eligible AND _deviation > _deviation_threshold THEN
    _eligible := false;
    _reason := format('At %.1f%% vs target (threshold: %.1f%%)', _deviation, _deviation_threshold);
  END IF;

  -- Check cooldown
  SELECT * INTO _last_run
  FROM public.recommendation_runs
  WHERE organization_id = _org_id
    AND metric_id = _metric_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF _last_run IS NOT NULL THEN
    IF _last_run.created_at > (now() - (_cooldown_days || ' days')::INTERVAL) THEN
      -- Check if deviation worsened enough to bypass cooldown
      IF _last_run.deviation_at_run IS NOT NULL AND _deviation <= (_last_run.deviation_at_run - _cooldown_worsening) THEN
        _cooldown_active := false;
      ELSE
        _cooldown_active := true;
        IF _eligible THEN
          _eligible := false;
          _reason := format('Cooldown until %s', (_last_run.created_at + (_cooldown_days || ' days')::INTERVAL)::DATE);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT 
    _eligible,
    _reason,
    _current,
    _target,
    ROUND(_deviation, 2),
    _sample,
    _cooldown_active,
    _last_run.created_at,
    _last_run.deviation_at_run;
END;
$$;

-- 6. Function to get recommendation run with eligibility info
CREATE OR REPLACE FUNCTION public.get_recommendation_run(
  _org_id UUID,
  _metric_id UUID,
  _period_start DATE
)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  metric_id UUID,
  period_start DATE,
  inputs JSONB,
  evidence JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ,
  eligible BOOLEAN,
  ineligibility_reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _run RECORD;
  _elig RECORD;
BEGIN
  -- First check eligibility
  SELECT * INTO _elig
  FROM public.check_recommendation_eligibility(_org_id, _metric_id, _period_start);

  -- Try to get existing run
  SELECT * INTO _run
  FROM public.recommendation_runs rr
  WHERE rr.organization_id = _org_id
    AND rr.metric_id = _metric_id
    AND rr.period_start = _period_start;

  IF _run IS NOT NULL THEN
    RETURN QUERY SELECT 
      _run.id,
      _run.organization_id,
      _run.metric_id,
      _run.period_start,
      _run.inputs,
      _run.evidence,
      _run.recommendations,
      _run.created_at,
      true,
      NULL::TEXT;
  ELSE
    RETURN QUERY SELECT 
      NULL::UUID,
      _org_id,
      _metric_id,
      _period_start,
      NULL::JSONB,
      NULL::JSONB,
      NULL::JSONB,
      NULL::TIMESTAMPTZ,
      _elig.eligible,
      _elig.reason;
  END IF;
END;
$$;