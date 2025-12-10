-- Create rock_metric_links join table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.rock_metric_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rock_id UUID NOT NULL REFERENCES public.rocks(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rock_id, metric_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rock_metric_links_rock_id ON public.rock_metric_links(rock_id);
CREATE INDEX IF NOT EXISTS idx_rock_metric_links_metric_id ON public.rock_metric_links(metric_id);
CREATE INDEX IF NOT EXISTS idx_rock_metric_links_org_id ON public.rock_metric_links(organization_id);

-- Enable RLS
ALTER TABLE public.rock_metric_links ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Team members can view rock_metric_links"
ON public.rock_metric_links FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Managers can insert rock_metric_links"
ON public.rock_metric_links FOR INSERT
WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Managers can update rock_metric_links"
ON public.rock_metric_links FOR UPDATE
USING (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Managers can delete rock_metric_links"
ON public.rock_metric_links FOR DELETE
USING (is_manager() AND is_same_team(organization_id));