-- Add immutable account locking constraint
-- Prevent locked_account_guid from being changed once set

-- Create a function to enforce immutable locked_account_guid
CREATE OR REPLACE FUNCTION public.enforce_immutable_account_guid()
RETURNS TRIGGER AS $$
BEGIN
  -- If locked_account_guid was set (not null) and is being changed to a different value
  IF OLD.locked_account_guid IS NOT NULL 
     AND NEW.locked_account_guid IS DISTINCT FROM OLD.locked_account_guid THEN
    RAISE EXCEPTION 'locked_account_guid cannot be modified once set. Current: %, Attempted: %', 
      OLD.locked_account_guid, NEW.locked_account_guid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce immutability
DROP TRIGGER IF EXISTS enforce_account_guid_immutable ON public.bulk_analytics_connectors;
CREATE TRIGGER enforce_account_guid_immutable
  BEFORE UPDATE ON public.bulk_analytics_connectors
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_immutable_account_guid();

-- Add a check constraint to ensure locked_account_guid format (if set)
ALTER TABLE public.bulk_analytics_connectors
  DROP CONSTRAINT IF EXISTS check_locked_account_guid_format;
  
ALTER TABLE public.bulk_analytics_connectors
  ADD CONSTRAINT check_locked_account_guid_format
  CHECK (locked_account_guid IS NULL OR length(locked_account_guid) >= 10);

-- Create an audit table for account lock events
CREATE TABLE IF NOT EXISTS public.account_lock_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  connector_id UUID NOT NULL,
  locked_account_guid TEXT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by TEXT, -- file that triggered the lock
  CONSTRAINT fk_account_lock_org FOREIGN KEY (organization_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_account_lock_connector FOREIGN KEY (connector_id) REFERENCES public.bulk_analytics_connectors(id) ON DELETE CASCADE
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_account_lock_audit_connector ON public.account_lock_audit(connector_id);

-- RLS policies for audit table
ALTER TABLE public.account_lock_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view account lock audit"
  ON public.account_lock_audit FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "System can insert account lock audit"
  ON public.account_lock_audit FOR INSERT
  WITH CHECK (true);

-- Add rejection log table for tracking rejected files
CREATE TABLE IF NOT EXISTS public.file_rejection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  connector_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  rejection_reason TEXT NOT NULL,
  expected_account_guid TEXT,
  received_account_guid TEXT,
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_checksum TEXT,
  CONSTRAINT fk_rejection_org FOREIGN KEY (organization_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_rejection_connector FOREIGN KEY (connector_id) REFERENCES public.bulk_analytics_connectors(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_rejection_connector ON public.file_rejection_log(connector_id);
CREATE INDEX IF NOT EXISTS idx_file_rejection_org ON public.file_rejection_log(organization_id);

-- RLS policies
ALTER TABLE public.file_rejection_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view file rejections"
  ON public.file_rejection_log FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "System can insert file rejections"
  ON public.file_rejection_log FOR INSERT
  WITH CHECK (true);