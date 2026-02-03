-- Add intervention_id column to issues table for linking failed interventions
ALTER TABLE public.issues 
ADD COLUMN intervention_id UUID REFERENCES public.interventions(id) ON DELETE SET NULL;

-- Update the created_from constraint to include 'intervention_outcome'
ALTER TABLE public.issues DROP CONSTRAINT issues_created_from_check;
ALTER TABLE public.issues ADD CONSTRAINT issues_created_from_check 
CHECK (created_from = ANY (ARRAY['scorecard'::text, 'rock'::text, 'manual'::text, 'escalated'::text, 'breakdown'::text, 'intervention_outcome'::text]));

-- Create index for faster lookups
CREATE INDEX idx_issues_intervention_id ON public.issues(intervention_id) WHERE intervention_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.issues.intervention_id IS 'Links to the intervention that caused this issue (for failed intervention outcomes)';