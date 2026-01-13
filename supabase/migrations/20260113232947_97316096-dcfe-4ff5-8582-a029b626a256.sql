-- Create metric_breakdowns table for dimensional drilldowns
CREATE TABLE public.metric_breakdowns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_key TEXT NOT NULL,
  period_start DATE NOT NULL,
  dimension_type TEXT NOT NULL CHECK (dimension_type IN ('clinician', 'location', 'discipline')),
  dimension_id TEXT NOT NULL,
  dimension_label TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'jane_pipe',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for upserts
ALTER TABLE public.metric_breakdowns
ADD CONSTRAINT metric_breakdowns_unique_key 
UNIQUE (organization_id, metric_id, period_key, dimension_type, dimension_id);

-- Create indexes for common queries
CREATE INDEX idx_metric_breakdowns_org ON public.metric_breakdowns(organization_id);
CREATE INDEX idx_metric_breakdowns_metric ON public.metric_breakdowns(metric_id);
CREATE INDEX idx_metric_breakdowns_period ON public.metric_breakdowns(period_key, period_type);

-- Enable RLS
ALTER TABLE public.metric_breakdowns ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped to organization
CREATE POLICY "Users can view their org breakdowns"
ON public.metric_breakdowns
FOR SELECT
USING (
  organization_id IN (
    SELECT team_id FROM public.users WHERE id = auth.uid()
  )
);

CREATE POLICY "System can insert breakdowns"
ON public.metric_breakdowns
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update breakdowns"
ON public.metric_breakdowns
FOR UPDATE
USING (true);

-- Enable realtime for metric_breakdowns
ALTER PUBLICATION supabase_realtime ADD TABLE public.metric_breakdowns;