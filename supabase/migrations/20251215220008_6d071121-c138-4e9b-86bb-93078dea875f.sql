-- Create rock_collaborators table for additional rock assignees
CREATE TABLE public.rock_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  rock_id UUID NOT NULL REFERENCES public.rocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_rock_collaborator UNIQUE (rock_id, user_id)
);

-- Create indexes
CREATE INDEX idx_rock_collaborators_org ON public.rock_collaborators(organization_id);
CREATE INDEX idx_rock_collaborators_rock ON public.rock_collaborators(rock_id);
CREATE INDEX idx_rock_collaborators_user ON public.rock_collaborators(user_id);

-- Enable RLS
ALTER TABLE public.rock_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Team members can view rock collaborators"
ON public.rock_collaborators FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Managers can insert rock collaborators"
ON public.rock_collaborators FOR INSERT
WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Managers can delete rock collaborators"
ON public.rock_collaborators FOR DELETE
USING (is_manager() AND is_same_team(organization_id));