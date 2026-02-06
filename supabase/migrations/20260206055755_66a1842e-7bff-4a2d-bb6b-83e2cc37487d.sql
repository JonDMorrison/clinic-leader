-- Create intervention_type_registry for governance (separate from legacy allowlist table)
CREATE TABLE public.intervention_type_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on (category, status) for efficient filtering
CREATE INDEX idx_intervention_type_registry_category_status 
ON public.intervention_type_registry(category, status);

-- Enable RLS
ALTER TABLE public.intervention_type_registry ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT active types only
CREATE POLICY "registry_authenticated_read_active"
ON public.intervention_type_registry
FOR SELECT
TO authenticated
USING (status = 'active');

-- Allow master admin to INSERT
CREATE POLICY "registry_master_admin_insert"
ON public.intervention_type_registry
FOR INSERT
TO authenticated
WITH CHECK (public.is_master_admin());

-- Allow master admin to UPDATE
CREATE POLICY "registry_master_admin_update"
ON public.intervention_type_registry
FOR UPDATE
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- Allow master admin to DELETE
CREATE POLICY "registry_master_admin_delete"
ON public.intervention_type_registry
FOR DELETE
TO authenticated
USING (public.is_master_admin());

-- Seed exactly 10 standardized intervention types
INSERT INTO public.intervention_type_registry (name, category, description, status) VALUES
  ('Reminder Workflow Change', 'Patient Communication', 'Changes to appointment reminder systems, confirmation workflows, or patient notification timing and channels.', 'active'),
  ('Follow-Up / Recall / Reactivation Change', 'Patient Communication', 'Modifications to patient follow-up sequences, recall campaigns, or reactivation outreach for lapsed patients.', 'active'),
  ('Schedule Template Change', 'Scheduling', 'Adjustments to provider schedule templates, appointment slot configurations, or booking availability patterns.', 'active'),
  ('Hours / Capacity Change', 'Scheduling', 'Changes to clinic operating hours, provider availability, or overall appointment capacity.', 'active'),
  ('Visit Frequency / Treatment Protocol Change', 'Clinical Experience', 'Modifications to recommended visit frequency, care plan duration, or treatment protocol standards.', 'active'),
  ('New Patient Intake / Onboarding Change', 'Clinical Experience', 'Changes to new patient intake processes, initial evaluation workflows, or onboarding experience.', 'active'),
  ('Marketing / Acquisition Campaign', 'Growth & Retention', 'New marketing initiatives, advertising campaigns, or patient acquisition strategies.', 'active'),
  ('Retention / Drop-Off Prevention Initiative', 'Growth & Retention', 'Programs designed to reduce patient drop-off, improve plan of care adherence, or increase retention rates.', 'active'),
  ('Staff Workflow / Process Change', 'Operations', 'Modifications to staff workflows, operational processes, or internal procedures.', 'active'),
  ('Pricing / Billing / Package Change', 'Operations', 'Changes to service pricing, billing practices, payment plans, or care package structures.', 'active');