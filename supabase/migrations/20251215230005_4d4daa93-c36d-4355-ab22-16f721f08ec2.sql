-- Create rock_outcomes table for quarterly retrospectives
CREATE TABLE public.rock_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  rock_id UUID NOT NULL REFERENCES public.rocks(id) ON DELETE CASCADE,
  closed_quarter TEXT NOT NULL, -- e.g. "Q4-2025"
  disposition TEXT NOT NULL CHECK (disposition IN ('archived', 'rolled_forward', 'converted_to_issue')),
  outcome_status TEXT NOT NULL CHECK (outcome_status IN ('achieved', 'partial', 'missed')),
  completion_percent INTEGER CHECK (completion_percent >= 0 AND completion_percent <= 100),
  outcome_summary TEXT,
  lessons_learned TEXT,
  blockers TEXT,
  created_issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  closed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Snapshot fields (rock state at close time)
  rock_title TEXT NOT NULL,
  rock_owner_id UUID,
  rock_confidence INTEGER,
  rock_status_at_close TEXT NOT NULL,
  rock_due_date DATE,
  
  -- Linked KPIs snapshot
  linked_metric_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Indexes for common queries
CREATE INDEX idx_rock_outcomes_org_quarter ON public.rock_outcomes(organization_id, closed_quarter);
CREATE INDEX idx_rock_outcomes_rock_closed ON public.rock_outcomes(rock_id, closed_at DESC);

-- Enable RLS
ALTER TABLE public.rock_outcomes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view org rock outcomes"
  ON public.rock_outcomes FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Managers can insert org rock outcomes"
  ON public.rock_outcomes FOR INSERT
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Managers can update org rock outcomes"
  ON public.rock_outcomes FOR UPDATE
  USING (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Admins can delete org rock outcomes"
  ON public.rock_outcomes FOR DELETE
  USING (is_admin() AND is_same_team(organization_id));