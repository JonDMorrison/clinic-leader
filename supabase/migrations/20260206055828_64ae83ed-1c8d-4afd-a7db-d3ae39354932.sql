-- Add lean typing columns to interventions table
ALTER TABLE public.interventions
ADD COLUMN intervention_type_id uuid NULL 
  REFERENCES public.intervention_type_registry(id) ON DELETE SET NULL,
ADD COLUMN intervention_type_source text NULL 
  CHECK (intervention_type_source IN ('ai', 'user', 'ai_backfill')),
ADD COLUMN intervention_type_confidence int NULL 
  CHECK (intervention_type_confidence BETWEEN 0 AND 100);

-- Create index on intervention_type_id for FK lookups
CREATE INDEX idx_interventions_type_id 
ON public.interventions(intervention_type_id);

-- Create index on intervention_type_source for filtering
CREATE INDEX idx_interventions_type_source 
ON public.interventions(intervention_type_source);

-- Create partial index for typed interventions only
CREATE INDEX idx_interventions_typed 
ON public.interventions(intervention_type_id) 
WHERE intervention_type_id IS NOT NULL;

-- Add comment documenting the optional nature
COMMENT ON COLUMN public.interventions.intervention_type_id IS 
  'Optional reference to standardized intervention type from governance registry. Nullable - typing is not required to create interventions.';