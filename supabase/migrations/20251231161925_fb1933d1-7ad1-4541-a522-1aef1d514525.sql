-- Create enums for bulk analytics connectors
CREATE TYPE bulk_source_system AS ENUM ('jane', 'advancedmd', 'other');
CREATE TYPE bulk_connector_status AS ENUM ('active', 'paused', 'error');
CREATE TYPE bulk_cadence AS ENUM ('daily', 'monthly');
CREATE TYPE bulk_delivery_method AS ENUM ('s3', 'secure_upload', 'manual_drop');

-- Create bulk_analytics_connectors table
CREATE TABLE public.bulk_analytics_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  source_system bulk_source_system NOT NULL,
  connector_type TEXT NOT NULL DEFAULT 'bulk_analytics',
  status bulk_connector_status NOT NULL DEFAULT 'paused',
  cadence bulk_cadence NOT NULL DEFAULT 'daily',
  delivery_method bulk_delivery_method NOT NULL DEFAULT 'manual_drop',
  expected_schema_version TEXT NOT NULL DEFAULT 'v1',
  last_received_at TIMESTAMPTZ,
  last_processed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, source_system)
);

-- Enable RLS
ALTER TABLE public.bulk_analytics_connectors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage bulk connectors" ON public.bulk_analytics_connectors
  FOR ALL USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can manage bulk connectors" ON public.bulk_analytics_connectors
  FOR ALL USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read bulk connectors" ON public.bulk_analytics_connectors
  FOR SELECT USING (is_same_team(organization_id));

-- Add updated_at trigger
CREATE TRIGGER update_bulk_analytics_connectors_updated_at
  BEFORE UPDATE ON public.bulk_analytics_connectors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();