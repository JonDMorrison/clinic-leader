
-- RPC: set_team_data_mode
-- Enforces permission (owner/director/manager only), updates teams.data_mode and ehr_system,
-- and writes an audit event to configuration_events atomically.
CREATE OR REPLACE FUNCTION public.set_team_data_mode(
  p_team_id uuid,
  p_data_mode text,
  p_ehr_system text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_old_data_mode text;
  v_old_ehr_system text;
  v_user_role text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check user belongs to this team
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = v_user_id AND team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Check user has admin/manager role
  SELECT role INTO v_user_role
  FROM public.user_roles
  WHERE user_id = v_user_id;

  IF v_user_role IS NULL OR v_user_role NOT IN ('owner', 'director', 'manager') THEN
    RAISE EXCEPTION 'Insufficient permissions: requires owner, director, or manager role';
  END IF;

  -- Validate data_mode
  IF p_data_mode NOT IN ('jane', 'default') THEN
    RAISE EXCEPTION 'Invalid data_mode: must be jane or default';
  END IF;

  -- Get old values
  SELECT data_mode, ehr_system INTO v_old_data_mode, v_old_ehr_system
  FROM public.teams
  WHERE id = p_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Update team
  UPDATE public.teams
  SET 
    data_mode = p_data_mode,
    ehr_system = COALESCE(p_ehr_system, ehr_system)
  WHERE id = p_team_id;

  -- Write audit event
  INSERT INTO public.configuration_events (
    organization_id,
    user_id,
    event_type,
    event_data
  ) VALUES (
    p_team_id,
    v_user_id,
    'data_mode_changed',
    jsonb_build_object(
      'from', jsonb_build_object('data_mode', v_old_data_mode, 'ehr_system', v_old_ehr_system),
      'to', jsonb_build_object('data_mode', p_data_mode, 'ehr_system', COALESCE(p_ehr_system, v_old_ehr_system)),
      'reason', 'user_action',
      'source', 'settings/data'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_data_mode', v_old_data_mode,
    'new_data_mode', p_data_mode,
    'old_ehr_system', v_old_ehr_system,
    'new_ehr_system', COALESCE(p_ehr_system, v_old_ehr_system)
  );
END;
$$;
