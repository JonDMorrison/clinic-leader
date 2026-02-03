-- ============================================
-- RPC: bench_refresh_default_cohorts()
-- Ensures jane_users and non_jane_users cohorts exist
-- Rebuilds memberships based on teams.data_mode
-- Master admin only
-- ============================================
CREATE OR REPLACE FUNCTION public.bench_refresh_default_cohorts()
RETURNS TABLE (
  jane_cohort_id UUID,
  non_jane_cohort_id UUID,
  jane_member_count INT,
  non_jane_member_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _jane_cohort_id UUID;
  _non_jane_cohort_id UUID;
  _jane_count INT;
  _non_jane_count INT;
BEGIN
  -- Check master admin permission
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Permission denied: Master admin access required';
  END IF;

  -- Ensure jane_users cohort exists
  INSERT INTO public.benchmark_cohorts (name, description)
  VALUES ('jane_users', 'Organizations using Jane EMR integration (data_mode = jane)')
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO _jane_cohort_id;

  -- Ensure non_jane_users cohort exists  
  INSERT INTO public.benchmark_cohorts (name, description)
  VALUES ('non_jane_users', 'Organizations not using Jane EMR (data_mode = default or other)')
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO _non_jane_cohort_id;

  -- Clear existing memberships for these cohorts
  DELETE FROM public.benchmark_cohort_memberships 
  WHERE cohort_id IN (_jane_cohort_id, _non_jane_cohort_id);

  -- Add Jane users to jane_users cohort
  INSERT INTO public.benchmark_cohort_memberships (cohort_id, team_id)
  SELECT _jane_cohort_id, t.id
  FROM public.teams t
  WHERE t.data_mode = 'jane';

  GET DIAGNOSTICS _jane_count = ROW_COUNT;

  -- Add non-Jane users to non_jane_users cohort
  INSERT INTO public.benchmark_cohort_memberships (cohort_id, team_id)
  SELECT _non_jane_cohort_id, t.id
  FROM public.teams t
  WHERE t.data_mode IS NULL 
     OR t.data_mode != 'jane';

  GET DIAGNOSTICS _non_jane_count = ROW_COUNT;

  -- Log the action
  INSERT INTO public.benchmark_audit_log (user_id, action, details)
  VALUES (
    auth.uid(),
    'refresh_default_cohorts',
    jsonb_build_object(
      'jane_cohort_id', _jane_cohort_id,
      'non_jane_cohort_id', _non_jane_cohort_id,
      'jane_member_count', _jane_count,
      'non_jane_member_count', _non_jane_count
    )
  );

  RETURN QUERY SELECT _jane_cohort_id, _non_jane_cohort_id, _jane_count, _non_jane_count;
END;
$$;