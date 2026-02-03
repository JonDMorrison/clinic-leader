-- ============================================
-- INTERVENTION HARDENING: Constraints & Determinism
-- ============================================

-- 1. UNIQUE constraint on intervention_metric_links
ALTER TABLE public.intervention_metric_links
ADD CONSTRAINT uq_intervention_metric_link UNIQUE (intervention_id, metric_id);

-- 2. CHECK constraint on expected_magnitude_percent
ALTER TABLE public.intervention_metric_links
ADD CONSTRAINT chk_expected_magnitude_percent 
CHECK (expected_magnitude_percent IS NULL OR (expected_magnitude_percent >= 0 AND expected_magnitude_percent <= 500));

-- 3. OUTCOME DETERMINISM: Add result ID references and evaluator versioning
ALTER TABLE public.intervention_outcomes
ADD COLUMN IF NOT EXISTS baseline_result_id UUID REFERENCES public.metric_results(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS current_result_id UUID REFERENCES public.metric_results(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS evaluator_version TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS ai_meta JSONB;

-- 4. UNIQUE constraint on intervention_outcomes for deterministic upserts
ALTER TABLE public.intervention_outcomes
ADD CONSTRAINT uq_intervention_outcome_deterministic 
UNIQUE (intervention_id, metric_id, evaluation_period_end, evaluator_version);

-- 5. Create intervention_events table for audit trail
CREATE TABLE public.intervention_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for intervention_events
CREATE INDEX idx_intervention_events_org ON public.intervention_events(organization_id);
CREATE INDEX idx_intervention_events_intervention ON public.intervention_events(intervention_id);
CREATE INDEX idx_intervention_events_type ON public.intervention_events(event_type);
CREATE INDEX idx_intervention_events_created ON public.intervention_events(created_at DESC);

-- Enable RLS on intervention_events
ALTER TABLE public.intervention_events ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can SELECT their events
CREATE POLICY "Org members can view intervention events"
ON public.intervention_events FOR SELECT
USING (public.is_same_team(organization_id));

-- RLS: Only admins can INSERT events (or via edge function with service role)
CREATE POLICY "Admins can insert intervention events"
ON public.intervention_events FOR INSERT
WITH CHECK (
    public.is_same_team(organization_id) 
    AND public.is_admin()
);

-- RLS: Master admin can read all for analytics
CREATE POLICY "Master admin can read all intervention events"
ON public.intervention_events FOR SELECT
USING (public.is_master_admin());

-- 6. Helper function to log intervention events
CREATE OR REPLACE FUNCTION public.log_intervention_event(
    _intervention_id UUID,
    _event_type TEXT,
    _details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _org_id UUID;
    _event_id UUID;
BEGIN
    -- Get organization_id from intervention
    SELECT organization_id INTO _org_id
    FROM public.interventions
    WHERE id = _intervention_id;
    
    IF _org_id IS NULL THEN
        RAISE EXCEPTION 'Intervention not found: %', _intervention_id;
    END IF;
    
    -- Insert event
    INSERT INTO public.intervention_events (
        organization_id,
        intervention_id,
        actor_user_id,
        event_type,
        details
    ) VALUES (
        _org_id,
        _intervention_id,
        auth.uid(),
        _event_type,
        _details
    ) RETURNING id INTO _event_id;
    
    RETURN _event_id;
END;
$$;