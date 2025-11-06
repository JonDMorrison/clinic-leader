-- Allow admins (owner/director) to upload anywhere in documents bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload documents'
  ) THEN
    CREATE POLICY "Admins can upload documents"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'documents' AND public.is_user_admin(auth.uid())
    );
  END IF;
END $$;