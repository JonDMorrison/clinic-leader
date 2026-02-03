-- Create intervention_templates table for reusable intervention patterns
CREATE TABLE public.intervention_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_description TEXT,
  intervention_type public.intervention_type NOT NULL DEFAULT 'other',
  metric_category TEXT,
  common_actions JSONB DEFAULT '[]',
  required_roles JSONB DEFAULT '[]',
  typical_duration_days INTEGER DEFAULT 90,
  average_historical_success_rate NUMERIC(5,4) DEFAULT 0,
  historical_sample_size INTEGER DEFAULT 0,
  created_from_intervention_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create intervention_recommendations table for storing generated recommendations
CREATE TABLE public.intervention_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  recommended_template_id UUID REFERENCES public.intervention_templates(id) ON DELETE SET NULL,
  recommended_intervention_template JSONB NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  evidence_summary TEXT,
  recommendation_reason JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  model_version TEXT NOT NULL DEFAULT 'v1.0',
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID REFERENCES auth.users(id),
  dismissed_reason TEXT,
  accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id),
  accepted_intervention_id UUID REFERENCES public.interventions(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_intervention_templates_org ON public.intervention_templates(organization_id);
CREATE INDEX idx_intervention_templates_type ON public.intervention_templates(intervention_type);
CREATE INDEX idx_intervention_templates_active ON public.intervention_templates(is_active) WHERE is_active = true;

CREATE INDEX idx_intervention_recommendations_org ON public.intervention_recommendations(organization_id);
CREATE INDEX idx_intervention_recommendations_metric ON public.intervention_recommendations(metric_id);
CREATE INDEX idx_intervention_recommendations_period ON public.intervention_recommendations(period_key);
CREATE INDEX idx_intervention_recommendations_dismissed ON public.intervention_recommendations(dismissed) WHERE dismissed = false;
CREATE INDEX idx_intervention_recommendations_accepted ON public.intervention_recommendations(accepted) WHERE accepted = true;
CREATE INDEX idx_intervention_recommendations_active ON public.intervention_recommendations(organization_id, metric_id, period_key) 
  WHERE dismissed = false AND accepted = false;

-- Enable RLS
ALTER TABLE public.intervention_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies for intervention_templates
CREATE POLICY "Users can view templates in their organization"
  ON public.intervention_templates
  FOR SELECT
  USING (public.is_same_team(organization_id));

CREATE POLICY "Managers can create templates in their organization"
  ON public.intervention_templates
  FOR INSERT
  WITH CHECK (public.is_same_team(organization_id) AND public.is_manager());

CREATE POLICY "Managers can update templates in their organization"
  ON public.intervention_templates
  FOR UPDATE
  USING (public.is_same_team(organization_id) AND public.is_manager());

CREATE POLICY "Admins can delete templates in their organization"
  ON public.intervention_templates
  FOR DELETE
  USING (public.is_same_team(organization_id) AND public.is_admin());

-- RLS policies for intervention_recommendations
CREATE POLICY "Users can view recommendations in their organization"
  ON public.intervention_recommendations
  FOR SELECT
  USING (public.is_same_team(organization_id));

CREATE POLICY "System can create recommendations"
  ON public.intervention_recommendations
  FOR INSERT
  WITH CHECK (public.is_same_team(organization_id));

CREATE POLICY "Managers can update recommendations in their organization"
  ON public.intervention_recommendations
  FOR UPDATE
  USING (public.is_same_team(organization_id) AND public.is_manager());

CREATE POLICY "Admins can delete recommendations in their organization"
  ON public.intervention_recommendations
  FOR DELETE
  USING (public.is_same_team(organization_id) AND public.is_admin());

-- Add trigger for updated_at on templates
CREATE TRIGGER update_intervention_templates_updated_at
  BEFORE UPDATE ON public.intervention_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();