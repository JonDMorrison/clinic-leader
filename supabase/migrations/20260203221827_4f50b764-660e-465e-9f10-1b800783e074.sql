-- ============================================
-- CANONICAL METRIC SELECTION ENGINE
-- ============================================

-- 1. Add selection_meta column to metric_results if not exists
ALTER TABLE public.metric_results 
ADD COLUMN IF NOT EXISTS selection_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.metric_results.selection_meta IS 
  'Metadata for canonical selection: audit_status (PASS/FAIL/N_A), provenance, etc.';

-- ============================================
-- 2. MAIN RPC: compute_metric_canonical_results
-- Computes canonical result for a single metric+org+period
-- ============================================

CREATE OR REPLACE FUNCTION public.compute_metric_canonical_results(
  _org_id uuid,
  _metric_id uuid,
  _period_type text,
  _period_start date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_authorized boolean;
  _candidates jsonb := '[]'::jsonb;
  _chosen_id uuid;
  _chosen_value numeric;
  _chosen_source text;
  _reason text;
  _override_source text;
  _override_reason text;
  _source_policy RECORD;
  _result_rec RECORD;
  _has_override boolean := false;
  _audit_required boolean;
  _audit_status text;
  _result_meta jsonb;
BEGIN
  -- ========================================
  -- AUTHORIZATION CHECK
  -- ========================================
  -- Check if caller is org admin or has service role context
  SELECT (
    is_same_team(_org_id) AND is_admin()
  ) OR (
    -- Service role check: current_setting returns 'service_role' for service key
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  ) INTO _is_authorized;
  
  IF NOT _is_authorized THEN
    RAISE EXCEPTION 'Permission denied: requires org admin or service role';
  END IF;

  -- ========================================
  -- CHECK FOR PRECEDENCE OVERRIDE
  -- ========================================
  SELECT source, reason 
  INTO _override_source, _override_reason
  FROM public.metric_precedence_overrides
  WHERE organization_id = _org_id
    AND metric_id = _metric_id
    AND period_type = _period_type;
  
  IF _override_source IS NOT NULL THEN
    _has_override := true;
  END IF;

  -- ========================================
  -- GATHER CANDIDATES BY SOURCE PRIORITY
  -- ========================================
  FOR _source_policy IN
    SELECT 
      msp.source,
      msp.priority,
      msp.requires_audit_pass,
      msp.is_allowed
    FROM public.metric_source_policies msp
    WHERE msp.metric_id = _metric_id
      AND msp.is_allowed = true
    ORDER BY 
      -- If override exists, prioritize that source
      CASE WHEN _has_override AND msp.source = _override_source THEN 0 ELSE 1 END,
      msp.priority ASC
  LOOP
    -- Find metric_results for this source
    FOR _result_rec IN
      SELECT 
        mr.id,
        mr.value,
        mr.source,
        mr.created_at,
        mr.selection_meta
      FROM public.metric_results mr
      WHERE mr.organization_id = _org_id
        AND mr.metric_id = _metric_id
        AND mr.period_type = _period_type
        AND mr.period_start = _period_start
        AND mr.source = _source_policy.source
      ORDER BY mr.created_at DESC
      LIMIT 1
    LOOP
      -- Check audit requirement
      _audit_required := _source_policy.requires_audit_pass;
      _audit_status := COALESCE(_result_rec.selection_meta->>'audit_status', 'N/A');
      
      -- Build candidate entry
      _candidates := _candidates || jsonb_build_object(
        'id', _result_rec.id,
        'value', _result_rec.value,
        'source', _result_rec.source,
        'priority', _source_policy.priority,
        'requires_audit_pass', _audit_required,
        'audit_status', _audit_status,
        'created_at', _result_rec.created_at,
        'is_override_match', _has_override AND _source_policy.source = _override_source
      );
      
      -- Selection logic: choose first valid candidate
      IF _chosen_id IS NULL THEN
        -- Check if audit requirement is met
        IF _audit_required AND _audit_status NOT IN ('PASS', 'N/A') THEN
          -- Skip this candidate, audit not passed
          CONTINUE;
        END IF;
        
        -- This is our chosen candidate
        _chosen_id := _result_rec.id;
        _chosen_value := _result_rec.value;
        _chosen_source := _result_rec.source;
        
        IF _has_override AND _source_policy.source = _override_source THEN
          _reason := format('Organization override: %s (%s)', _override_source, _override_reason);
        ELSE
          _reason := format('Highest priority allowed source (priority %s): %s', _source_policy.priority, _source_policy.source);
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- ========================================
  -- HANDLE NO CANDIDATES
  -- ========================================
  IF _chosen_id IS NULL THEN
    -- Check if we had candidates but all failed audit
    IF jsonb_array_length(_candidates) > 0 THEN
      _reason := 'No valid candidates: all sources failed audit requirements';
    ELSE
      _reason := 'No data available from any allowed source';
    END IF;
  END IF;

  -- ========================================
  -- BUILD RESULT METADATA
  -- ========================================
  _result_meta := jsonb_build_object(
    'candidates', _candidates,
    'candidate_count', jsonb_array_length(_candidates),
    'has_override', _has_override,
    'override_source', _override_source,
    'selected_at', now(),
    'computed_by', auth.uid()
  );

  -- ========================================
  -- UPSERT CANONICAL RESULT
  -- ========================================
  INSERT INTO public.metric_canonical_results (
    organization_id,
    metric_id,
    period_type,
    period_start,
    value,
    chosen_source,
    chosen_metric_result_id,
    selection_reason,
    selection_meta,
    computed_at
  ) VALUES (
    _org_id,
    _metric_id,
    _period_type,
    _period_start,
    _chosen_value,
    _chosen_source,
    _chosen_id,
    _reason,
    _result_meta,
    now()
  )
  ON CONFLICT (organization_id, metric_id, period_type, period_start)
  DO UPDATE SET
    value = EXCLUDED.value,
    chosen_source = EXCLUDED.chosen_source,
    chosen_metric_result_id = EXCLUDED.chosen_metric_result_id,
    selection_reason = EXCLUDED.selection_reason,
    selection_meta = EXCLUDED.selection_meta,
    computed_at = EXCLUDED.computed_at;

  -- ========================================
  -- INSERT AUDIT LOG
  -- ========================================
  INSERT INTO public.metric_selection_audit_log (
    organization_id,
    metric_id,
    period_type,
    period_start,
    candidate_sources,
    chosen,
    reason,
    created_by,
    created_at
  ) VALUES (
    _org_id,
    _metric_id,
    _period_type,
    _period_start,
    _candidates,
    jsonb_build_object(
      'id', _chosen_id,
      'value', _chosen_value,
      'source', _chosen_source
    ),
    _reason,
    auth.uid(),
    now()
  );

  -- ========================================
  -- RETURN RESULT SUMMARY
  -- ========================================
  RETURN jsonb_build_object(
    'success', true,
    'metric_id', _metric_id,
    'period_type', _period_type,
    'period_start', _period_start,
    'chosen_source', _chosen_source,
    'chosen_value', _chosen_value,
    'candidate_count', jsonb_array_length(_candidates),
    'reason', _reason
  );
END;
$$;

COMMENT ON FUNCTION public.compute_metric_canonical_results IS 
  'Computes canonical result for a metric+org+period using source policies and overrides';

-- ============================================
-- 3. BATCH RPC: compute_canonical_for_month
-- Computes canonical results for all monthly metrics in an org
-- ============================================

CREATE OR REPLACE FUNCTION public.compute_canonical_for_month(
  _org_id uuid,
  _month_start date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_authorized boolean;
  _metric RECORD;
  _result jsonb;
  _results jsonb := '[]'::jsonb;
  _success_count int := 0;
  _error_count int := 0;
  _total_count int := 0;
BEGIN
  -- ========================================
  -- AUTHORIZATION CHECK
  -- ========================================
  SELECT (
    is_same_team(_org_id) AND is_admin()
  ) OR (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  ) INTO _is_authorized;
  
  IF NOT _is_authorized THEN
    RAISE EXCEPTION 'Permission denied: requires org admin or service role';
  END IF;

  -- ========================================
  -- ITERATE ALL MONTHLY METRICS FOR ORG
  -- ========================================
  FOR _metric IN
    SELECT m.id, m.name, m.import_key
    FROM public.metrics m
    LEFT JOIN public.metric_definitions md ON md.metric_id = m.id
    WHERE m.organization_id = _org_id
      AND m.is_active = true
      AND (
        -- Either has monthly default in definition
        md.default_period_type = 'month'
        -- Or metric cadence is monthly
        OR m.cadence = 'monthly'
      )
  LOOP
    _total_count := _total_count + 1;
    
    BEGIN
      -- Compute canonical result for this metric
      _result := public.compute_metric_canonical_results(
        _org_id,
        _metric.id,
        'month',
        _month_start
      );
      
      _results := _results || jsonb_build_object(
        'metric_id', _metric.id,
        'metric_name', _metric.name,
        'import_key', _metric.import_key,
        'result', _result
      );
      
      IF (_result->>'success')::boolean THEN
        _success_count := _success_count + 1;
      ELSE
        _error_count := _error_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      _error_count := _error_count + 1;
      _results := _results || jsonb_build_object(
        'metric_id', _metric.id,
        'metric_name', _metric.name,
        'import_key', _metric.import_key,
        'error', SQLERRM
      );
    END;
  END LOOP;

  -- ========================================
  -- RETURN BATCH SUMMARY
  -- ========================================
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'month_start', _month_start,
    'total_metrics', _total_count,
    'success_count', _success_count,
    'error_count', _error_count,
    'results', _results,
    'computed_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.compute_canonical_for_month IS 
  'Batch computes canonical results for all monthly metrics in an organization';

-- ============================================
-- 4. HELPER: compute_canonical_for_week
-- Same as month but for weekly metrics
-- ============================================

CREATE OR REPLACE FUNCTION public.compute_canonical_for_week(
  _org_id uuid,
  _week_start date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_authorized boolean;
  _metric RECORD;
  _result jsonb;
  _results jsonb := '[]'::jsonb;
  _success_count int := 0;
  _error_count int := 0;
  _total_count int := 0;
BEGIN
  -- Authorization check
  SELECT (
    is_same_team(_org_id) AND is_admin()
  ) OR (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  ) INTO _is_authorized;
  
  IF NOT _is_authorized THEN
    RAISE EXCEPTION 'Permission denied: requires org admin or service role';
  END IF;

  -- Iterate weekly metrics
  FOR _metric IN
    SELECT m.id, m.name, m.import_key
    FROM public.metrics m
    LEFT JOIN public.metric_definitions md ON md.metric_id = m.id
    WHERE m.organization_id = _org_id
      AND m.is_active = true
      AND (
        md.default_period_type = 'week'
        OR m.cadence = 'weekly'
        OR (md.default_period_type IS NULL AND m.cadence IS NULL) -- default to weekly
      )
  LOOP
    _total_count := _total_count + 1;
    
    BEGIN
      _result := public.compute_metric_canonical_results(
        _org_id,
        _metric.id,
        'week',
        _week_start
      );
      
      _results := _results || jsonb_build_object(
        'metric_id', _metric.id,
        'metric_name', _metric.name,
        'import_key', _metric.import_key,
        'result', _result
      );
      
      IF (_result->>'success')::boolean THEN
        _success_count := _success_count + 1;
      ELSE
        _error_count := _error_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      _error_count := _error_count + 1;
      _results := _results || jsonb_build_object(
        'metric_id', _metric.id,
        'metric_name', _metric.name,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'week_start', _week_start,
    'total_metrics', _total_count,
    'success_count', _success_count,
    'error_count', _error_count,
    'results', _results,
    'computed_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.compute_canonical_for_week IS 
  'Batch computes canonical results for all weekly metrics in an organization';

-- ============================================
-- 5. Index for selection_meta queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_metric_results_selection_meta_audit
ON public.metric_results ((selection_meta->>'audit_status'))
WHERE selection_meta->>'audit_status' IS NOT NULL;