-- Data Minimization & Scope Enforcement
-- Add data scope fields to bulk_analytics_connectors

ALTER TABLE public.bulk_analytics_connectors
ADD COLUMN IF NOT EXISTS allowed_resources TEXT[] DEFAULT ARRAY['appointments_summary', 'payments_summary', 'shifts_summary', 'invoices_summary'],
ADD COLUMN IF NOT EXISTS prohibited_fields TEXT[] DEFAULT ARRAY[
  'patient_name', 'patient_first_name', 'patient_last_name', 'first_name', 'last_name', 'name',
  'email', 'patient_email', 'email_address',
  'phone', 'phone_number', 'mobile', 'cell', 'patient_phone',
  'address', 'street', 'street_address', 'address_line_1', 'address_line_2',
  'ssn', 'social_security', 'sin', 'social_insurance',
  'dob', 'date_of_birth', 'birth_date', 'birthdate',
  'clinical_notes', 'notes', 'soap_notes', 'treatment_notes', 'chart_notes', 'subjective', 'objective', 'assessment', 'plan',
  'diagnosis', 'diagnoses', 'icd_code', 'diagnosis_code',
  'insurance_id', 'policy_number', 'member_id', 'group_number',
  'credit_card', 'card_number', 'cvv', 'expiry',
  'password', 'secret', 'token'
],
ADD COLUMN IF NOT EXISTS ingestion_mode TEXT DEFAULT 'aggregate_only' CHECK (ingestion_mode IN ('aggregate_only', 'detail_allowed'));

-- Create quarantined fields log table
CREATE TABLE IF NOT EXISTS public.quarantined_fields_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES public.bulk_analytics_connectors(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_value_preview TEXT, -- First 20 chars, redacted
  detection_method TEXT NOT NULL, -- 'prohibited_list', 'phi_pattern', 'unknown_column'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'warning', 'critical', 'blocked'
  action_taken TEXT NOT NULL DEFAULT 'field_dropped', -- 'field_dropped', 'row_dropped', 'file_blocked'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_quarantined_fields_org ON public.quarantined_fields_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_quarantined_fields_connector ON public.quarantined_fields_log(connector_id);
CREATE INDEX IF NOT EXISTS idx_quarantined_fields_severity ON public.quarantined_fields_log(severity);
CREATE INDEX IF NOT EXISTS idx_quarantined_fields_created ON public.quarantined_fields_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.quarantined_fields_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can read quarantined_fields_log"
ON public.quarantined_fields_log FOR SELECT
USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "System can insert quarantined_fields_log"
ON public.quarantined_fields_log FOR INSERT
WITH CHECK (true);

-- Create a view for data scope compliance summary
CREATE OR REPLACE VIEW v_data_scope_compliance AS
SELECT 
  q.organization_id,
  q.connector_id,
  DATE(q.created_at) as log_date,
  COUNT(*) as total_violations,
  COUNT(*) FILTER (WHERE q.severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE q.severity = 'warning') as warning_count,
  COUNT(DISTINCT q.field_name) as unique_fields_flagged,
  COUNT(DISTINCT q.file_name) as files_affected
FROM quarantined_fields_log q
GROUP BY q.organization_id, q.connector_id, DATE(q.created_at);

-- Add comment explaining the table purpose
COMMENT ON TABLE public.quarantined_fields_log IS 'Audit log for data minimization - tracks any PHI or prohibited fields detected during ingestion';
COMMENT ON COLUMN public.bulk_analytics_connectors.allowed_resources IS 'Whitelist of resource types that can be ingested (e.g. appointments_summary)';
COMMENT ON COLUMN public.bulk_analytics_connectors.prohibited_fields IS 'Blacklist of field names that must never be stored';
COMMENT ON COLUMN public.bulk_analytics_connectors.ingestion_mode IS 'aggregate_only = no patient-level detail, detail_allowed = anonymized detail ok';