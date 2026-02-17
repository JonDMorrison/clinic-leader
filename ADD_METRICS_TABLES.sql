-- =====================================================
-- ADD METRIC_RESULTS TABLE TO NEW SUPABASE
-- Run this in SQL Editor after CONSOLIDATED_SCHEMA.sql
-- =====================================================

-- Create metrics table (if not exists from KPIs)
CREATE TABLE IF NOT EXISTS public.metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target NUMERIC,
  unit TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down', '>=', '<=', '==')),
  owner TEXT,
  category TEXT NOT NULL,
  sync_source TEXT NOT NULL DEFAULT 'manual' CHECK (sync_source IN ('manual', 'jane', 'spreadsheet')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create metric_results table for weekly/monthly data
CREATE TABLE IF NOT EXISTS public.metric_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  week_start DATE,
  value NUMERIC,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'manual',
  previous_value NUMERIC,
  overridden_at TIMESTAMP WITH TIME ZONE,
  period_start DATE,
  period_type TEXT CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'annual')),
  period_key TEXT,
  raw_row JSONB,
  selection_meta JSONB DEFAULT '{}',
  is_synthetic BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(metric_id, period_key, period_type)
);

-- Create tracked_kpis table (for active KPI configuration)
CREATE TABLE IF NOT EXISTS public.tracked_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  kpi_id UUID REFERENCES public.kpis(id) ON DELETE CASCADE,
  metric_id UUID REFERENCES public.metrics(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, kpi_id)
);

-- Enable RLS
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_kpis ENABLE ROW LEVEL SECURITY;

-- RLS policies for metrics (allow service_role for import)
CREATE POLICY "Service role can manage all metrics" 
  ON public.metrics FOR ALL TO service_role USING (true);

-- RLS policies for metric_results (allow service_role for import)
CREATE POLICY "Service role can manage all metric_results" 
  ON public.metric_results FOR ALL TO service_role USING (true);

-- RLS policies for tracked_kpis (allow service_role for import)
CREATE POLICY "Service role can manage all tracked_kpis" 
  ON public.tracked_kpis FOR ALL TO service_role USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_metric_results_metric_id ON public.metric_results(metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_results_period ON public.metric_results(period_start, period_type);
CREATE INDEX IF NOT EXISTS idx_metrics_org_id ON public.metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracked_kpis_team ON public.tracked_kpis(team_id);

-- Done!
