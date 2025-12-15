-- Add meeting_item_id to issues for traceability
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS meeting_item_id UUID REFERENCES public.meeting_items(id);

-- Add indexes for meeting traceability queries
CREATE INDEX IF NOT EXISTS idx_issues_org_meeting ON public.issues(organization_id, meeting_id);
CREATE INDEX IF NOT EXISTS idx_issues_meeting_item ON public.issues(meeting_item_id) WHERE meeting_item_id IS NOT NULL;

-- Add discussed fields to meeting_items for Live mode checklist
ALTER TABLE public.meeting_items 
ADD COLUMN IF NOT EXISTS discussed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discussed_at TIMESTAMPTZ;