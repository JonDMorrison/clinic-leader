-- Add intervention_type_id to intervention_pattern_clusters for governance type normalization
ALTER TABLE public.intervention_pattern_clusters 
ADD COLUMN IF NOT EXISTS intervention_type_id uuid REFERENCES public.intervention_type_registry(id);

-- Create index for lookup by governance type
CREATE INDEX IF NOT EXISTS idx_pattern_clusters_type_id ON public.intervention_pattern_clusters(intervention_type_id);

-- Partial index for typed patterns (more efficient queries)
CREATE INDEX IF NOT EXISTS idx_pattern_clusters_typed ON public.intervention_pattern_clusters(intervention_type_id) 
WHERE intervention_type_id IS NOT NULL;

COMMENT ON COLUMN public.intervention_pattern_clusters.intervention_type_id IS 'Primary clustering dimension - standardized governance type ID';
COMMENT ON COLUMN public.intervention_pattern_clusters.intervention_type IS 'Legacy fallback - text intervention type for untyped interventions';