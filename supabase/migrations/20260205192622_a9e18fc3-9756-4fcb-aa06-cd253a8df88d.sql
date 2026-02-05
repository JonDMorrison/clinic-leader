-- Add is_synthetic flag to interventions for simulation data
ALTER TABLE public.interventions 
ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT false;

-- Add is_synthetic flag to intervention_outcomes
ALTER TABLE public.intervention_outcomes 
ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT false;

-- Add is_synthetic flag to metric_results for synthetic baselines
ALTER TABLE public.metric_results 
ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering out synthetic data in production queries
CREATE INDEX IF NOT EXISTS idx_interventions_synthetic ON public.interventions(is_synthetic) WHERE is_synthetic = true;
CREATE INDEX IF NOT EXISTS idx_intervention_outcomes_synthetic ON public.intervention_outcomes(is_synthetic) WHERE is_synthetic = true;
CREATE INDEX IF NOT EXISTS idx_metric_results_synthetic ON public.metric_results(is_synthetic) WHERE is_synthetic = true;

-- Add include_synthetic flag to pattern clusters computation tracking
ALTER TABLE public.intervention_pattern_audit 
ADD COLUMN IF NOT EXISTS include_synthetic BOOLEAN NOT NULL DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN public.interventions.is_synthetic IS 'Flag indicating synthetic data for simulation/testing purposes';
COMMENT ON COLUMN public.intervention_outcomes.is_synthetic IS 'Flag indicating synthetic outcome for simulation/testing purposes';
COMMENT ON COLUMN public.metric_results.is_synthetic IS 'Flag indicating synthetic metric result for simulation/testing purposes';