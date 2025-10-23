-- Create jane_integrations table for API-based sync
CREATE TABLE IF NOT EXISTS public.jane_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  clinic_id TEXT,
  sync_scope TEXT[] DEFAULT ARRAY['appointments','patients','payments','metrics'],
  sync_mode TEXT DEFAULT 'daily',
  last_sync TIMESTAMPTZ,
  next_sync TIMESTAMPTZ,
  status TEXT DEFAULT 'disconnected',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jane_integrations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all jane_integrations
CREATE POLICY "Admins can manage jane_integrations"
ON public.jane_integrations
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Team members can read their team's integration
CREATE POLICY "Team members can read jane_integrations"
ON public.jane_integrations
FOR SELECT
TO authenticated
USING (is_same_team(team_id));

-- Managers can manage team jane_integrations
CREATE POLICY "Managers can manage team jane_integrations"
ON public.jane_integrations
FOR ALL
TO authenticated
USING (is_manager() AND is_same_team(team_id))
WITH CHECK (is_manager() AND is_same_team(team_id));

-- Add trigger for updated_at
CREATE TRIGGER update_jane_integrations_updated_at
BEFORE UPDATE ON public.jane_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sync logs table
CREATE TABLE IF NOT EXISTS public.jane_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.jane_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on sync logs
ALTER TABLE public.jane_sync_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all sync logs
CREATE POLICY "Admins can read sync_logs"
ON public.jane_sync_logs
FOR SELECT
TO authenticated
USING (is_admin());

-- Team members can read their team's sync logs
CREATE POLICY "Team members can read sync_logs"
ON public.jane_sync_logs
FOR SELECT
TO authenticated
USING (
  integration_id IN (
    SELECT id FROM public.jane_integrations WHERE is_same_team(team_id)
  )
);