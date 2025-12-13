-- Add is_active column to metrics for soft-delete behavior
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for filtering active metrics
CREATE INDEX IF NOT EXISTS idx_metrics_is_active ON metrics(organization_id, is_active) WHERE is_active = true;