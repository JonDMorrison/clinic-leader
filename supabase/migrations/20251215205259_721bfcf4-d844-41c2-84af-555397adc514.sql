-- Add meeting_id FK to issues table for linking issues to meetings
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Create index for meeting_id lookups
CREATE INDEX IF NOT EXISTS idx_issues_meeting_id ON public.issues(meeting_id);

-- Comment explaining the column
COMMENT ON COLUMN public.issues.meeting_id IS 'Optional FK to link issue to meeting where it was created/discussed';