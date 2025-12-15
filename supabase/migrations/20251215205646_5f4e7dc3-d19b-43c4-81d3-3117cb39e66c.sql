-- Add missing columns to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS title text DEFAULT 'Level 10 Meeting',
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS started_at timestamptz,
ADD COLUMN IF NOT EXISTS ended_at timestamptz;

-- Add constraint for status values
ALTER TABLE public.meetings 
ADD CONSTRAINT meetings_status_check CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed'));

-- Create meeting_items table for agenda items
CREATE TABLE public.meeting_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.teams(id),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('scorecard', 'rocks', 'issues', 'todo', 'segue', 'conclusion', 'custom')),
  item_type text NOT NULL CHECK (item_type IN ('metric', 'rock', 'issue', 'text')),
  title text NOT NULL,
  description text,
  source_ref_type text CHECK (source_ref_type IN ('metric', 'rock', 'issue')),
  source_ref_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_meeting_items_org_meeting ON public.meeting_items(organization_id, meeting_id);
CREATE INDEX idx_meeting_items_section_order ON public.meeting_items(meeting_id, section, sort_order);

-- Enable RLS
ALTER TABLE public.meeting_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_items
CREATE POLICY "Team members can view meeting items"
ON public.meeting_items
FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Managers can insert meeting items"
ON public.meeting_items
FOR INSERT
WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Managers can update meeting items"
ON public.meeting_items
FOR UPDATE
USING (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Managers can delete meeting items"
ON public.meeting_items
FOR DELETE
USING (is_manager() AND is_same_team(organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_meeting_items_updated_at
BEFORE UPDATE ON public.meeting_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing meetings to have status based on scheduled_for
UPDATE public.meetings
SET status = CASE 
  WHEN scheduled_for < now() - interval '6 hours' THEN 'completed'
  ELSE 'scheduled'
END
WHERE status = 'draft';