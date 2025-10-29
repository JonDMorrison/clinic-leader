-- Add onboarding fields to teams (organizations)
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS team_size INTEGER,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_region TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS unit_system TEXT DEFAULT 'imperial',
  ADD COLUMN IF NOT EXISTS ehr_system TEXT,
  ADD COLUMN IF NOT EXISTS review_cadence TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS meeting_rhythm TEXT,
  ADD COLUMN IF NOT EXISTS eos_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_report_email TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'draft';

-- Create onboarding_sessions table for draft progress
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  started_by UUID NOT NULL REFERENCES public.users(id),
  data JSONB DEFAULT '{}'::jsonb,
  step INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create org_core_values table
CREATE TABLE IF NOT EXISTS public.org_core_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_core_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_sessions
CREATE POLICY "Org members can read their onboarding sessions"
  ON public.onboarding_sessions FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Started by user or org owners can manage onboarding sessions"
  ON public.onboarding_sessions FOR ALL
  USING (started_by = current_user_id() OR is_admin())
  WITH CHECK (started_by = current_user_id() OR is_admin());

-- RLS Policies for org_core_values
CREATE POLICY "Org members can read core values"
  ON public.org_core_values FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Admins can manage core values"
  ON public.org_core_values FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_sessions_updated_at
  BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();