-- ============================================
-- METRIC SEMANTICS GOVERNANCE DATA MODEL
-- ============================================

-- Drop existing metric_normalization_rules (has different schema)
DROP TABLE IF EXISTS public.metric_normalization_rules CASCADE;

-- 1) metric_definitions - canonical metric meaning
CREATE TABLE IF NOT EXISTS public.metric_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE UNIQUE,
  canonical_name text NOT NULL,
  canonical_description text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('count', 'currency', 'percent', 'ratio')),
  higher_is_better boolean NOT NULL DEFAULT true,
  default_period_type text NOT NULL CHECK (default_period_type IN ('week', 'month')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view metric definitions for their org metrics" ON public.metric_definitions;
DROP POLICY IF EXISTS "Admins can manage metric definitions" ON public.metric_definitions;

CREATE POLICY "Users can view metric definitions for their org metrics"
ON public.metric_definitions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_definitions.metric_id
    AND is_same_team(m.organization_id)
  )
);

CREATE POLICY "Admins can manage metric definitions"
ON public.metric_definitions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_definitions.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

DROP TRIGGER IF EXISTS update_metric_definitions_updated_at ON public.metric_definitions;
CREATE TRIGGER update_metric_definitions_updated_at
BEFORE UPDATE ON public.metric_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) metric_normalization_rules - how to normalize values (RECREATED with proper schema)
CREATE TABLE public.metric_normalization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  normalization_type text NOT NULL CHECK (normalization_type IN ('none', 'per_provider', 'per_1000_visits', 'per_new_patient', 'per_patient_panel')),
  numerator_metric_id uuid NULL REFERENCES public.metrics(id),
  denominator_metric_id uuid NULL REFERENCES public.metrics(id),
  multiplier numeric NOT NULL DEFAULT 1,
  rounding_mode text NOT NULL DEFAULT 'none' CHECK (rounding_mode IN ('none', 'round', 'floor', 'ceil')),
  decimals int NOT NULL DEFAULT 2,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint on normalization combination
CREATE UNIQUE INDEX idx_metric_normalization_rules_unique
ON public.metric_normalization_rules (
  metric_id,
  normalization_type,
  COALESCE(numerator_metric_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(denominator_metric_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Partial unique index: only one default per metric
CREATE UNIQUE INDEX idx_metric_normalization_rules_one_default
ON public.metric_normalization_rules (metric_id)
WHERE is_default = true;

ALTER TABLE public.metric_normalization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view normalization rules for their org metrics"
ON public.metric_normalization_rules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_normalization_rules.metric_id
    AND is_same_team(m.organization_id)
  )
);

CREATE POLICY "Admins can manage normalization rules"
ON public.metric_normalization_rules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_normalization_rules.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

-- 3) metric_source_policies - allowed sources and priority
CREATE TABLE IF NOT EXISTS public.metric_source_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  source text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  requires_audit_pass boolean NOT NULL DEFAULT false,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(metric_id, source)
);

ALTER TABLE public.metric_source_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view source policies for their org metrics" ON public.metric_source_policies;
DROP POLICY IF EXISTS "Admins can manage source policies" ON public.metric_source_policies;

CREATE POLICY "Users can view source policies for their org metrics"
ON public.metric_source_policies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_source_policies.metric_id
    AND is_same_team(m.organization_id)
  )
);

CREATE POLICY "Admins can manage source policies"
ON public.metric_source_policies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_source_policies.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

-- 4) metric_precedence_overrides - org-specific overrides
CREATE TABLE IF NOT EXISTS public.metric_precedence_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('week', 'month')),
  source text NOT NULL,
  reason text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, metric_id, period_type)
);

ALTER TABLE public.metric_precedence_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view precedence overrides for their org" ON public.metric_precedence_overrides;
DROP POLICY IF EXISTS "Admins can manage precedence overrides" ON public.metric_precedence_overrides;

CREATE POLICY "Users can view precedence overrides for their org"
ON public.metric_precedence_overrides FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Admins can manage precedence overrides"
ON public.metric_precedence_overrides FOR ALL
USING (is_same_team(organization_id) AND is_admin());

-- 5) metric_canonical_results - the "chosen" result per metric+period
CREATE TABLE IF NOT EXISTS public.metric_canonical_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('week', 'month')),
  period_start date NOT NULL,
  value numeric NULL,
  chosen_source text NULL,
  chosen_metric_result_id uuid NULL,
  selection_reason text NOT NULL,
  selection_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, metric_id, period_type, period_start)
);

ALTER TABLE public.metric_canonical_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view canonical results for their org" ON public.metric_canonical_results;
DROP POLICY IF EXISTS "Admins can manage canonical results" ON public.metric_canonical_results;

CREATE POLICY "Users can view canonical results for their org"
ON public.metric_canonical_results FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Admins can manage canonical results"
ON public.metric_canonical_results FOR ALL
USING (is_same_team(organization_id) AND is_admin());

