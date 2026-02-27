
-- Clinic Insights table for computed insights from Jane data pipeline
CREATE TABLE public.clinic_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_guid TEXT NOT NULL,
  insight_key TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'positive')),
  value_primary NUMERIC,
  value_secondary NUMERIC,
  money_impact NUMERIC,
  data_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one insight per clinic per key (latest wins on upsert)
ALTER TABLE public.clinic_insights
  ADD CONSTRAINT uq_clinic_insights_key UNIQUE (clinic_guid, insight_key);

-- Index for fast lookups
CREATE INDEX idx_clinic_insights_clinic ON public.clinic_insights (clinic_guid);
CREATE INDEX idx_clinic_insights_severity ON public.clinic_insights (severity);

-- Enable RLS
ALTER TABLE public.clinic_insights ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (insights are system-generated)
CREATE POLICY "Authenticated users can view insights"
  ON public.clinic_insights FOR SELECT
  TO authenticated
  USING (true);
