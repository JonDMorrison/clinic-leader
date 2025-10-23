-- Add provider and billing roles to user_role enum if not present
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'provider') THEN
    ALTER TYPE user_role ADD VALUE 'provider';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'billing') THEN
    ALTER TYPE user_role ADD VALUE 'billing';
  END IF;
END $$;

-- Create departments table to organize teams within an organization
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Team members can read departments"
ON public.departments FOR SELECT
USING (is_same_team(organization_id));

-- Add department_id to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);

-- Create Northwest Injury Clinics organization
INSERT INTO public.teams (id, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Northwest Injury Clinics',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create branding for Northwest
INSERT INTO public.branding (
  organization_id,
  logo_url,
  primary_color,
  secondary_color,
  accent_color,
  font_family,
  favicon_url,
  subdomain,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'https://placeholder.com/northwest-logo.png',
  '210 85% 55%',
  '210 25% 96%',
  '170 85% 55%',
  'Inter',
  'https://placeholder.com/favicon.ico',
  'northwest',
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Create license for Northwest
INSERT INTO public.licenses (
  organization_id,
  plan,
  active,
  renewal_date,
  users_limit,
  ai_calls_limit,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Pro',
  true,
  (now() + interval '1 year')::date,
  50,
  10000,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Create departments for Northwest
INSERT INTO public.departments (organization_id, name, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Front Desk', now(), now()),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Clinical – Chiropractic', now(), now()),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Clinical – Mid-Level', now(), now()),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Massage', now(), now()),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Billing', now(), now()),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Management', now(), now())
ON CONFLICT DO NOTHING;