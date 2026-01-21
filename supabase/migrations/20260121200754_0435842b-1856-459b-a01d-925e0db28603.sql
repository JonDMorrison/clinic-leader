-- Add staff member columns to staging_payments_jane for clinician/discipline breakdowns
ALTER TABLE staging_payments_jane 
ADD COLUMN IF NOT EXISTS staff_member_guid text,
ADD COLUMN IF NOT EXISTS staff_member_name text;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_staging_payments_jane_staff 
ON staging_payments_jane(organization_id, staff_member_guid) 
WHERE staff_member_guid IS NOT NULL;