-- Add RLS policies for quarantined_fields_log so admins/managers can view
-- (The table was created earlier but may be missing read policies)

-- Drop existing policies if any to recreate cleanly
DROP POLICY IF EXISTS "Admins can view quarantined fields" ON public.quarantined_fields_log;
DROP POLICY IF EXISTS "Managers can view quarantined fields" ON public.quarantined_fields_log;
DROP POLICY IF EXISTS "System can insert quarantined fields" ON public.quarantined_fields_log;

-- Enable RLS if not already enabled
ALTER TABLE public.quarantined_fields_log ENABLE ROW LEVEL SECURITY;

-- Admins can view their org's quarantined fields
CREATE POLICY "Admins can view quarantined fields"
  ON public.quarantined_fields_log FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

-- Managers can view their org's quarantined fields
CREATE POLICY "Managers can view quarantined fields"
  ON public.quarantined_fields_log FOR SELECT
  USING (is_manager() AND is_same_team(organization_id));

-- System can insert (edge functions)
CREATE POLICY "System can insert quarantined fields"
  ON public.quarantined_fields_log FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies - quarantine log is immutable
COMMENT ON TABLE public.quarantined_fields_log IS 'Immutable log of PHI fields detected and discarded during ingestion. Entries cannot be modified.';