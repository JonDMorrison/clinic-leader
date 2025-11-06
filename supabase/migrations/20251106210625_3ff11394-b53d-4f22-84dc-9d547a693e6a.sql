-- Create metric_goals table for quarterly/annual targets
CREATE TABLE IF NOT EXISTS public.metric_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('quarterly', 'annual')),
  target_value NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(metric_id, goal_type, start_date)
);

-- Create metric_milestones table for achievement tracking
CREATE TABLE IF NOT EXISTS public.metric_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  milestone_type TEXT NOT NULL,
  milestone_value NUMERIC NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE,
  achieved_by UUID,
  celebrated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create metric_goal_achievements table for tracking progress history
CREATE TABLE IF NOT EXISTS public.metric_goal_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.metric_goals(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  actual_value NUMERIC NOT NULL,
  progress_percentage NUMERIC NOT NULL,
  on_track BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(goal_id, week_start)
);

-- Enable RLS
ALTER TABLE public.metric_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_goal_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metric_goals
CREATE POLICY "Users can view org metric goals"
  ON public.metric_goals
  FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Managers can manage org metric goals"
  ON public.metric_goals
  FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

-- RLS Policies for metric_milestones
CREATE POLICY "Users can view org metric milestones"
  ON public.metric_milestones
  FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "System can manage milestones"
  ON public.metric_milestones
  FOR ALL
  USING (is_same_team(organization_id))
  WITH CHECK (is_same_team(organization_id));

-- RLS Policies for metric_goal_achievements
CREATE POLICY "Users can view org goal achievements"
  ON public.metric_goal_achievements
  FOR SELECT
  USING (goal_id IN (
    SELECT id FROM public.metric_goals WHERE is_same_team(organization_id)
  ));

CREATE POLICY "System can insert goal achievements"
  ON public.metric_goal_achievements
  FOR INSERT
  WITH CHECK (goal_id IN (
    SELECT id FROM public.metric_goals WHERE is_same_team(organization_id)
  ));

-- Create triggers for updated_at
CREATE TRIGGER update_metric_goals_updated_at
  BEFORE UPDATE ON public.metric_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_metric_goals_metric_id ON public.metric_goals(metric_id);
CREATE INDEX idx_metric_goals_dates ON public.metric_goals(start_date, end_date);
CREATE INDEX idx_metric_milestones_metric_id ON public.metric_milestones(metric_id);
CREATE INDEX idx_metric_milestones_achieved ON public.metric_milestones(achieved_at) WHERE achieved_at IS NOT NULL;
CREATE INDEX idx_goal_achievements_goal_id ON public.metric_goal_achievements(goal_id);
CREATE INDEX idx_goal_achievements_week ON public.metric_goal_achievements(week_start);