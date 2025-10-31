-- Phase 3: Fix Default Team Assignment and Add Naming Documentation

-- ============================================
-- 3.1 Fix handle_new_user() Trigger
-- Remove automatic team assignment fallback
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Critical Change: NO automatic team assignment
  -- Users MUST go through proper onboarding to be assigned to an organization
  -- This prevents security issues where users could be auto-added to wrong orgs
  
  -- Insert into public.users table WITHOUT team_id
  -- team_id will be set during onboarding process
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    team_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'staff', -- Default role, will be updated during onboarding
    NULL -- MUST be set during onboarding, never auto-assigned
  );

  RETURN NEW;
END;
$function$;

-- ============================================
-- 3.2 Add Database Documentation
-- Document the naming convention inconsistency
-- ============================================

COMMENT ON COLUMN users.team_id IS 'References teams.id (organization). Note: Some tables use team_id, others use organization_id - both refer to the same concept.';

COMMENT ON TABLE teams IS 'Organizations/practices. Note: Referenced as team_id in some tables and organization_id in others.';

-- ============================================
-- 3.3 Add Validation to Prevent Orphaned Users
-- ============================================

-- Add check to ensure users table operations respect tenant isolation
CREATE OR REPLACE FUNCTION validate_user_team_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow NULL team_id only for brand new users (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- New users can have NULL team_id initially
    -- Will be set during onboarding
    RETURN NEW;
  END IF;

  -- For UPDATE, ensure team_id is not NULL unless user is being deactivated
  IF TG_OP = 'UPDATE' AND NEW.team_id IS NULL THEN
    RAISE EXCEPTION 'Cannot remove user from organization. Users must belong to an organization.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger to validate team assignments
DROP TRIGGER IF EXISTS validate_user_team_trigger ON users;
CREATE TRIGGER validate_user_team_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_team_assignment();

-- ============================================
-- 3.4 Standardize Critical Tables
-- Rename team_id to organization_id for consistency
-- ============================================

-- Note: We're NOT renaming users.team_id because it's too deeply integrated
-- Instead, we'll standardize other tables and update RLS policies

-- ai_agendas: team_id -> organization_id
ALTER TABLE ai_agendas RENAME COLUMN team_id TO organization_id;

-- Update RLS policies for ai_agendas
DROP POLICY IF EXISTS "Admins can manage ai_agendas" ON ai_agendas;
DROP POLICY IF EXISTS "Managers can manage team ai_agendas" ON ai_agendas;
DROP POLICY IF EXISTS "Team members can read ai_agendas" ON ai_agendas;

CREATE POLICY "Admins can manage org ai_agendas"
  ON ai_agendas FOR ALL
  USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can manage org ai_agendas"
  ON ai_agendas FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org ai_agendas"
  ON ai_agendas FOR SELECT
  USING (is_same_team(organization_id));

-- demo_provision: team_id -> organization_id
ALTER TABLE demo_provision RENAME COLUMN team_id TO organization_id;

-- Update RLS for demo_provision
DROP POLICY IF EXISTS "Admins can manage demo_provision" ON demo_provision;
DROP POLICY IF EXISTS "Demo users can read own provision" ON demo_provision;

CREATE POLICY "Admins can manage demo_provision"
  ON demo_provision FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Demo users can read own provision"
  ON demo_provision FOR SELECT
  USING (user_id = current_user_id());

-- help_dismissed: team_id -> organization_id
ALTER TABLE help_dismissed RENAME COLUMN team_id TO organization_id;

-- help_events: team_id -> organization_id
ALTER TABLE help_events RENAME COLUMN team_id TO organization_id;

-- Update RLS for help_events
DROP POLICY IF EXISTS "Managers can read team help events" ON help_events;

CREATE POLICY "Managers can read org help events"
  ON help_events FOR SELECT
  USING (is_manager() AND is_same_team(organization_id));

-- issues: team_id -> organization_id
ALTER TABLE issues RENAME COLUMN team_id TO organization_id;

-- Update RLS for issues
DROP POLICY IF EXISTS "Managers can manage team issues" ON issues;
DROP POLICY IF EXISTS "Staff can read team issues" ON issues;

CREATE POLICY "Managers can manage org issues"
  ON issues FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Staff can read org issues"
  ON issues FOR SELECT
  USING (is_same_team(organization_id));

-- jane_integrations: team_id -> organization_id
ALTER TABLE jane_integrations RENAME COLUMN team_id TO organization_id;

-- Update RLS for jane_integrations
DROP POLICY IF EXISTS "Managers can manage team jane_integrations" ON jane_integrations;
DROP POLICY IF EXISTS "Team members can read jane_integrations" ON jane_integrations;

CREATE POLICY "Managers can manage org jane_integrations"
  ON jane_integrations FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org jane_integrations"
  ON jane_integrations FOR SELECT
  USING (is_same_team(organization_id));

-- meetings: team_id -> organization_id
ALTER TABLE meetings RENAME COLUMN team_id TO organization_id;

-- Update RLS for meetings
DROP POLICY IF EXISTS "Managers can manage team meetings" ON meetings;
DROP POLICY IF EXISTS "Team members can read meetings" ON meetings;

CREATE POLICY "Managers can manage org meetings"
  ON meetings FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org meetings"
  ON meetings FOR SELECT
  USING (is_same_team(organization_id));

-- reports: team_id -> organization_id
ALTER TABLE reports RENAME COLUMN team_id TO organization_id;

-- Update RLS for reports
DROP POLICY IF EXISTS "Managers can manage team reports" ON reports;
DROP POLICY IF EXISTS "Staff can read current week report" ON reports;

CREATE POLICY "Managers can manage org reports"
  ON reports FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Staff can read current week report"
  ON reports FOR SELECT
  USING (is_same_team(organization_id) AND week_start >= (CURRENT_DATE - interval '7 days')::date);

-- vto: team_id -> organization_id
ALTER TABLE vto RENAME COLUMN team_id TO organization_id;

-- vto_preset_events: team_id -> organization_id
ALTER TABLE vto_preset_events RENAME COLUMN team_id TO organization_id;

-- ============================================
-- Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_agendas_organization_id ON ai_agendas(organization_id);
CREATE INDEX IF NOT EXISTS idx_demo_provision_organization_id ON demo_provision(organization_id);
CREATE INDEX IF NOT EXISTS idx_help_dismissed_organization_id ON help_dismissed(organization_id);
CREATE INDEX IF NOT EXISTS idx_help_events_organization_id ON help_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_issues_organization_id ON issues(organization_id);
CREATE INDEX IF NOT EXISTS idx_jane_integrations_organization_id ON jane_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_organization_id ON reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_vto_organization_id ON vto(organization_id);
CREATE INDEX IF NOT EXISTS idx_vto_preset_events_organization_id ON vto_preset_events(organization_id);

-- ============================================
-- Documentation
-- ============================================

COMMENT ON DATABASE postgres IS 'Naming Convention: organization_id is the standard column name for tenant isolation. users.team_id references teams table (organization). Both team_id and organization_id refer to the same concept throughout the schema.';