-- Add created_issue_id to meeting_items for duplicate prevention
ALTER TABLE public.meeting_items 
ADD COLUMN IF NOT EXISTS created_issue_id uuid REFERENCES public.issues(id) ON DELETE SET NULL;

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_meeting_items_created_issue_id ON public.meeting_items(created_issue_id) WHERE created_issue_id IS NOT NULL;