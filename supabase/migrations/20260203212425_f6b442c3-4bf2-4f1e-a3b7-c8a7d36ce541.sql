-- ============================================
-- HARDEN PREDICTIVE INTERVENTION RECOMMENDATION ENGINE
-- Trust + Determinism + Guardrails
-- ============================================

-- 1. Create intervention_types allowlist table
CREATE TABLE IF NOT EXISTS public.intervention_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  type_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, type_key)
);

-- Enable RLS
ALTER TABLE public.intervention_types ENABLE ROW LEVEL SECURITY;

-- Org members can read
CREATE POLICY "Org members can view intervention types"
ON public.intervention_types FOR SELECT
TO authenticated
USING (
  organization_id IS NULL -- Global types
  OR public.is_same_team(organization_id)
);

-- Manager+ can manage
CREATE POLICY "Managers can manage intervention types"
ON public.intervention_types FOR ALL
TO authenticated
USING (public.is_same_team(organization_id))
WITH CHECK (
  public.is_same_team(organization_id) 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'director', 'manager')
  )
);

-- Insert default approved intervention types (global)
INSERT INTO public.intervention_types (organization_id, type_key, display_name, description, is_enabled, is_sensitive)
VALUES
  (NULL, 'process_improvement', 'Process Improvement', 'Optimize existing workflows and procedures', true, false),
  (NULL, 'training', 'Training & Education', 'Staff training and skill development', true, false),
  (NULL, 'technology', 'Technology Enhancement', 'Software, tools, or automation improvements', true, false),
  (NULL, 'communication', 'Communication Improvement', 'Better information flow and coordination', true, false),
  (NULL, 'scheduling', 'Scheduling Optimization', 'Appointment and resource scheduling changes', true, false),
  (NULL, 'patient_outreach', 'Patient Outreach', 'Proactive patient engagement and follow-up', true, false),
  (NULL, 'quality_assurance', 'Quality Assurance', 'Quality control and monitoring programs', true, false),
  (NULL, 'workflow_redesign', 'Workflow Redesign', 'Major process restructuring', true, false),
  -- Sensitive types (disabled by default)
  (NULL, 'staffing_reduction', 'Staffing Reduction', 'Reducing staff headcount', false, true),
  (NULL, 'compensation_change', 'Compensation Change', 'Salary or bonus structure modifications', false, true),
  (NULL, 'termination', 'Termination', 'Employee separation actions', false, true)
ON CONFLICT (organization_id, type_key) DO NOTHING;

-- 2. Create recommendation_runs table for evidence freezing
CREATE TABLE IF NOT EXISTS public.recommendation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  run_period_start DATE NOT NULL,
  
  -- Input snapshot (frozen at generation time)
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Contains: current_value, target, deviation_percent, normalization_method, threshold_used
  
  -- Evidence snapshot (frozen at generation time)
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Contains: historical_cases, sample_size, success_rates, pattern_stats, filtered_reasons
  
  -- Output
  recommendations_generated INTEGER NOT NULL DEFAULT 0,
  model_version TEXT NOT NULL DEFAULT 'v1.0',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.recommendation_runs ENABLE ROW LEVEL SECURITY;

-- Org members can read
CREATE POLICY "Org members can view recommendation runs"
ON public.recommendation_runs FOR SELECT
TO authenticated
USING (public.is_same_team(organization_id));

-- Manager+ can create
CREATE POLICY "Managers can create recommendation runs"
ON public.recommendation_runs FOR INSERT
TO authenticated
WITH CHECK (
  public.is_same_team(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'director', 'manager')
  )
);

-- 3. Add recommendation_run_id to intervention_recommendations for traceability
ALTER TABLE public.intervention_recommendations
ADD COLUMN IF NOT EXISTS recommendation_run_id UUID REFERENCES public.recommendation_runs(id);

-- 4. Add cooldown tracking columns
ALTER TABLE public.intervention_recommendations
ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deviation_at_generation NUMERIC;

