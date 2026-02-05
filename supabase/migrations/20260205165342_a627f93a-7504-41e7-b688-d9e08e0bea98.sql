-- Add baseline reliability tracking columns to intervention_metric_links
ALTER TABLE public.intervention_metric_links
ADD COLUMN IF NOT EXISTS baseline_definition_version text,
ADD COLUMN IF NOT EXISTS baseline_source text,
ADD COLUMN IF NOT EXISTS baseline_captured_at timestamptz,
ADD COLUMN IF NOT EXISTS baseline_capture_method text DEFAULT 'auto' CHECK (baseline_capture_method IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS baseline_quality_flag text DEFAULT 'good' CHECK (baseline_quality_flag IN ('good', 'iffy', 'bad')),
ADD COLUMN IF NOT EXISTS baseline_override_justification text;

-- Add index for quality flag queries
CREATE INDEX IF NOT EXISTS idx_intervention_metric_links_quality 
ON public.intervention_metric_links(baseline_quality_flag)
WHERE baseline_quality_flag IN ('iffy', 'bad');

COMMENT ON COLUMN public.intervention_metric_links.baseline_definition_version IS 'Version of metric definition at baseline capture time';
COMMENT ON COLUMN public.intervention_metric_links.baseline_source IS 'Source system of the baseline metric result';
COMMENT ON COLUMN public.intervention_metric_links.baseline_captured_at IS 'Timestamp when baseline was captured';
COMMENT ON COLUMN public.intervention_metric_links.baseline_capture_method IS 'How baseline was captured: auto or manual';
COMMENT ON COLUMN public.intervention_metric_links.baseline_quality_flag IS 'Quality assessment: good, iffy, or bad';
COMMENT ON COLUMN public.intervention_metric_links.baseline_override_justification IS 'Justification if quality flag was overridden';