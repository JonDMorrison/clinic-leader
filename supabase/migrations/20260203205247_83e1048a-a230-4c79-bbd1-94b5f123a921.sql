-- Add EMR source type to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS emr_source_type TEXT DEFAULT 'unknown';

-- Add constraint for allowed values
ALTER TABLE public.teams 
ADD CONSTRAINT teams_emr_source_type_check 
CHECK (emr_source_type IN ('jane', 'jane_pipe', 'spreadsheet', 'manual', 'hybrid', 'unknown'));

-- Create computed flag function for is_jane_integrated
CREATE OR REPLACE FUNCTION public.is_jane_integrated(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT emr_source_type IN ('jane', 'jane_pipe') FROM teams WHERE id = org_id),
    false
  );
$$;

-- Create benchmark metric aggregates table for anonymized cross-org comparisons
CREATE TABLE public.benchmark_metric_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  period_key TEXT NOT NULL,
  emr_source_group TEXT NOT NULL CHECK (emr_source_group IN ('jane', 'non_jane')),
  organization_count INTEGER NOT NULL DEFAULT 0,
  median_value NUMERIC,
  percentile_25 NUMERIC,
  percentile_75 NUMERIC,
  std_deviation NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  sample_size INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  methodology_version TEXT NOT NULL DEFAULT 'v1.0',
  CONSTRAINT benchmark_min_sample_size CHECK (sample_size >= 5),
  UNIQUE(metric_key, period_key, emr_source_group)
);

-- Create EMR data quality scores table
CREATE TABLE public.emr_data_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  completeness_score NUMERIC NOT NULL DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  latency_score NUMERIC NOT NULL DEFAULT 0 CHECK (latency_score >= 0 AND latency_score <= 100),
  consistency_score NUMERIC NOT NULL DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),
  overall_score NUMERIC NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  missing_fields_count INTEGER NOT NULL DEFAULT 0,
  avg_reporting_delay_hours NUMERIC,
  audit_pass_rate NUMERIC,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, period_key)
);

-- Create EMR comparison snapshots (organization-specific positioning)
CREATE TABLE public.emr_comparison_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  org_value NUMERIC NOT NULL,
  org_normalized_value NUMERIC NOT NULL,
  jane_cohort_median NUMERIC,
  jane_cohort_percentile_position NUMERIC,
  non_jane_cohort_median NUMERIC,
  non_jane_cohort_percentile_position NUMERIC,
  delta_vs_jane NUMERIC,
  delta_vs_non_jane NUMERIC,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, period_key, metric_key)
);

-- Create intervention EMR analysis table
CREATE TABLE public.intervention_emr_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key TEXT NOT NULL,
  emr_source_group TEXT NOT NULL CHECK (emr_source_group IN ('jane', 'non_jane')),
  intervention_type TEXT NOT NULL,
  total_interventions INTEGER NOT NULL DEFAULT 0,
  successful_interventions INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC,
  avg_resolution_days NUMERIC,
  avg_improvement_percent NUMERIC,
  recurrence_rate NUMERIC,
  sample_size INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT intervention_emr_min_sample CHECK (sample_size >= 5),
  UNIQUE(period_key, emr_source_group, intervention_type)
);

-- Create index for efficient querying
CREATE INDEX idx_benchmark_aggregates_lookup ON public.benchmark_metric_aggregates(metric_key, period_key);
CREATE INDEX idx_emr_quality_org ON public.emr_data_quality_scores(organization_id);
CREATE INDEX idx_emr_comparison_org ON public.emr_comparison_snapshots(organization_id, period_key);
CREATE INDEX idx_intervention_emr_lookup ON public.intervention_emr_analysis(period_key, emr_source_group);

-- Enable RLS on all tables
ALTER TABLE public.benchmark_metric_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_data_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emr_comparison_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_emr_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for benchmark_metric_aggregates (read-only for authenticated, no org filter needed - aggregates are anonymized)
CREATE POLICY "Authenticated users can view benchmark aggregates"
ON public.benchmark_metric_aggregates FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for emr_data_quality_scores (org-scoped)
CREATE POLICY "Users can view their org quality scores"
ON public.emr_data_quality_scores FOR SELECT
USING (is_same_team(organization_id));

-- RLS Policies for emr_comparison_snapshots (org-scoped)
CREATE POLICY "Users can view their org comparison snapshots"
ON public.emr_comparison_snapshots FOR SELECT
USING (is_same_team(organization_id));

-- RLS Policies for intervention_emr_analysis (read-only for authenticated - aggregates are anonymized)
CREATE POLICY "Authenticated users can view intervention EMR analysis"
ON public.intervention_emr_analysis FOR SELECT
TO authenticated
USING (true);