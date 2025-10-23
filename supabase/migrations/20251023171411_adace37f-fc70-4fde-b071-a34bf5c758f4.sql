-- Extend user_tour_status with organization and team tracking
ALTER TABLE public.user_tour_status
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing records to populate organization_id from users table
UPDATE public.user_tour_status uts
SET organization_id = u.team_id
FROM public.users u
WHERE uts.user_id = u.id
AND uts.organization_id IS NULL;

-- Create RPC function for onboarding metrics
CREATE OR REPLACE FUNCTION public.get_onboarding_metrics(org_id UUID)
RETURNS TABLE (
  total_users BIGINT,
  completed_count BIGINT,
  pending_count BIGINT,
  completion_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE completed = true) as completed_count,
    COUNT(*) FILTER (WHERE completed = false) as pending_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE completed = true) / NULLIF(COUNT(*), 0), 1) as completion_rate
  FROM user_tour_status
  WHERE organization_id = org_id;
$$;

-- Create RPC function for detailed user onboarding status
CREATE OR REPLACE FUNCTION public.get_user_onboarding_details(org_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  team_name TEXT,
  completed BOOLEAN,
  current_step INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id as user_id,
    u.full_name,
    u.email,
    t.name as team_name,
    COALESCE(uts.completed, false) as completed,
    COALESCE(uts.current_step, 0) as current_step,
    uts.started_at,
    uts.updated_at
  FROM users u
  LEFT JOIN user_tour_status uts ON u.id = uts.user_id
  LEFT JOIN teams t ON u.team_id = t.id
  WHERE u.team_id = org_id
  ORDER BY uts.updated_at DESC NULLS LAST;
$$;