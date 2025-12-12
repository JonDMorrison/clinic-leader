-- Enhance org_core_values table with additional fields
ALTER TABLE public.org_core_values 
ADD COLUMN IF NOT EXISTS short_behavior text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Rename 'value' to 'title' for clarity (if column exists as 'value')
ALTER TABLE public.org_core_values 
RENAME COLUMN value TO title;

-- Rename 'position' to 'sort_order' for consistency
ALTER TABLE public.org_core_values 
RENAME COLUMN position TO sort_order;

-- Create core_value_spotlight table for "Value of the Week"
CREATE TABLE IF NOT EXISTS public.core_value_spotlight (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  current_core_value_id uuid REFERENCES public.org_core_values(id) ON DELETE SET NULL,
  rotation_mode text NOT NULL DEFAULT 'weekly',
  rotates_on_weekday integer DEFAULT 1,
  last_rotated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- Create core_value_shoutouts table for meeting recognition
CREATE TABLE IF NOT EXISTS public.core_value_shoutouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  recognized_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  core_value_id uuid REFERENCES public.org_core_values(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Create core_values_ack table for onboarding acknowledgment
CREATE TABLE IF NOT EXISTS public.core_values_ack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  acknowledged_at timestamptz DEFAULT now(),
  version_hash text,
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.core_value_spotlight ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_value_shoutouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_values_ack ENABLE ROW LEVEL SECURITY;

-- RLS for core_value_spotlight
CREATE POLICY "Team members can read spotlight"
ON public.core_value_spotlight FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Admins can manage spotlight"
ON public.core_value_spotlight FOR ALL
USING (is_admin() AND is_same_team(organization_id))
WITH CHECK (is_admin() AND is_same_team(organization_id));

-- RLS for core_value_shoutouts
CREATE POLICY "Team members can read shoutouts"
ON public.core_value_shoutouts FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Team members can create shoutouts"
ON public.core_value_shoutouts FOR INSERT
WITH CHECK (is_same_team(organization_id) AND created_by = current_user_id());

CREATE POLICY "Creators or admins can update shoutouts"
ON public.core_value_shoutouts FOR UPDATE
USING ((created_by = current_user_id()) OR is_admin());

CREATE POLICY "Creators or admins can delete shoutouts"
ON public.core_value_shoutouts FOR DELETE
USING ((created_by = current_user_id()) OR is_admin());

-- RLS for core_values_ack
CREATE POLICY "Users can read their own ack"
ON public.core_values_ack FOR SELECT
USING (user_id = current_user_id() OR is_admin());

CREATE POLICY "Users can insert their own ack"
ON public.core_values_ack FOR INSERT
WITH CHECK (user_id = current_user_id() AND is_same_team(organization_id));

-- Update RLS for org_core_values to allow admin management
DROP POLICY IF EXISTS "Admins can manage org core values" ON public.org_core_values;
CREATE POLICY "Admins can manage org core values"
ON public.org_core_values FOR ALL
USING (is_admin() AND is_same_team(organization_id))
WITH CHECK (is_admin() AND is_same_team(organization_id));

DROP POLICY IF EXISTS "Team members can read org core values" ON public.org_core_values;
CREATE POLICY "Team members can read org core values"
ON public.org_core_values FOR SELECT
USING (is_same_team(organization_id));