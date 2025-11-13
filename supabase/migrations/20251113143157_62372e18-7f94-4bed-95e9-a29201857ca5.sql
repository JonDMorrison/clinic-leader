-- Add extraction metadata columns to docs table
ALTER TABLE public.docs
  ADD COLUMN IF NOT EXISTS parsed_text text,
  ADD COLUMN IF NOT EXISTS extracted_at timestamptz,
  ADD COLUMN IF NOT EXISTS extract_source text,
  ADD COLUMN IF NOT EXISTS extract_status text,
  ADD COLUMN IF NOT EXISTS extract_error text,
  ADD COLUMN IF NOT EXISTS word_count int,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS content_version int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mime_type text;

-- Add index for efficient status queries
CREATE INDEX IF NOT EXISTS docs_org_status_idx 
  ON public.docs (organization_id, extract_status);