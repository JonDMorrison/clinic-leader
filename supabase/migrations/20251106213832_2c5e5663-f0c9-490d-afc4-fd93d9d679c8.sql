-- Ensure documents bucket exists
insert into storage.buckets (id, name, public)
select 'documents', 'documents', true
where not exists (select 1 from storage.buckets where id = 'documents');

-- Public read policy (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read documents'
  ) THEN
    CREATE POLICY "Public read documents"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'documents');
  END IF;
END $$;

-- Insert policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users upload to their org folder (documents)'
  ) THEN
    CREATE POLICY "Users upload to their org folder (documents)"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = public.current_user_team()::text
    );
  END IF;
END $$;

-- Update policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users update own org files (documents)'
  ) THEN
    CREATE POLICY "Users update own org files (documents)"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = public.current_user_team()::text
    )
    WITH CHECK (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = public.current_user_team()::text
    );
  END IF;
END $$;

-- Delete policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users delete own org files (documents)'
  ) THEN
    CREATE POLICY "Users delete own org files (documents)"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = public.current_user_team()::text
    );
  END IF;
END $$;