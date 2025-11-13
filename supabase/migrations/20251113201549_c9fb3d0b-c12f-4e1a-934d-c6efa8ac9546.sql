-- Add description field to docs table
ALTER TABLE docs ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN docs.description IS 'Brief description or summary of the document content';