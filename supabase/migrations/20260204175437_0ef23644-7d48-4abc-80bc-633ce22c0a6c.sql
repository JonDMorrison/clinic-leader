-- Add ROI tracking fields to interventions
ALTER TABLE public.interventions
ADD COLUMN estimated_hours numeric NULL,
ADD COLUMN estimated_cost numeric NULL,
ADD COLUMN actual_hours numeric NULL,
ADD COLUMN actual_cost numeric NULL,
ADD COLUMN roi_notes text NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.interventions.estimated_hours IS 'Estimated hours to implement intervention';
COMMENT ON COLUMN public.interventions.estimated_cost IS 'Estimated cost in dollars';
COMMENT ON COLUMN public.interventions.actual_hours IS 'Actual hours spent on intervention';
COMMENT ON COLUMN public.interventions.actual_cost IS 'Actual cost in dollars';
COMMENT ON COLUMN public.interventions.roi_notes IS 'Notes about ROI calculation or assumptions';