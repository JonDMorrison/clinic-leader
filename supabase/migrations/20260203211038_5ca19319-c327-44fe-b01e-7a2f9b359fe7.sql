-- ============================================
-- Table: ai_intervention_recommendations
-- Stores intervention recommendations for predictive engine learning
-- This is the dataset your AI moat will learn from
-- ============================================

CREATE TABLE public.ai_intervention_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  recommendation_key TEXT NOT NULL,
  recommended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted BOOLEAN DEFAULT NULL,
  implemented BOOLEAN DEFAULT NULL,
  outcome_notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for common queries
CREATE INDEX idx_ai_recs_team_metric ON public.ai_intervention_recommendations(team_id, metric_id);
CREATE INDEX idx_ai_recs_period ON public.ai_intervention_recommendations(period_start);
CREATE INDEX idx_ai_recs_recommendation_key ON public.ai_intervention_recommendations(recommendation_key);

-- Enable RLS
ALTER TABLE public.ai_intervention_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS: Team members can read their own team's recommendations
CREATE POLICY "Team members can read own recommendations"
ON public.ai_intervention_recommendations
FOR SELECT
TO authenticated
USING (public.is_same_team(team_id));

-- RLS: Team members can insert for their own team
CREATE POLICY "Team members can insert own recommendations"
ON public.ai_intervention_recommendations
FOR INSERT
TO authenticated
WITH CHECK (public.is_same_team(team_id) AND created_by = auth.uid());

-- RLS: Team members can update their own team's recommendations
CREATE POLICY "Team members can update own recommendations"
ON public.ai_intervention_recommendations
FOR UPDATE
TO authenticated
USING (public.is_same_team(team_id));

-- RLS: Master admin can read all (for aggregate analysis)
CREATE POLICY "Master admin can read all recommendations"
ON public.ai_intervention_recommendations
FOR SELECT
TO authenticated
USING (public.is_master_admin());

-- Add updated_at trigger
CREATE TRIGGER update_ai_intervention_recommendations_updated_at
  BEFORE UPDATE ON public.ai_intervention_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();