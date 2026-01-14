-- Create seat_metrics junction table to link seats to metrics/breakdowns
-- This enables the EOS principle "everyone has a number"

CREATE TABLE public.seat_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id uuid REFERENCES public.seats(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  
  -- Can link to different metric sources:
  metric_id uuid REFERENCES public.metrics(id) ON DELETE CASCADE,
  tracked_kpi_id uuid REFERENCES public.tracked_kpis(id) ON DELETE CASCADE,
  
  -- Or link to a specific breakdown dimension (e.g., clinician from Jane):
  breakdown_dimension_type text, -- 'clinician' | 'location' | 'treatment_category'
  breakdown_dimension_id text,   -- e.g., 'staff_001'
  import_key text,               -- e.g., 'jane_total_visits'
  
  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.users(id),
  
  -- At least one metric source must be specified
  CONSTRAINT valid_metric_link CHECK (
    metric_id IS NOT NULL OR 
    tracked_kpi_id IS NOT NULL OR 
    (breakdown_dimension_id IS NOT NULL AND import_key IS NOT NULL)
  )
);

-- Create index for efficient lookups
CREATE INDEX idx_seat_metrics_seat ON public.seat_metrics(seat_id);
CREATE INDEX idx_seat_metrics_org ON public.seat_metrics(organization_id);
CREATE INDEX idx_seat_metrics_dimension ON public.seat_metrics(breakdown_dimension_type, breakdown_dimension_id);

-- Enable RLS
ALTER TABLE public.seat_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can view/manage seat_metrics in their organization
CREATE POLICY "Users can view seat_metrics in their organization"
ON public.seat_metrics
FOR SELECT
USING (
  organization_id IN (
    SELECT team_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert seat_metrics in their organization"
ON public.seat_metrics
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT team_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update seat_metrics in their organization"
ON public.seat_metrics
FOR UPDATE
USING (
  organization_id IN (
    SELECT team_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete seat_metrics in their organization"
ON public.seat_metrics
FOR DELETE
USING (
  organization_id IN (
    SELECT team_id FROM public.users WHERE id = auth.uid()
  )
);