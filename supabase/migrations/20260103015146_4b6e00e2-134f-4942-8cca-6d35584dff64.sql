-- Data retention policies table
CREATE TABLE public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 90,
  is_purgeable BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, resource_type)
);

-- Purge log table (immutable audit trail)
CREATE TABLE public.data_purge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id),
  resource_type TEXT NOT NULL,
  records_purged INTEGER NOT NULL DEFAULT 0,
  oldest_record_date DATE,
  newest_record_date DATE,
  retention_days_applied INTEGER NOT NULL,
  purge_type TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' or 'manual'
  requested_by UUID,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT
);

-- Manual deletion requests table
CREATE TABLE public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id),
  requested_by UUID NOT NULL,
  resource_type TEXT NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, executed, rejected
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  records_deleted INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_purge_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS for data_retention_policies
CREATE POLICY "Admins can manage org retention policies"
  ON public.data_retention_policies FOR ALL
  USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Team members can view retention policies"
  ON public.data_retention_policies FOR SELECT
  USING (is_same_team(organization_id));

-- RLS for data_purge_log (immutable - no updates/deletes)
CREATE POLICY "Admins can view org purge logs"
  ON public.data_purge_log FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "System can insert purge logs"
  ON public.data_purge_log FOR INSERT
  WITH CHECK (true);

-- RLS for data_deletion_requests
CREATE POLICY "Admins can manage deletion requests"
  ON public.data_deletion_requests FOR ALL
  USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Users can view their own requests"
  ON public.data_deletion_requests FOR SELECT
  USING (requested_by = current_user_id());

-- Insert default retention policies (will be org-specific when created)
-- These serve as system defaults

-- Create index for efficient purge queries
CREATE INDEX idx_staging_appointments_jane_file_date ON public.staging_appointments_jane(organization_id, file_date);
CREATE INDEX idx_staging_patients_jane_file_date ON public.staging_patients_jane(organization_id, file_date);
CREATE INDEX idx_staging_payments_jane_file_date ON public.staging_payments_jane(organization_id, file_date);
CREATE INDEX idx_staging_invoices_jane_file_date ON public.staging_invoices_jane(organization_id, file_date);
CREATE INDEX idx_staging_shifts_jane_file_date ON public.staging_shifts_jane(organization_id, file_date);
CREATE INDEX idx_data_purge_log_org_date ON public.data_purge_log(organization_id, executed_at DESC);