-- 5. Create recommendation eligibility configuration table
CREATE TABLE IF NOT EXISTS public.recommendation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, config_key)
);

-- Enable RLS
ALTER TABLE public.recommendation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view recommendation config"
ON public.recommendation_config FOR SELECT
TO authenticated
USING (public.is_same_team(organization_id));

CREATE POLICY "Managers can manage recommendation config"
ON public.recommendation_config FOR ALL
TO authenticated
USING (public.is_same_team(organization_id))
WITH CHECK (
  public.is_same_team(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'director', 'manager')
  )
);

-- Insert default configuration (global defaults)
INSERT INTO public.recommendation_config (organization_id, config_key, config_value)
VALUES
  (NULL, 'eligibility_thresholds', '{
    "min_deviation_percent": -10,
    "cooldown_days": 30,
    "min_sample_size": 3,
    "require_target": true
  }'::jsonb),
  (NULL, 'confidence_weights', '{
    "historical_success": 0.35,
    "sample_size": 0.25,
    "similarity": 0.25,
    "recency": 0.15
  }'::jsonb)
ON CONFLICT (organization_id, config_key) DO NOTHING;

-- 6. Create function to check if recommendation is in cooldown
CREATE OR REPLACE FUNCTION public.is_recommendation_in_cooldown(
  _org_id UUID,
  _metric_id UUID,
  _intervention_type TEXT,
  _current_deviation NUMERIC
)
RETURNS TABLE(
  in_cooldown BOOLEAN,
  reason TEXT,
  last_recommended_at TIMESTAMPTZ,
  deviation_worsened BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _config JSONB;
  _cooldown_days INTEGER;
  _last_rec RECORD;
BEGIN
  -- Get configuration
  SELECT config_value INTO _config
  FROM public.recommendation_config
  WHERE (organization_id = _org_id OR organization_id IS NULL)
    AND config_key = 'eligibility_thresholds'
  ORDER BY organization_id NULLS LAST
  LIMIT 1;
  
  _cooldown_days := COALESCE((_config->>'cooldown_days')::integer, 30);
  
  -- Find most recent recommendation for this metric/type
  SELECT 
    ir.last_generated_at,
    ir.deviation_at_generation
  INTO _last_rec
  FROM public.intervention_recommendations ir
  WHERE ir.organization_id = _org_id
    AND ir.metric_id = _metric_id
    AND (ir.recommended_intervention_template->>'intervention_type') = _intervention_type
    AND ir.last_generated_at IS NOT NULL
  ORDER BY ir.last_generated_at DESC
  LIMIT 1;
  
  -- No previous recommendation = not in cooldown
  IF _last_rec IS NULL THEN
    RETURN QUERY SELECT 
      false::boolean,
      NULL::text,
      NULL::timestamptz,
      false::boolean;
    RETURN;
  END IF;
  
  -- Check if deviation worsened
  DECLARE
    _deviation_worsened BOOLEAN := 
      _current_deviation IS NOT NULL 
      AND _last_rec.deviation_at_generation IS NOT NULL
      AND _current_deviation < _last_rec.deviation_at_generation;
  BEGIN
    -- If deviation worsened, bypass cooldown
    IF _deviation_worsened THEN
      RETURN QUERY SELECT 
        false::boolean,
        'Deviation worsened since last recommendation'::text,
        _last_rec.last_generated_at,
        true::boolean;
      RETURN;
    END IF;
    
    -- Check cooldown period
    IF _last_rec.last_generated_at > (now() - (_cooldown_days || ' days')::interval) THEN
      RETURN QUERY SELECT 
        true::boolean,
        format('In %s-day cooldown until %s', 
          _cooldown_days,
          (_last_rec.last_generated_at + (_cooldown_days || ' days')::interval)::date
        )::text,
        _last_rec.last_generated_at,
        false::boolean;
      RETURN;
    END IF;
    
    -- Not in cooldown
    RETURN QUERY SELECT 
      false::boolean,
      NULL::text,
      _last_rec.last_generated_at,
      false::boolean;
  END;
END;
$$;

-- 7. Create function to check metric eligibility for recommendations
CREATE OR REPLACE FUNCTION public.is_metric_eligible_for_recommendations(
  _metric_id UUID,
  _current_value NUMERIC
)
RETURNS TABLE(
  is_eligible BOOLEAN,
  reason TEXT,
  target NUMERIC,
  deviation_percent NUMERIC,
  threshold_used NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _metric RECORD;
  _config JSONB;
  _min_deviation NUMERIC;
  _deviation NUMERIC;
BEGIN
  -- Get metric
  SELECT m.id, m.name, m.target, m.direction, m.organization_id
  INTO _metric
  FROM public.metrics m
  WHERE m.id = _metric_id;
  
  IF _metric IS NULL THEN
    RETURN QUERY SELECT 
      false::boolean,
      'Metric not found'::text,
      NULL::numeric,
      NULL::numeric,
      NULL::numeric;
    RETURN;
  END IF;
  
  -- Rule 1: No target = no recommendations
  IF _metric.target IS NULL THEN
    RETURN QUERY SELECT 
      false::boolean,
      'Metric has no target set. Recommendations require a defined target.'::text,
      NULL::numeric,
      NULL::numeric,
      NULL::numeric;
    RETURN;
  END IF;
  
  -- Rule 2: No current value = cannot evaluate
  IF _current_value IS NULL THEN
    RETURN QUERY SELECT 
      false::boolean,
      'No current value available for this period.'::text,
      _metric.target,
      NULL::numeric,
      NULL::numeric;
    RETURN;
  END IF;
  
  -- Get configuration
  SELECT config_value INTO _config
  FROM public.recommendation_config
  WHERE (organization_id = _metric.organization_id OR organization_id IS NULL)
    AND config_key = 'eligibility_thresholds'
  ORDER BY organization_id NULLS LAST
  LIMIT 1;
  
  _min_deviation := COALESCE((_config->>'min_deviation_percent')::numeric, -10);
  
  -- Calculate deviation
  IF _metric.target = 0 THEN
    _deviation := 0;
  ELSE
    _deviation := ((_current_value - _metric.target) / ABS(_metric.target)) * 100;
  END IF;
  
  -- Rule 3: Check if off-track by threshold
  -- For "up" metrics, negative deviation = off-track
  -- For "down" metrics, positive deviation = off-track
  DECLARE
    _is_off_track BOOLEAN := false;
  BEGIN
    IF _metric.direction IN ('up', '>=') THEN
      _is_off_track := _deviation <= _min_deviation;
    ELSIF _metric.direction IN ('down', '<=') THEN
      _is_off_track := _deviation >= ABS(_min_deviation);
    ELSE
      -- Default to "up" behavior
      _is_off_track := _deviation <= _min_deviation;
    END IF;
    
    IF NOT _is_off_track THEN
      RETURN QUERY SELECT 
        false::boolean,
        format('Metric deviation (%.1f%%) does not meet threshold (%.1f%%). Metric is on-track or close to target.',
          _deviation, _min_deviation)::text,
        _metric.target,
        _deviation,
        _min_deviation;
      RETURN;
    END IF;
    
    -- Eligible
    RETURN QUERY SELECT 
      true::boolean,
      format('Metric is %.1f%% off-target (threshold: %.1f%%)', _deviation, _min_deviation)::text,
      _metric.target,
      _deviation,
      _min_deviation;
  END;
END;
$$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recommendation_runs_org_metric 
ON public.recommendation_runs(organization_id, metric_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_runs_period 
ON public.recommendation_runs(run_period_start);

CREATE INDEX IF NOT EXISTS idx_intervention_types_org_enabled 
ON public.intervention_types(organization_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_intervention_recs_cooldown 
ON public.intervention_recommendations(organization_id, metric_id, last_generated_at);