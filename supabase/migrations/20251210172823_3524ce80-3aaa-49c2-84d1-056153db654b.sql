
-- Add issues column to vto_versions table for storing VTO issues list
ALTER TABLE vto_versions ADD COLUMN IF NOT EXISTS issues JSONB DEFAULT '[]'::jsonb;