DROP INDEX IF EXISTS idx_metric_canonical_results_org_period;
DROP INDEX IF EXISTS idx_metric_canonical_results_metric_period;

CREATE INDEX idx_metric_canonical_results_org_period
ON public.metric_canonical_results (organization_id, period_type, period_start DESC);

CREATE INDEX idx_metric_canonical_results_metric_period
ON public.metric_canonical_results (metric_id, period_type, period_start DESC);

-- 6) metric_selection_audit_log - audit trail for selection decisions
CREATE TABLE IF NOT EXISTS public.metric_selection_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  metric_id uuid NOT NULL,
  period_type text NOT NULL,
  period_start date NOT NULL,
  candidate_sources jsonb NOT NULL,
  chosen jsonb NOT NULL,
  reason text NOT NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metric_selection_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view selection audit log for their org" ON public.metric_selection_audit_log;
DROP POLICY IF EXISTS "System can insert selection audit log" ON public.metric_selection_audit_log;

CREATE POLICY "Users can view selection audit log for their org"
ON public.metric_selection_audit_log FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "System can insert selection audit log"
ON public.metric_selection_audit_log FOR INSERT
WITH CHECK (is_same_team(organization_id));

DROP INDEX IF EXISTS idx_metric_selection_audit_log_org_metric;
CREATE INDEX idx_metric_selection_audit_log_org_metric
ON public.metric_selection_audit_log (organization_id, metric_id, period_start DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_canonical_source_priority(
  _metric_id uuid,
  _organization_id uuid,
  _period_type text
)
RETURNS TABLE (
  source text,
  priority int,
  requires_audit_pass boolean,
  is_override boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mpo.source,
    0 AS priority,
    false AS requires_audit_pass,
    true AS is_override
  FROM public.metric_precedence_overrides mpo
  WHERE mpo.metric_id = _metric_id
    AND mpo.organization_id = _organization_id
    AND mpo.period_type = _period_type
  
  UNION ALL
  
  SELECT 
    msp.source,
    msp.priority,
    msp.requires_audit_pass,
    false AS is_override
  FROM public.metric_source_policies msp
  WHERE msp.metric_id = _metric_id
    AND msp.is_allowed = true
  ORDER BY priority;
END;
$$;

CREATE OR REPLACE FUNCTION public.select_canonical_metric_result(
  _organization_id uuid,
  _metric_id uuid,
  _period_type text,
  _period_start date
)
RETURNS TABLE (
  metric_result_id uuid,
  value numeric,
  source text,
  selection_reason text,
  selection_meta jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _candidates jsonb := '[]'::jsonb;
  _chosen_id uuid;
  _chosen_value numeric;
  _chosen_source text;
  _reason text;
  _meta jsonb := '{}'::jsonb;
  _source_rec RECORD;
  _result_rec RECORD;
BEGIN
  FOR _source_rec IN
    SELECT * FROM public.get_canonical_source_priority(_metric_id, _organization_id, _period_type)
  LOOP
    FOR _result_rec IN
      SELECT mr.id, mr.value, mr.source, mr.created_at
      FROM public.metric_results mr
      WHERE mr.organization_id = _organization_id
        AND mr.metric_id = _metric_id
        AND mr.period_type = _period_type
        AND mr.period_start = _period_start
        AND mr.source = _source_rec.source
      ORDER BY mr.created_at DESC
      LIMIT 1
    LOOP
      _candidates := _candidates || jsonb_build_object(
        'id', _result_rec.id,
        'value', _result_rec.value,
        'source', _result_rec.source,
        'priority', _source_rec.priority,
        'requires_audit_pass', _source_rec.requires_audit_pass,
        'is_override', _source_rec.is_override
      );
      
      IF _chosen_id IS NULL THEN
        _chosen_id := _result_rec.id;
        _chosen_value := _result_rec.value;
        _chosen_source := _result_rec.source;
        
        IF _source_rec.is_override THEN
          _reason := 'Organization override: ' || _source_rec.source;
        ELSE
          _reason := 'Highest priority source (' || _source_rec.priority || '): ' || _source_rec.source;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  _meta := jsonb_build_object(
    'candidates', _candidates,
    'selected_at', now()
  );
  
  IF _chosen_id IS NULL THEN
    _reason := 'No valid source data available';
  END IF;
  
  RETURN QUERY SELECT _chosen_id, _chosen_value, _chosen_source, _reason, _meta;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.metric_definitions IS 'Canonical semantic definitions for metrics including unit, direction, and default period type';
COMMENT ON TABLE public.metric_normalization_rules IS 'Rules for normalizing metric values (e.g., per_provider, per_1000_visits)';
COMMENT ON TABLE public.metric_source_policies IS 'Allowed data sources per metric with priority ordering';
COMMENT ON TABLE public.metric_precedence_overrides IS 'Organization-specific overrides for source precedence';
COMMENT ON TABLE public.metric_canonical_results IS 'Materialized canonical result per metric+period after source selection';
COMMENT ON TABLE public.metric_selection_audit_log IS 'Audit trail of source selection decisions with all candidates considered';