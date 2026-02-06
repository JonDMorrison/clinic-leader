-- LEAN GOVERNANCE HARDENING: FK constraint + safe deprecation

-- 1) Add foreign key constraint from interventions.intervention_type_id to intervention_type_registry(id)
-- Use ON DELETE RESTRICT to prevent deletion of referenced types
ALTER TABLE public.interventions
ADD CONSTRAINT fk_interventions_type_registry
FOREIGN KEY (intervention_type_id)
REFERENCES public.intervention_type_registry(id)
ON DELETE RESTRICT;

-- 2) Remove DELETE policy from intervention_type_registry
-- Types should be deprecated, not deleted, to preserve history
DROP POLICY IF EXISTS "registry_master_admin_delete" ON public.intervention_type_registry;

-- 3) Add explicit SELECT policy for master admins to see all types (including deprecated)
-- This allows admins to manage deprecated types
CREATE POLICY "registry_master_admin_read_all"
ON public.intervention_type_registry
FOR SELECT
TO authenticated
USING (is_master_admin());

-- Add comment documenting the deprecation approach
COMMENT ON COLUMN public.intervention_type_registry.status IS 
'Type status: active (selectable), deprecated (historical only, cannot be assigned to new interventions). Never delete rows - use deprecation to preserve referential integrity.';