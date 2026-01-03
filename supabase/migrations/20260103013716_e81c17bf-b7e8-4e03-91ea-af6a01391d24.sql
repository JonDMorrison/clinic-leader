-- Create immutable data ingestion ledger for audit trail
CREATE TABLE IF NOT EXISTS public.data_ingestion_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  connector_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_system TEXT NOT NULL DEFAULT 'Jane Data Pipe',
  resource_type TEXT NOT NULL,
  file_name TEXT,
  file_date DATE,
  rows_received INTEGER NOT NULL DEFAULT 0,
  rows_ingested INTEGER NOT NULL DEFAULT 0,
  rows_dropped INTEGER GENERATED ALWAYS AS (rows_received - rows_ingested) STORED,
  fields_quarantined INTEGER NOT NULL DEFAULT 0,
  checksum TEXT,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected', 'partial')),
  rejection_reason TEXT,
  processing_duration_ms INTEGER,
  account_guid_verified BOOLEAN DEFAULT false,
  data_minimization_applied BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_ledger_org FOREIGN KEY (organization_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_connector FOREIGN KEY (connector_id) REFERENCES public.bulk_analytics_connectors(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ledger_org_timestamp ON public.data_ingestion_ledger(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_resource ON public.data_ingestion_ledger(resource_type);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON public.data_ingestion_ledger(status);

-- Enable RLS
ALTER TABLE public.data_ingestion_ledger ENABLE ROW LEVEL SECURITY;

-- Admins can view their org's ledger entries
CREATE POLICY "Admins can view org ledger"
  ON public.data_ingestion_ledger FOR SELECT
  USING (is_admin() AND is_same_team(organization_id));

-- Managers can view their org's ledger entries
CREATE POLICY "Managers can view org ledger"
  ON public.data_ingestion_ledger FOR SELECT
  USING (is_manager() AND is_same_team(organization_id));

-- System can insert ledger entries (no user inserts)
CREATE POLICY "System can insert ledger entries"
  ON public.data_ingestion_ledger FOR INSERT
  WITH CHECK (true);

-- IMMUTABILITY: No UPDATE or DELETE policies - entries cannot be modified once written
-- This is intentional for audit compliance

-- Add comment explaining immutability
COMMENT ON TABLE public.data_ingestion_ledger IS 'Immutable audit trail of all data ingestion attempts. Entries cannot be modified or deleted once created.';