-- Create meeting_commitments table
CREATE TABLE public.meeting_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  commitment_type text NOT NULL CHECK (commitment_type IN ('create_intervention','review_overdue','followup_metric','other')),
  label text NOT NULL,
  linked_intervention_id uuid NULL REFERENCES public.interventions(id) ON DELETE SET NULL,
  assigned_to uuid NULL,
  due_date date NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_meeting_commitments_org_meeting ON public.meeting_commitments(organization_id, meeting_id, created_at DESC);
CREATE INDEX idx_meeting_commitments_meeting ON public.meeting_commitments(meeting_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.meeting_commitments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organization members can read commitments in their org
CREATE POLICY "Members can view commitments in their org"
ON public.meeting_commitments
FOR SELECT
USING (public.is_same_team(organization_id));

-- Organization members can insert commitments for their org
CREATE POLICY "Members can insert commitments in their org"
ON public.meeting_commitments
FOR INSERT
WITH CHECK (public.is_same_team(organization_id));

-- Only admins can update commitments
CREATE POLICY "Admins can update commitments"
ON public.meeting_commitments
FOR UPDATE
USING (public.is_same_team(organization_id) AND public.is_admin());

-- Only admins can delete commitments
CREATE POLICY "Admins can delete commitments"
ON public.meeting_commitments
FOR DELETE
USING (public.is_same_team(organization_id) AND public.is_admin());