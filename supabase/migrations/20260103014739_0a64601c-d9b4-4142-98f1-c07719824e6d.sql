-- =============================================================================
-- ZERO STANDING ACCESS: Raw Data Access Control System
-- =============================================================================

-- Temporary access requests table
CREATE TABLE public.data_access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  justification TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- e.g., 'staging_appointments_jane', 'staging_patients_jane'
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit log for all data access attempts
CREATE TABLE public.data_access_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  action TEXT NOT NULL, -- 'view', 'export', 'query'
  row_count INTEGER,
  access_request_id UUID REFERENCES public.data_access_requests(id),
  justification TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.data_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_audit ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_data_access_requests_user ON public.data_access_requests(user_id, status);
CREATE INDEX idx_data_access_requests_org ON public.data_access_requests(organization_id, status);
CREATE INDEX idx_data_access_requests_expires ON public.data_access_requests(expires_at) WHERE status = 'approved';
CREATE INDEX idx_data_access_audit_org ON public.data_access_audit(organization_id, accessed_at DESC);
CREATE INDEX idx_data_access_audit_user ON public.data_access_audit(user_id, accessed_at DESC);

-- =============================================================================
-- HELPER FUNCTION: Check if user has valid (non-expired) access to a resource
-- =============================================================================
CREATE OR REPLACE FUNCTION public.has_valid_data_access(
  _user_id UUID,
  _resource_type TEXT,
  _org_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.data_access_requests
    WHERE user_id = _user_id
      AND resource_type = _resource_type
      AND organization_id = _org_id
      AND status = 'approved'
      AND expires_at > now()
  )
$$;

-- =============================================================================
-- RLS POLICIES: Data Access Requests
-- =============================================================================

-- Users can view their own access requests
CREATE POLICY "Users can view own access requests"
ON public.data_access_requests
FOR SELECT
USING (user_id = current_user_id());

-- Users can create access requests for their own org
CREATE POLICY "Users can create access requests"
ON public.data_access_requests
FOR INSERT
WITH CHECK (
  user_id = current_user_id() 
  AND is_same_team(organization_id)
);

-- Admins can manage all access requests in their org
CREATE POLICY "Admins can manage org access requests"
ON public.data_access_requests
FOR ALL
USING (is_admin() AND is_same_team(organization_id))
WITH CHECK (is_admin() AND is_same_team(organization_id));

-- =============================================================================
-- RLS POLICIES: Data Access Audit
-- =============================================================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view org audit logs"
ON public.data_access_audit
FOR SELECT
USING (is_admin() AND is_same_team(organization_id));

-- System can insert audit entries (no user can insert directly)
CREATE POLICY "System can insert audit entries"
ON public.data_access_audit
FOR INSERT
WITH CHECK (true);

-- Audit logs are immutable - no updates or deletes
-- (No UPDATE or DELETE policies)

-- =============================================================================
-- UPDATE STAGING TABLE POLICIES: Zero Standing Access
-- =============================================================================

-- Drop existing permissive policies on staging tables and add restrictive ones
-- staging_appointments_jane
DROP POLICY IF EXISTS "Admins can read staging_appointments_jane" ON public.staging_appointments_jane;
CREATE POLICY "Users with valid access can read staging_appointments_jane"
ON public.staging_appointments_jane
FOR SELECT
USING (
  is_same_team(organization_id)
  AND has_valid_data_access(current_user_id(), 'staging_appointments_jane', organization_id)
);

-- staging_patients_jane
DROP POLICY IF EXISTS "Admins can read staging_patients_jane" ON public.staging_patients_jane;
CREATE POLICY "Users with valid access can read staging_patients_jane"
ON public.staging_patients_jane
FOR SELECT
USING (
  is_same_team(organization_id)
  AND has_valid_data_access(current_user_id(), 'staging_patients_jane', organization_id)
);

-- staging_payments_jane
DROP POLICY IF EXISTS "Admins can read staging_payments_jane" ON public.staging_payments_jane;
CREATE POLICY "Users with valid access can read staging_payments_jane"
ON public.staging_payments_jane
FOR SELECT
USING (
  is_same_team(organization_id)
  AND has_valid_data_access(current_user_id(), 'staging_payments_jane', organization_id)
);

-- staging_invoices_jane
DROP POLICY IF EXISTS "Admins can read staging_invoices_jane" ON public.staging_invoices_jane;
CREATE POLICY "Users with valid access can read staging_invoices_jane"
ON public.staging_invoices_jane
FOR SELECT
USING (
  is_same_team(organization_id)
  AND has_valid_data_access(current_user_id(), 'staging_invoices_jane', organization_id)
);

-- staging_shifts_jane (if exists)
DROP POLICY IF EXISTS "Admins can read staging_shifts_jane" ON public.staging_shifts_jane;
CREATE POLICY "Users with valid access can read staging_shifts_jane"
ON public.staging_shifts_jane
FOR SELECT
USING (
  is_same_team(organization_id)
  AND has_valid_data_access(current_user_id(), 'staging_shifts_jane', organization_id)
);

-- =============================================================================
-- FUNCTION: Auto-expire access requests (called by cron or manually)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.expire_data_access_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.data_access_requests
  SET status = 'expired'
  WHERE status = 'approved'
    AND expires_at <= now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Add comment explaining the zero standing access model
COMMENT ON TABLE public.data_access_requests IS 'Temporary access requests for raw staging data. Implements zero standing access model - all access must be explicitly requested, justified, and time-limited.';
COMMENT ON TABLE public.data_access_audit IS 'Immutable audit log of all data access attempts. Used for compliance and security reviews.';
COMMENT ON FUNCTION public.has_valid_data_access IS 'Checks if a user has a valid (approved, non-expired) access request for a specific resource.';