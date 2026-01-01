-- Add missing columns to staging_payments_jane
ALTER TABLE staging_payments_jane
ADD COLUMN IF NOT EXISTS payment_method_internal text,
ADD COLUMN IF NOT EXISTS payment_method_external text,
ADD COLUMN IF NOT EXISTS jane_payments_partner text;

-- Add missing columns to staging_invoices_jane
ALTER TABLE staging_invoices_jane
ADD COLUMN IF NOT EXISTS location_guid text,
ADD COLUMN IF NOT EXISTS purchasable_type text,
ADD COLUMN IF NOT EXISTS purchasable_id text,
ADD COLUMN IF NOT EXISTS income_category_id text,
ADD COLUMN IF NOT EXISTS sale_map_coordinates text;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_staging_invoices_jane_location 
ON staging_invoices_jane(organization_id, location_guid);

-- Add index for purchasable type queries
CREATE INDEX IF NOT EXISTS idx_staging_invoices_jane_purchasable_type 
ON staging_invoices_jane(organization_id, purchasable_type);