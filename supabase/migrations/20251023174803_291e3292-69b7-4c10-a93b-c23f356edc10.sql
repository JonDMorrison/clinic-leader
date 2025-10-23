-- Add batch tracking for KPI defaults
CREATE TABLE IF NOT EXISTS public.kpi_default_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  template_key TEXT NOT NULL,
  include_bundles TEXT[] DEFAULT '{}',
  include_targets BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.kpi_default_batches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage kpi_default_batches"
ON public.kpi_default_batches
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Managers can manage team kpi_default_batches"
ON public.kpi_default_batches
FOR ALL
USING (is_manager() AND is_same_team(organization_id))
WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read kpi_default_batches"
ON public.kpi_default_batches
FOR SELECT
USING (is_same_team(organization_id));

-- Add new columns to kpis table
ALTER TABLE public.kpis
ADD COLUMN IF NOT EXISTS default_batch_id UUID REFERENCES public.kpi_default_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS display_group TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER,
ADD COLUMN IF NOT EXISTS is_computed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expression TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_kpis_default_batch_id ON public.kpis(default_batch_id);
CREATE INDEX IF NOT EXISTS idx_kpis_display_group_order ON public.kpis(display_group, display_order);
CREATE INDEX IF NOT EXISTS idx_kpi_default_batches_org ON public.kpi_default_batches(organization_id, archived_at);