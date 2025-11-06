-- Add file-related columns to docs table
ALTER TABLE public.docs 
  ADD COLUMN IF NOT EXISTS filename TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS parsed_text TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create storage bucket for documents (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false,
  20971520, -- 20MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for documents bucket
CREATE POLICY "Users can upload files to their org folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = current_user_team()::text
);

CREATE POLICY "Users can view files from their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = current_user_team()::text
);

CREATE POLICY "Users can delete files from their org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = current_user_team()::text
);