-- Add intervention_id to todos table for linking
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS intervention_id uuid REFERENCES public.interventions(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_todos_intervention_id ON public.todos(intervention_id);

-- Add execution_health_score to interventions table
ALTER TABLE public.interventions ADD COLUMN IF NOT EXISTS execution_health_score numeric;

-- Add last_health_calculated_at for tracking freshness
ALTER TABLE public.interventions ADD COLUMN IF NOT EXISTS execution_health_calculated_at timestamp with time zone;

-- Create a view for orphan todos detection (not linked to issue or intervention)
CREATE OR REPLACE VIEW orphan_todos AS
SELECT t.*, u.full_name as owner_name
FROM todos t
LEFT JOIN users u ON t.owner_id = u.id
WHERE t.issue_id IS NULL 
  AND t.intervention_id IS NULL
  AND t.done_at IS NULL;