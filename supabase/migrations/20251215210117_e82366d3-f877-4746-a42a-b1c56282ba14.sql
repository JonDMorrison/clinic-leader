-- Add agenda_generated flag to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS agenda_generated boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.meetings.agenda_generated IS 'Set to true after auto-generating L10 agenda items. Prevents regeneration.';

-- Create index for query optimization
CREATE INDEX IF NOT EXISTS idx_meetings_agenda_generated ON public.meetings(organization_id, agenda_generated) WHERE agenda_generated = false;