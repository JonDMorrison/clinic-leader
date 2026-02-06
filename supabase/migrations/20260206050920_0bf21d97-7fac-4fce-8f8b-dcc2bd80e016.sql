-- ============================================================
-- ADMIN ACCESS ENFORCEMENT: Secure Intelligence Controls
-- ============================================================

-- 1. Create audit table for unauthorized access attempts
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  outcome TEXT NOT NULL, -- 'denied', 'allowed'
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for security audit log - only service role can write, admins can read
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_log;
CREATE POLICY "Service role can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Master admins can read audit logs" ON public.security_audit_log;
CREATE POLICY "Master admins can read audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (public.is_master_admin());

-- 2. Create helper function to check if user is org admin (owner/director)
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('owner', 'director')
  )
$$;

-- 3. Create function to log unauthorized access attempts
CREATE OR REPLACE FUNCTION public.log_unauthorized_access(
  _action TEXT,
  _resource TEXT,
  _details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource,
    outcome,
    details
  ) VALUES (
    auth.uid(),
    _action,
    _resource,
    'denied',
    _details
  );
END;
$$;

-- 4. Fix recompute_intervention_patterns to use proper role check
DROP FUNCTION IF EXISTS public.recompute_intervention_patterns();

CREATE FUNCTION public.recompute_intervention_patterns()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  run_id UUID;
BEGIN
  -- Check if caller is master admin or org admin
  IF NOT (public.is_master_admin() OR public.is_org_admin()) THEN
    -- Log unauthorized attempt
    PERFORM public.log_unauthorized_access(
      'recompute_intervention_patterns',
      'intervention_pattern_clusters',
      jsonb_build_object('attempted_by', auth.uid())
    );
    RAISE EXCEPTION 'Unauthorized: Admin access required' USING ERRCODE = 'P0403';
  END IF;

  run_id := gen_random_uuid();
  
  -- Log that admin triggered manual recompute
  INSERT INTO intervention_pattern_audit (
    cluster_run_id,
    start_time,
    status,
    version
  ) VALUES (
    run_id,
    now(),
    'pending',
    '3.0'
  );

  RETURN run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_intervention_patterns() TO authenticated;

-- 5. Create admin-gated purge synthetic data RPC
CREATE OR REPLACE FUNCTION public.purge_synthetic_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intervention_count INT;
  outcome_count INT;
  metric_result_count INT;
BEGIN
  -- Only master admins can purge synthetic data
  IF NOT public.is_master_admin() THEN
    PERFORM public.log_unauthorized_access(
      'purge_synthetic_data',
      'synthetic_data',
      jsonb_build_object('attempted_by', auth.uid())
    );
    RAISE EXCEPTION 'Unauthorized: Master admin access required' USING ERRCODE = 'P0403';
  END IF;

  -- Delete synthetic outcomes first (FK constraint)
  DELETE FROM public.intervention_outcomes WHERE is_synthetic = true;
  GET DIAGNOSTICS outcome_count = ROW_COUNT;

  -- Delete synthetic metric results
  DELETE FROM public.metric_results WHERE is_synthetic = true;
  GET DIAGNOSTICS metric_result_count = ROW_COUNT;

  -- Delete synthetic interventions (cascades to metric_links)
  DELETE FROM public.interventions WHERE is_synthetic = true;
  GET DIAGNOSTICS intervention_count = ROW_COUNT;

  -- Log successful purge in audit
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource,
    outcome,
    details
  ) VALUES (
    auth.uid(),
    'purge_synthetic_data',
    'synthetic_data',
    'allowed',
    jsonb_build_object(
      'interventions_deleted', intervention_count,
      'outcomes_deleted', outcome_count,
      'metric_results_deleted', metric_result_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'interventions', intervention_count,
      'outcomes', outcome_count,
      'metricResults', metric_result_count
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_synthetic_data() TO authenticated;

-- 6. Add comments
COMMENT ON FUNCTION public.is_org_admin IS 'Check if user is an organization admin (owner/director) via user_roles table';
COMMENT ON FUNCTION public.log_unauthorized_access IS 'Log unauthorized access attempts to security_audit_log';
COMMENT ON FUNCTION public.purge_synthetic_data IS 'Admin-only function to delete all synthetic simulation data';
COMMENT ON TABLE public.security_audit_log IS 'Audit log for security events including unauthorized access attempts';