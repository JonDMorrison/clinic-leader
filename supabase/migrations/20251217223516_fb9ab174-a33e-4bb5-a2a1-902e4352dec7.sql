-- Add new meeting types to the enum
ALTER TYPE public.meeting_type ADD VALUE IF NOT EXISTS 'quarterly';
ALTER TYPE public.meeting_type ADD VALUE IF NOT EXISTS 'annual';

-- Add issue routing attributes to issues table
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS meeting_horizon text DEFAULT 'weekly' CHECK (meeting_horizon IN ('weekly', 'quarterly', 'annual')),
ADD COLUMN IF NOT EXISTS created_from text DEFAULT 'manual' CHECK (created_from IN ('scorecard', 'rock', 'manual', 'escalated')),
ADD COLUMN IF NOT EXISTS recurrence_count integer DEFAULT 0;

-- Create index for horizon-based queries
CREATE INDEX IF NOT EXISTS idx_issues_meeting_horizon ON public.issues(organization_id, meeting_horizon, status);

-- Add comment for documentation
COMMENT ON COLUMN public.issues.meeting_horizon IS 'Determines which meeting type this issue belongs to: weekly (L10), quarterly, or annual';
COMMENT ON COLUMN public.issues.created_from IS 'Source of the issue: scorecard metric, rock, manual entry, or escalated from another meeting';
COMMENT ON COLUMN public.issues.recurrence_count IS 'Number of times this issue has reappeared in meetings without resolution';