-- Phase 1.1: Fix Docs Table Tenant Isolation
-- Add organization_id column to docs table
ALTER TABLE public.docs ADD COLUMN organization_id UUID;

-- Backfill organization_id from owner's team_id
UPDATE public.docs
SET organization_id = (
  SELECT team_id 
  FROM public.users 
  WHERE users.id = docs.owner_id
);

-- Make organization_id NOT NULL after backfill
ALTER TABLE public.docs ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.docs 
ADD CONSTRAINT docs_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.teams(id) 
ON DELETE CASCADE;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Admins can manage all docs" ON public.docs;
DROP POLICY IF EXISTS "Managers can manage docs" ON public.docs;
DROP POLICY IF EXISTS "Staff can read docs" ON public.docs;

-- Create new tenant-isolated RLS policies
CREATE POLICY "Admins can manage org docs"
ON public.docs
FOR ALL
TO authenticated
USING (is_admin() AND is_same_team(organization_id))
WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can manage org docs"
ON public.docs
FOR ALL
TO authenticated
USING (is_manager() AND is_same_team(organization_id))
WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Staff can read org docs"
ON public.docs
FOR SELECT
TO authenticated
USING (is_same_team(organization_id));

-- Phase 1.2: Fix Acknowledgements Table
ALTER TABLE public.acknowledgements ADD COLUMN organization_id UUID;

-- Backfill acknowledgements organization_id from docs
UPDATE public.acknowledgements
SET organization_id = (
  SELECT organization_id 
  FROM public.docs 
  WHERE docs.id = acknowledgements.doc_id
);

-- Make organization_id NOT NULL after backfill
ALTER TABLE public.acknowledgements ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.acknowledgements 
ADD CONSTRAINT acknowledgements_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.teams(id) 
ON DELETE CASCADE;

-- Drop existing acknowledgements RLS policies
DROP POLICY IF EXISTS "Admins can read all acknowledgements" ON public.acknowledgements;
DROP POLICY IF EXISTS "Managers can read team acknowledgements" ON public.acknowledgements;
DROP POLICY IF EXISTS "Users can manage their own acknowledgements" ON public.acknowledgements;

-- Create new tenant-isolated acknowledgements RLS policies
CREATE POLICY "Admins can read org acknowledgements"
ON public.acknowledgements
FOR SELECT
TO authenticated
USING (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can read org acknowledgements"
ON public.acknowledgements
FOR SELECT
TO authenticated
USING (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Users can manage their own org acknowledgements"
ON public.acknowledgements
FOR ALL
TO authenticated
USING (user_id = current_user_id() AND is_same_team(organization_id))
WITH CHECK (user_id = current_user_id() AND is_same_team(organization_id));