-- Create scorecard_import_configs table for Google Sheet sync configuration
CREATE TABLE public.scorecard_import_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual_upload' CHECK (source IN ('manual_upload', 'google_sheet')),
  sheet_id TEXT,
  tab_name TEXT DEFAULT 'Scorecard_Input',
  last_synced_at TIMESTAMPTZ,
  last_synced_month TEXT,
  status TEXT DEFAULT 'not_configured' CHECK (status IN ('not_configured', 'ok', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scorecard_import_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies: org members can read, org admins can update
CREATE POLICY "Users can view their org scorecard import config"
  ON public.scorecard_import_configs
  FOR SELECT
  USING (organization_id = public.current_user_team());

CREATE POLICY "Users can insert their org scorecard import config"
  ON public.scorecard_import_configs
  FOR INSERT
  WITH CHECK (organization_id = public.current_user_team());

CREATE POLICY "Users can update their org scorecard import config"
  ON public.scorecard_import_configs
  FOR UPDATE
  USING (organization_id = public.current_user_team());

-- Add updated_at trigger
CREATE TRIGGER update_scorecard_import_configs_updated_at
  BEFORE UPDATE ON public.scorecard_import_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for org lookup
CREATE INDEX idx_scorecard_import_configs_org ON public.scorecard_import_configs(organization_id);