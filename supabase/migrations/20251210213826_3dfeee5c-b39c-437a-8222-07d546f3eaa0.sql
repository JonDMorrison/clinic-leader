-- Create vto_history table for immutable historical log of VTO versions + snapshots
CREATE TABLE IF NOT EXISTS public.vto_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  vto_version_id UUID,
  vto_version INT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT now(),

  -- JSON snapshots
  vto_snapshot JSONB NOT NULL,
  scorecard_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  rocks_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Impact metadata
  change_summary TEXT,
  impacted_sections TEXT[] DEFAULT '{}',
  scorecard_impact JSONB,
  rocks_impact JSONB,
  ai_insights TEXT,

  -- Audit and filtering
  tags TEXT[] DEFAULT '{}',
  is_manual BOOLEAN DEFAULT false
);

-- Add history_id to vto_versions
ALTER TABLE public.vto_versions
ADD COLUMN IF NOT EXISTS history_id UUID;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vto_history_org ON public.vto_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_vto_history_changed_at ON public.vto_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_vto_history_version ON public.vto_history(vto_version);

-- Enable RLS
ALTER TABLE public.vto_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vto_history
CREATE POLICY "Team members can read vto_history"
ON public.vto_history FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Managers can insert vto_history"
ON public.vto_history FOR INSERT
WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Admins can manage vto_history"
ON public.vto_history FOR ALL
USING (is_admin() AND is_same_team(organization_id))
WITH CHECK (is_admin() AND is_same_team(organization_id));

-- Grant permissions
GRANT SELECT ON public.vto_history TO authenticated;
GRANT INSERT ON public.vto_history TO authenticated;
GRANT UPDATE ON public.vto_history TO authenticated;