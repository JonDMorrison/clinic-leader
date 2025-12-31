-- Add consecutive_failures tracking to file_ingest_log for soft-failure behavior
ALTER TABLE public.file_ingest_log 
ADD COLUMN IF NOT EXISTS consecutive_failures integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS quarantined boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quarantine_reason text;

-- Add index for efficient failure queries
CREATE INDEX IF NOT EXISTS idx_file_ingest_log_failures 
ON public.file_ingest_log(organization_id, source_system, resource_name, status) 
WHERE status = 'error';

COMMENT ON COLUMN public.file_ingest_log.consecutive_failures IS 'Count of consecutive failures for this resource';
COMMENT ON COLUMN public.file_ingest_log.quarantined IS 'Whether this file is quarantined and should not be retried';
COMMENT ON COLUMN public.file_ingest_log.quarantine_reason IS 'Reason for quarantine (schema mismatch, etc.)';