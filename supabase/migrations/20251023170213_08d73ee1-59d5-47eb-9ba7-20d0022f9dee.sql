
-- Create tracked_kpis table (catalog of what we track, no values yet)
CREATE TABLE tracked_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Production','Financial','Referral','Operational','Quality')),
  description text,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  formula text,
  external_key text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Create tracked_dimensions table (provider roles, referral sources, etc.)
CREATE TABLE tracked_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ProviderRole','ReferralSource','Location')),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, type, name)
);

-- Create import_mappings table (maps tracked KPIs to data sources)
CREATE TABLE import_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tracked_kpi_id uuid NOT NULL REFERENCES tracked_kpis(id) ON DELETE CASCADE,
  source_system text NOT NULL,
  source_label text NOT NULL,
  transform text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tracked_kpi_id, source_system, source_label)
);

-- Enable RLS
ALTER TABLE tracked_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracked_kpis
CREATE POLICY "Team members can read tracked_kpis"
  ON tracked_kpis FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Admins can manage tracked_kpis"
  ON tracked_kpis FOR ALL
  USING (is_admin());

CREATE POLICY "Managers can manage team tracked_kpis"
  ON tracked_kpis FOR ALL
  USING (is_manager() AND is_same_team(organization_id));

-- RLS Policies for tracked_dimensions
CREATE POLICY "Team members can read tracked_dimensions"
  ON tracked_dimensions FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Admins can manage tracked_dimensions"
  ON tracked_dimensions FOR ALL
  USING (is_admin());

-- RLS Policies for import_mappings
CREATE POLICY "Team members can read import_mappings"
  ON import_mappings FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Admins can manage import_mappings"
  ON import_mappings FOR ALL
  USING (is_admin());

CREATE POLICY "Managers can manage team import_mappings"
  ON import_mappings FOR ALL
  USING (is_manager() AND is_same_team(organization_id));

-- Seed tracked KPIs for Northwest Injury Clinics
INSERT INTO tracked_kpis (organization_id, name, category, description, is_active)
VALUES
  -- Production
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'New Patients', 'Production', 'Count of new patient starts', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Total Visits', 'Production', 'Total patient visits across all providers', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Visits per Patient', 'Production', 'Average visits per active patient', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Avg Visit per Case', 'Production', 'Average total visits per completed case', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Provider Utilization %', 'Production', 'Percentage of available provider time used', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'No-Show Rate %', 'Production', 'Percentage of appointments not attended', true),
  
  -- Financial
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Charges Billed', 'Financial', 'Total charges billed to insurers/patients', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Revenue Collected', 'Financial', 'Total payments collected', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Collection Rate %', 'Financial', 'Percentage of billed charges collected', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'A/R 30-120 Days $', 'Financial', 'Accounts receivable aged 30-120 days', true),
  
  -- Referral
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Referrals', 'Referral', 'Total referrals received', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Scheduled', 'Referral', 'Referrals that scheduled appointments', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Referral Conversion %', 'Referral', 'Percentage of referrals that scheduled', true),
  
  -- Operational
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Time to Next Available', 'Operational', 'Days until next available appointment', true),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Check-in to Room', 'Operational', 'Average minutes from check-in to treatment room', true),
  
  -- Quality
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'Patient NPS', 'Quality', 'Net Promoter Score from patient surveys', true);

-- Seed tracked dimensions for Northwest
INSERT INTO tracked_dimensions (organization_id, type, name)
VALUES
  -- Provider Roles
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ProviderRole', 'Chiropractic'),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ProviderRole', 'Mid Level'),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ProviderRole', 'Massage'),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ProviderRole', 'Management'),
  
  -- Referral Sources
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ReferralSource', 'W/C'),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ReferralSource', 'HI'),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ReferralSource', 'Self Ref'),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ReferralSource', 'MVA'),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ReferralSource', 'Attorney'),
  ('e4ca5727-46f1-4310-8540-9dd11d8a136d', 'ReferralSource', 'Google');

-- Add updated_at trigger
CREATE TRIGGER update_tracked_kpis_updated_at
  BEFORE UPDATE ON tracked_kpis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
