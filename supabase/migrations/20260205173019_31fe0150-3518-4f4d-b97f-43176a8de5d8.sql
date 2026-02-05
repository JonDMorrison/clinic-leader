-- Create intervention_playbooks table for reusable operational playbooks
CREATE TABLE public.intervention_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  
  -- Core playbook info
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'archived')),
  
  -- Source pattern reference
  source_pattern_cluster_id UUID NULL,
  source_intervention_ids UUID[] NOT NULL DEFAULT '{}',
  
  -- Playbook content
  expected_metric_movement JSONB NOT NULL DEFAULT '{}',
  -- Format: { metric_id: string, expected_delta_percent: number, direction: 'up'|'down', confidence: number }
  
  implementation_steps JSONB NOT NULL DEFAULT '[]',
  -- Format: [{ order: number, title: string, description: string, estimated_days: number }]
  
  risk_flags JSONB NOT NULL DEFAULT '[]',
  -- Format: [{ severity: 'low'|'medium'|'high', description: string }]
  
  -- Performance stats
  success_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  avg_time_to_impact_days INTEGER NULL,
  
  -- Approval workflow
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ NULL,
  approved_by UUID NULL,
  rejection_reason TEXT NULL,
  
  -- Anonymization flag for cross-org playbooks
  is_anonymized BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervention_playbooks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view approved playbooks" 
  ON public.intervention_playbooks 
  FOR SELECT 
  USING (
    status = 'approved' OR 
    (organization_id IS NOT NULL AND is_same_team(organization_id))
  );

CREATE POLICY "Managers can create playbooks for their org" 
  ON public.intervention_playbooks 
  FOR INSERT 
  WITH CHECK (is_same_team(organization_id) AND is_manager());

CREATE POLICY "Admins can update playbooks for their org" 
  ON public.intervention_playbooks 
  FOR UPDATE 
  USING (is_same_team(organization_id) AND is_admin());

CREATE POLICY "Admins can delete playbooks for their org" 
  ON public.intervention_playbooks 
  FOR DELETE 
  USING (is_same_team(organization_id) AND is_admin());

-- Index for performance
CREATE INDEX idx_playbooks_org_status ON public.intervention_playbooks(organization_id, status);
CREATE INDEX idx_playbooks_status ON public.intervention_playbooks(status);
CREATE INDEX idx_playbooks_success_rate ON public.intervention_playbooks(success_rate DESC) WHERE status = 'approved';

-- Trigger to update updated_at
CREATE TRIGGER update_intervention_playbooks_updated_at
  BEFORE UPDATE ON public.intervention_playbooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add playbook_id reference to intervention_recommendations
ALTER TABLE public.intervention_recommendations 
  ADD COLUMN IF NOT EXISTS suggested_playbook_id UUID REFERENCES public.intervention_playbooks(id);

COMMENT ON TABLE public.intervention_playbooks IS 'Reusable operational playbooks generated from successful intervention patterns';
COMMENT ON COLUMN public.intervention_playbooks.is_anonymized IS 'True if playbook was derived from cross-org patterns with PII removed';