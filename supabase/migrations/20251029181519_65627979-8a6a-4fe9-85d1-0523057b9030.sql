-- Add demo tracking and flags
CREATE TABLE IF NOT EXISTS public.demo_provision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seed_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Add demo flags to users and teams
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS demo_user BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS is_demo_org BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on demo_provision
ALTER TABLE public.demo_provision ENABLE ROW LEVEL SECURITY;

-- Admins can manage demo provisions
CREATE POLICY "Admins can manage demo_provision"
ON public.demo_provision
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Demo users can read their own provision
CREATE POLICY "Demo users can read own provision"
ON public.demo_provision
FOR SELECT
USING (user_id = current_user_id());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_demo_provision_user_id ON public.demo_provision(user_id);
CREATE INDEX IF NOT EXISTS idx_demo_provision_team_id ON public.demo_provision(team_id);
CREATE INDEX IF NOT EXISTS idx_users_demo_user ON public.users(demo_user) WHERE demo_user = true;
CREATE INDEX IF NOT EXISTS idx_teams_is_demo_org ON public.teams(is_demo_org) WHERE is_demo_org = true;