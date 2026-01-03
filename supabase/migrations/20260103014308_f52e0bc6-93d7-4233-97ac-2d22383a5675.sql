-- Add sandbox flag to bulk_analytics_connectors for environment separation
ALTER TABLE public.bulk_analytics_connectors 
ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN public.bulk_analytics_connectors.is_sandbox IS 'If true, connector is marked as sandbox/test mode. Production connectors cannot be created from sandbox environments.';

-- Create index for quick sandbox filtering
CREATE INDEX IF NOT EXISTS idx_bulk_analytics_connectors_sandbox 
ON public.bulk_analytics_connectors(is_sandbox);

-- Add environment metadata to data_ingestion_ledger
ALTER TABLE public.data_ingestion_ledger
ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'production';

-- Add check constraint for valid environment values
ALTER TABLE public.data_ingestion_ledger
ADD CONSTRAINT check_environment_values 
CHECK (environment IN ('production', 'staging', 'development'));