-- Create issue_suggestions table for AI-generated suggestions
CREATE TABLE public.issue_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL DEFAULT 'off_track_2_weeks',
  title TEXT NOT NULL,
  context TEXT,
  ai_analysis JSONB,
  priority INTEGER NOT NULL DEFAULT 3,
  weeks_off_track INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'pending',
  dismissed_reason TEXT,
  dismissed_by UUID REFERENCES public.users(id),
  created_issue_id UUID REFERENCES public.issues(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

-- Add indexes for common queries
CREATE INDEX idx_issue_suggestions_org_status ON public.issue_suggestions(organization_id, status);
CREATE INDEX idx_issue_suggestions_metric ON public.issue_suggestions(metric_id);
CREATE INDEX idx_issue_suggestions_expires ON public.issue_suggestions(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.issue_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can read org issue_suggestions"
ON public.issue_suggestions FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Managers can insert issue_suggestions"
ON public.issue_suggestions FOR INSERT
WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Managers can update issue_suggestions"
ON public.issue_suggestions FOR UPDATE
USING (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Admins can delete issue_suggestions"
ON public.issue_suggestions FOR DELETE
USING (is_admin() AND is_same_team(organization_id));

-- System can insert (for edge function)
CREATE POLICY "System can insert issue_suggestions"
ON public.issue_suggestions FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_issue_suggestions_updated_at
BEFORE UPDATE ON public.issue_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();