-- Add storage_path column to docs table for proxy-based document serving
ALTER TABLE public.docs 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Update existing records to extract storage_path from file_url
UPDATE public.docs
SET storage_path = SUBSTRING(file_url FROM '/documents/(.+)$')
WHERE file_url IS NOT NULL AND storage_path IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_docs_storage_path ON public.docs(storage_path);