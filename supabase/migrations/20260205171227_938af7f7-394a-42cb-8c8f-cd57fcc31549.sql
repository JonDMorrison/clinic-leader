-- Intervention Pattern Clusters Table
-- Stores anonymized, aggregated patterns across interventions
-- No org-identifiable data is stored

CREATE TABLE public.intervention_pattern_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Clustering Dimensions (anonymized)
  metric_id uuid REFERENCES public.metrics(id) ON DELETE SET NULL,
  intervention_type text NOT NULL,
  org_size_band text NOT NULL, -- 'small', 'medium', 'large'
  specialty_type text, -- Optional specialty grouping
  time_horizon_band text NOT NULL, -- '30d', '60d', '90d', '120d+'
  baseline_range_band text NOT NULL, -- 'low', 'medium', 'high'
  
  -- Pattern Scoring
  success_rate numeric NOT NULL, -- 0-100%
  sample_size integer NOT NULL DEFAULT 0,
  avg_effect_magnitude numeric, -- Average delta %
  median_effect_magnitude numeric,
  effect_std_deviation numeric,
  
  -- Recency-weighted score (decayed over time)
  recency_weighted_score numeric,
  
  -- Confidence metrics
  pattern_confidence numeric, -- Composite confidence 0-100
  min_interventions_for_pattern integer DEFAULT 5,
  
  -- Metadata
  last_computed_at timestamp with time zone NOT NULL DEFAULT now(),
  computation_version text DEFAULT '1.0',
  
  -- Unique constraint on cluster dimensions
  UNIQUE (metric_id, intervention_type, org_size_band, time_horizon_band, baseline_range_band, specialty_type)
);

-- Index for efficient lookups by recommendation engine
CREATE INDEX idx_pattern_clusters_metric ON public.intervention_pattern_clusters(metric_id);
CREATE INDEX idx_pattern_clusters_type ON public.intervention_pattern_clusters(intervention_type);
CREATE INDEX idx_pattern_clusters_confidence ON public.intervention_pattern_clusters(pattern_confidence DESC);

-- Enable RLS
ALTER TABLE public.intervention_pattern_clusters ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can read patterns (anonymized data)
CREATE POLICY "Authenticated users can read patterns"
ON public.intervention_pattern_clusters
FOR SELECT
TO authenticated
USING (true);

-- RLS: Only service role can write (via edge function)
-- No direct client writes allowed

-- Audit table for pattern computation runs
CREATE TABLE public.intervention_pattern_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  computed_at timestamp with time zone NOT NULL DEFAULT now(),
  patterns_generated integer NOT NULL DEFAULT 0,
  interventions_analyzed integer NOT NULL DEFAULT 0,
  orgs_included integer NOT NULL DEFAULT 0,
  computation_duration_ms integer,
  error_message text,
  version text DEFAULT '1.0'
);

-- RLS for audit table
ALTER TABLE public.intervention_pattern_audit ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read audit logs
CREATE POLICY "Authenticated users can read pattern audit"
ON public.intervention_pattern_audit
FOR SELECT
TO authenticated
USING (true);