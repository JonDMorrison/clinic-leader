-- =============================================================
-- Intervention Intelligence Feature Migration
-- =============================================================

-- Step 1: Create ENUMs
-- -------------------------------------------------------------

CREATE TYPE public.intervention_status AS ENUM (
  'planned',
  'active',
  'completed',
  'abandoned'
);

CREATE TYPE public.intervention_origin_type AS ENUM (
  'issue',
  'rock',
  'todo',
  'manual',
  'ai_recommendation'
);

CREATE TYPE public.intervention_type AS ENUM (
  'staffing',
  'marketing',
  'referral_outreach',
  'scheduling',
  'pricing',
  'workflow',
  'training',
  'equipment',
  'service_line',
  'other'
);

CREATE TYPE public.expected_direction AS ENUM (
  'up',
  'down',
  'stable'
);

-- Step 2: Create interventions table
-- -------------------------------------------------------------

CREATE TABLE public.interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NULL,
  intervention_type public.intervention_type NOT NULL DEFAULT 'other',
  status public.intervention_status NOT NULL DEFAULT 'planned',
  origin_type public.intervention_origin_type NOT NULL DEFAULT 'manual',
  origin_id uuid NULL,
  created_by uuid NOT NULL,
  owner_user_id uuid NULL,
  confidence_level int NOT NULL DEFAULT 3,
  expected_time_horizon_days int NOT NULL DEFAULT 60,
  start_date date NULL,
  end_date date NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT interventions_title_min_length CHECK (char_length(title) >= 4),
  CONSTRAINT interventions_confidence_level_range CHECK (confidence_level >= 1 AND confidence_level <= 5),
  CONSTRAINT interventions_time_horizon_range CHECK (expected_time_horizon_days >= 7 AND expected_time_horizon_days <= 365),
  CONSTRAINT interventions_dates_valid CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Add comments for documentation
COMMENT ON TABLE public.interventions IS 'Tracks strategic interventions and their expected impact on metrics';
COMMENT ON COLUMN public.interventions.confidence_level IS 'Confidence in expected outcome (1=low, 5=high)';
COMMENT ON COLUMN public.interventions.origin_type IS 'Where this intervention originated from';
COMMENT ON COLUMN public.interventions.origin_id IS 'References the originating record (issue, rock, or todo id)';

-- Step 3: Create intervention_metric_links table
-- -------------------------------------------------------------

CREATE TABLE public.intervention_metric_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE RESTRICT,
  expected_direction public.expected_direction NOT NULL DEFAULT 'up',
  expected_magnitude_percent numeric NULL,
  baseline_value numeric NULL,
  baseline_period_start date NULL,
  baseline_period_type text NOT NULL DEFAULT 'month',
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT intervention_metric_links_magnitude_range CHECK (
    expected_magnitude_percent IS NULL OR (expected_magnitude_percent >= 0 AND expected_magnitude_percent <= 500)
  ),
  CONSTRAINT intervention_metric_links_period_type CHECK (baseline_period_type = 'month'),
  CONSTRAINT intervention_metric_links_unique UNIQUE (intervention_id, metric_id)
);

COMMENT ON TABLE public.intervention_metric_links IS 'Links interventions to the metrics they are expected to impact';
COMMENT ON COLUMN public.intervention_metric_links.expected_magnitude_percent IS 'Expected percentage change (0-500%)';
COMMENT ON COLUMN public.intervention_metric_links.baseline_period_type IS 'Currently only supports month periods';

-- Step 4: Create intervention_outcomes table
-- -------------------------------------------------------------

CREATE TABLE public.intervention_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE RESTRICT,
  evaluation_period_start date NOT NULL,
  evaluation_period_end date NOT NULL,
  actual_delta_value numeric NULL,
  actual_delta_percent numeric NULL,
  confidence_score int NOT NULL DEFAULT 3,
  ai_summary text NULL,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT intervention_outcomes_confidence_range CHECK (confidence_score >= 1 AND confidence_score <= 5),
  CONSTRAINT intervention_outcomes_period_valid CHECK (evaluation_period_end >= evaluation_period_start),
  CONSTRAINT intervention_outcomes_unique UNIQUE (intervention_id, metric_id, evaluation_period_start)
);

COMMENT ON TABLE public.intervention_outcomes IS 'Stores measured outcomes of interventions against linked metrics';
COMMENT ON COLUMN public.intervention_outcomes.confidence_score IS 'Confidence that the outcome is attributable to the intervention (1=low, 5=high)';

-- Step 5: Create indexes for performance
-- -------------------------------------------------------------

CREATE INDEX idx_interventions_org_created ON public.interventions(organization_id, created_at DESC);
CREATE INDEX idx_interventions_status_org ON public.interventions(status, organization_id);
CREATE INDEX idx_intervention_metric_links_metric ON public.intervention_metric_links(metric_id);
CREATE INDEX idx_intervention_outcomes_metric_evaluated ON public.intervention_outcomes(metric_id, evaluated_at DESC);

-- Step 6: Create updated_at trigger for interventions
-- -------------------------------------------------------------

CREATE TRIGGER update_interventions_updated_at
BEFORE UPDATE ON public.interventions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Enable RLS on all tables
-- -------------------------------------------------------------

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_metric_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_outcomes ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for interventions
-- -------------------------------------------------------------

CREATE POLICY "Users can view own org interventions"
ON public.interventions
FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Users can create own org interventions"
ON public.interventions
FOR INSERT
WITH CHECK (is_same_team(organization_id));

CREATE POLICY "Users can update own org interventions"
ON public.interventions
FOR UPDATE
USING (is_same_team(organization_id));

CREATE POLICY "Users can delete own org interventions"
ON public.interventions
FOR DELETE
USING (is_same_team(organization_id));

-- Step 9: Create RLS policies for intervention_metric_links
-- -------------------------------------------------------------

CREATE POLICY "Users can view own org intervention links"
ON public.intervention_metric_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);

CREATE POLICY "Users can create own org intervention links"
ON public.intervention_metric_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);

CREATE POLICY "Users can update own org intervention links"
ON public.intervention_metric_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);

CREATE POLICY "Users can delete own org intervention links"
ON public.intervention_metric_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);

-- Step 10: Create RLS policies for intervention_outcomes
-- -------------------------------------------------------------

CREATE POLICY "Users can view own org intervention outcomes"
ON public.intervention_outcomes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);

CREATE POLICY "Users can create own org intervention outcomes"
ON public.intervention_outcomes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);

CREATE POLICY "Users can update own org intervention outcomes"
ON public.intervention_outcomes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);

CREATE POLICY "Users can delete own org intervention outcomes"
ON public.intervention_outcomes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_id
    AND is_same_team(i.organization_id)
  )
);