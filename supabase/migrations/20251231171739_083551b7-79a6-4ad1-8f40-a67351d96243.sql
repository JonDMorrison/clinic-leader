-- Phase 1: Jane Data Pipe - Data Model Updates
-- Extend bulk_analytics_connectors with new columns
ALTER TABLE bulk_analytics_connectors 
ADD COLUMN IF NOT EXISTS s3_bucket TEXT,
ADD COLUMN IF NOT EXISTS s3_region TEXT DEFAULT 'us-west-2',
ADD COLUMN IF NOT EXISTS s3_role_arn TEXT,
ADD COLUMN IF NOT EXISTS s3_external_id TEXT,
ADD COLUMN IF NOT EXISTS s3_prefix TEXT,
ADD COLUMN IF NOT EXISTS locked_account_guid TEXT,
ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'clinic_owned';

-- Add comment for clarity
COMMENT ON COLUMN bulk_analytics_connectors.locked_account_guid IS 'Captured from first ingested filename. Must never change after set.';
COMMENT ON COLUMN bulk_analytics_connectors.delivery_mode IS 'clinic_owned (customer creates bucket) or partner_managed (ClinicLeader provides bucket)';

-- Extend file_ingest_log for Jane-specific data
ALTER TABLE file_ingest_log 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES teams(id),
ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS resource_name TEXT,
ADD COLUMN IF NOT EXISTS s3_bucket TEXT,
ADD COLUMN IF NOT EXISTS s3_key TEXT,
ADD COLUMN IF NOT EXISTS file_date DATE,
ADD COLUMN IF NOT EXISTS account_guid TEXT;

-- Add unique constraint to prevent duplicate file processing
ALTER TABLE file_ingest_log 
ADD CONSTRAINT file_ingest_log_org_checksum_unique UNIQUE (organization_id, checksum);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_file_ingest_log_org_source ON file_ingest_log(organization_id, source_system);
CREATE INDEX IF NOT EXISTS idx_file_ingest_log_status ON file_ingest_log(status);
CREATE INDEX IF NOT EXISTS idx_bulk_connectors_org_source ON bulk_analytics_connectors(organization_id, source_system);
CREATE INDEX IF NOT EXISTS idx_bulk_connectors_status ON bulk_analytics_connectors(status);

-- ============================================
-- Jane Staging Tables
-- ============================================

-- Staging: Appointments
CREATE TABLE IF NOT EXISTS staging_appointments_jane (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES teams(id),
  account_guid TEXT NOT NULL,
  file_date DATE NOT NULL,
  
  -- Jane appointment fields
  appointment_guid TEXT NOT NULL,
  patient_guid TEXT,
  staff_member_guid TEXT,
  treatment_guid TEXT,
  clinic_guid TEXT,
  location_name TEXT,
  discipline_name TEXT,
  treatment_name TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  created_at_jane TIMESTAMPTZ,
  updated_at_jane TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ,
  price NUMERIC,
  first_visit BOOLEAN,
  
  -- Metadata
  raw_row JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staging_appointments_jane_upsert_key 
ON staging_appointments_jane(organization_id, appointment_guid, file_date);

-- Staging: Patients (no PHI - only hashed/anonymized data)
CREATE TABLE IF NOT EXISTS staging_patients_jane (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES teams(id),
  account_guid TEXT NOT NULL,
  file_date DATE NOT NULL,
  
  -- Jane patient fields (no PHI)
  patient_guid TEXT NOT NULL,
  clinic_guid TEXT,
  city TEXT,
  province TEXT,
  postal TEXT,
  country TEXT,
  sex TEXT,
  referral_source TEXT,
  dob DATE,
  discharged_at TIMESTAMPTZ,
  email_hash TEXT,
  
  -- Metadata
  raw_row JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staging_patients_jane_upsert_key 
ON staging_patients_jane(organization_id, patient_guid, file_date);

-- Staging: Payments
CREATE TABLE IF NOT EXISTS staging_payments_jane (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES teams(id),
  account_guid TEXT NOT NULL,
  file_date DATE NOT NULL,
  
  -- Jane payment fields
  payment_guid TEXT NOT NULL,
  clinic_guid TEXT,
  location_guid TEXT,
  patient_account_guid TEXT,
  amount NUMERIC,
  payment_type TEXT,
  payer_type TEXT,
  payer_id TEXT,
  received_at TIMESTAMPTZ,
  workflow TEXT,
  payment_method TEXT,
  card_type TEXT,
  
  -- Metadata
  raw_row JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staging_payments_jane_upsert_key 
ON staging_payments_jane(organization_id, payment_guid, file_date);

-- Staging: Invoices
CREATE TABLE IF NOT EXISTS staging_invoices_jane (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES teams(id),
  account_guid TEXT NOT NULL,
  file_date DATE NOT NULL,
  
  -- Jane invoice fields
  invoice_guid TEXT,
  purchasable_guid TEXT,
  patient_guid TEXT,
  staff_member_guid TEXT,
  clinic_guid TEXT,
  subtotal NUMERIC,
  amount_paid NUMERIC,
  income_category TEXT,
  invoiced_at TIMESTAMPTZ,
  payer_type TEXT,
  
  -- Metadata
  raw_row JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staging_invoices_jane_upsert_key 
ON staging_invoices_jane(organization_id, COALESCE(invoice_guid, purchasable_guid), file_date);

-- Staging: Shifts
CREATE TABLE IF NOT EXISTS staging_shifts_jane (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES teams(id),
  account_guid TEXT NOT NULL,
  file_date DATE NOT NULL,
  
  -- Jane shift fields
  shift_guid TEXT NOT NULL,
  staff_member_guid TEXT,
  clinic_guid TEXT,
  location_guid TEXT,
  room_guid TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  book_online BOOLEAN,
  call_to_book BOOLEAN,
  
  -- Metadata
  raw_row JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staging_shifts_jane_upsert_key 
ON staging_shifts_jane(organization_id, shift_guid, file_date);

-- ============================================
-- RLS Policies for Staging Tables
-- ============================================

ALTER TABLE staging_appointments_jane ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_patients_jane ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_payments_jane ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_invoices_jane ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_shifts_jane ENABLE ROW LEVEL SECURITY;

-- Staging tables are system-managed, only service role writes
-- Admins can read for debugging
CREATE POLICY "Admins can read staging_appointments_jane"
  ON staging_appointments_jane FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Admins can read staging_patients_jane"
  ON staging_patients_jane FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Admins can read staging_payments_jane"
  ON staging_payments_jane FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Admins can read staging_invoices_jane"
  ON staging_invoices_jane FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Admins can read staging_shifts_jane"
  ON staging_shifts_jane FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

-- Update triggers for updated_at
CREATE TRIGGER update_staging_appointments_jane_updated_at
  BEFORE UPDATE ON staging_appointments_jane
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staging_patients_jane_updated_at
  BEFORE UPDATE ON staging_patients_jane
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staging_payments_jane_updated_at
  BEFORE UPDATE ON staging_payments_jane
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staging_invoices_jane_updated_at
  BEFORE UPDATE ON staging_invoices_jane
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staging_shifts_jane_updated_at
  BEFORE UPDATE ON staging_shifts_jane
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();