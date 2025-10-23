-- Add batch tracking for Rock defaults
CREATE TABLE IF NOT EXISTS public.rock_default_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  template_key TEXT NOT NULL,
  include_bundles TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.rock_default_batches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage rock_default_batches"
ON public.rock_default_batches
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Managers can manage team rock_default_batches"
ON public.rock_default_batches
FOR ALL
USING (is_manager() AND is_same_team(organization_id))
WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read rock_default_batches"
ON public.rock_default_batches
FOR SELECT
USING (is_same_team(organization_id));

-- Add new columns to rocks table
ALTER TABLE public.rocks
ADD COLUMN IF NOT EXISTS default_batch_id UUID REFERENCES public.rock_default_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS display_group TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER,
ADD COLUMN IF NOT EXISTS note TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rocks_default_batch_id ON public.rocks(default_batch_id);
CREATE INDEX IF NOT EXISTS idx_rocks_display_group_order ON public.rocks(display_group, display_order);
CREATE INDEX IF NOT EXISTS idx_rock_default_batches_org ON public.rock_default_batches(organization_id, archived_at);