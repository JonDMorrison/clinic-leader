-- Create hidden_jane_resources table for storing user preferences
CREATE TABLE public.hidden_jane_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  resource_key TEXT NOT NULL,
  hidden_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, resource_key)
);

-- Enable RLS
ALTER TABLE public.hidden_jane_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view hidden resources
CREATE POLICY "Team members can view hidden resources"
ON public.hidden_jane_resources FOR SELECT
USING (is_same_team(organization_id));

-- Policy: Managers can manage hidden resources
CREATE POLICY "Managers can manage hidden resources"
ON public.hidden_jane_resources FOR ALL
USING (is_manager() AND is_same_team(organization_id))
WITH CHECK (is_manager() AND is_same_team(organization_id));

-- Policy: Admins can manage hidden resources
CREATE POLICY "Admins can manage hidden resources"
ON public.hidden_jane_resources FOR ALL
USING (is_admin() AND is_same_team(organization_id))
WITH CHECK (is_admin() AND is_same_team(organization_id));