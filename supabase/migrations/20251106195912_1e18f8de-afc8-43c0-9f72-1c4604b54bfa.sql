-- Create alerts table for metric coaching tips
CREATE TABLE IF NOT EXISTS public.metric_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('off_target', 'downtrend', 'missing_data')),
  message TEXT NOT NULL,
  tip TEXT,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metric_id, week_of, alert_type)
);

-- Enable RLS
ALTER TABLE public.metric_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view org alerts"
  ON public.metric_alerts
  FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Users can resolve org alerts"
  ON public.metric_alerts
  FOR UPDATE
  USING (is_same_team(organization_id));

CREATE POLICY "System can create alerts"
  ON public.metric_alerts
  FOR INSERT
  WITH CHECK (is_same_team(organization_id));

-- Index for performance
CREATE INDEX idx_metric_alerts_org_unresolved ON public.metric_alerts(organization_id, resolved_at) WHERE resolved_at IS NULL;