-- Add resolution fields to issues table
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS resolution_type text NULL CHECK (resolution_type IN ('intervention_created','no_intervention_needed','defer','unknown')),
ADD COLUMN IF NOT EXISTS resolution_note text NULL,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS resolved_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS linked_intervention_id uuid NULL REFERENCES public.interventions(id);

-- Create index on linked_intervention_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_issues_linked_intervention ON public.issues(linked_intervention_id) WHERE linked_intervention_id IS NOT NULL;

-- Create issue_resolution_events table
CREATE TABLE public.issue_resolution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('resolved','intervention_linked','resolution_updated')),
  resolution_type text NULL CHECK (resolution_type IN ('intervention_created','no_intervention_needed','defer','unknown')),
  linked_intervention_id uuid NULL REFERENCES public.interventions(id),
  note text NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_issue_resolution_events_org_issue ON public.issue_resolution_events(organization_id, issue_id, created_at DESC);
CREATE INDEX idx_issue_resolution_events_org_created ON public.issue_resolution_events(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.issue_resolution_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for issue_resolution_events
-- Organization members can read events in their org
CREATE POLICY "Members can view resolution events in their org"
ON public.issue_resolution_events
FOR SELECT
USING (public.is_same_team(organization_id));

-- Organization members can insert events for their org
CREATE POLICY "Members can insert resolution events in their org"
ON public.issue_resolution_events
FOR INSERT
WITH CHECK (public.is_same_team(organization_id));

-- Only admins can update events
CREATE POLICY "Admins can update resolution events"
ON public.issue_resolution_events
FOR UPDATE
USING (public.is_same_team(organization_id) AND public.is_admin());

-- Only admins can delete events
CREATE POLICY "Admins can delete resolution events"
ON public.issue_resolution_events
FOR DELETE
USING (public.is_same_team(organization_id) AND public.is_admin());