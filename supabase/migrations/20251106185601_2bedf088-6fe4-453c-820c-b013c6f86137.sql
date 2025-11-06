-- Create metrics table
CREATE TABLE IF NOT EXISTS public.metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  target NUMERIC,
  unit TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  owner TEXT,
  category TEXT NOT NULL,
  sync_source TEXT NOT NULL DEFAULT 'manual' CHECK (sync_source IN ('manual', 'jane')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create metric_results table for weekly data
CREATE TABLE IF NOT EXISTS public.metric_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  value NUMERIC,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metric_id, week_start)
);

-- Enable RLS
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for metrics
CREATE POLICY "Admins can manage org metrics"
  ON public.metrics
  FOR ALL
  USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can manage org metrics"
  ON public.metrics
  FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org metrics"
  ON public.metrics
  FOR SELECT
  USING (is_same_team(organization_id));

-- RLS policies for metric_results
CREATE POLICY "Admins can manage metric_results"
  ON public.metric_results
  FOR ALL
  USING (
    metric_id IN (
      SELECT id FROM public.metrics WHERE is_admin() AND is_same_team(organization_id)
    )
  )
  WITH CHECK (
    metric_id IN (
      SELECT id FROM public.metrics WHERE is_admin() AND is_same_team(organization_id)
    )
  );

CREATE POLICY "Managers can manage metric_results"
  ON public.metric_results
  FOR ALL
  USING (
    metric_id IN (
      SELECT id FROM public.metrics WHERE is_manager() AND is_same_team(organization_id)
    )
  )
  WITH CHECK (
    metric_id IN (
      SELECT id FROM public.metrics WHERE is_manager() AND is_same_team(organization_id)
    )
  );

CREATE POLICY "Team members can read metric_results"
  ON public.metric_results
  FOR SELECT
  USING (
    metric_id IN (
      SELECT id FROM public.metrics WHERE is_same_team(organization_id)
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON public.metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metric_results_updated_at
  BEFORE UPDATE ON public.metric_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_metrics_organization_id ON public.metrics(organization_id);
CREATE INDEX idx_metric_results_metric_id ON public.metric_results(metric_id);
CREATE INDEX idx_metric_results_week_start ON public.metric_results(week_start);