-- Clean up and fix RLS policies for documents upload system

-- ============================================
-- STEP 1: Clean up storage.objects policies for documents bucket
-- ============================================

-- Drop existing document-related policies to start fresh
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users upload to their org folder (documents)" ON storage.objects;
DROP POLICY IF EXISTS "Users update own org files (documents)" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own org files (documents)" ON storage.objects;

-- Create clean, non-conflicting policies for documents bucket

-- 1. Public read access to documents bucket
CREATE POLICY "documents_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- 2. Org users can upload to their org folder
CREATE POLICY "documents_org_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = current_user_team()::text
);

-- 3. Admins can upload anywhere in documents bucket
CREATE POLICY "documents_admin_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND is_user_admin(auth.uid())
);

-- 4. Users can update files in their org folder
CREATE POLICY "documents_org_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = current_user_team()::text
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = current_user_team()::text
);

-- 5. Users can delete files in their org folder
CREATE POLICY "documents_org_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = current_user_team()::text
);

-- ============================================
-- STEP 2: Ensure docs table has RLS enabled and proper policies
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Org can insert docs" ON public.docs;
DROP POLICY IF EXISTS "Org can read docs" ON public.docs;
DROP POLICY IF EXISTS "Admins manage docs" ON public.docs;
DROP POLICY IF EXISTS "Admins can manage org docs" ON public.docs;
DROP POLICY IF EXISTS "Managers can manage org docs" ON public.docs;
DROP POLICY IF EXISTS "Staff can read org docs" ON public.docs;

-- 1. Users can read docs from their organization
CREATE POLICY "docs_org_read"
ON public.docs
FOR SELECT
TO authenticated
USING (organization_id = current_user_team());

-- 2. Users can insert docs to their organization
CREATE POLICY "docs_org_insert"
ON public.docs
FOR INSERT
TO authenticated
WITH CHECK (organization_id = current_user_team());

-- 3. Admins can update docs in their organization
CREATE POLICY "docs_admin_update"
ON public.docs
FOR UPDATE
TO authenticated
USING (
  organization_id = current_user_team()
  AND is_user_admin(auth.uid())
)
WITH CHECK (
  organization_id = current_user_team()
  AND is_user_admin(auth.uid())
);

-- 4. Admins can delete docs in their organization
CREATE POLICY "docs_admin_delete"
ON public.docs
FOR DELETE
TO authenticated
USING (
  organization_id = current_user_team()
  AND is_user_admin(auth.uid())
);