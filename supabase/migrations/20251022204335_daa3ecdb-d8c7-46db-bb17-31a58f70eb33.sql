-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id),
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')),
  week_start DATE NOT NULL,
  summary JSONB NOT NULL,
  file_url TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all reports"
  ON public.reports
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Managers can manage team reports"
  ON public.reports
  FOR ALL
  USING (is_manager() AND is_same_team(team_id))
  WITH CHECK (is_manager() AND is_same_team(team_id));

CREATE POLICY "Staff can read current week report"
  ON public.reports
  FOR SELECT
  USING (
    is_same_team(team_id) AND
    week_start >= (CURRENT_DATE - INTERVAL '7 days')::date
  );

-- Create indexes
CREATE INDEX idx_reports_team_period ON public.reports(team_id, period, week_start DESC);
CREATE INDEX idx_reports_created ON public.reports(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();