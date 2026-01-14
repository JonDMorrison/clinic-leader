-- Refactor seat_metrics for canonical EOS "Everyone has a Number" accountability mapping
-- This migration separates identity (users.jane_staff_member_guid) from accountability (seat_metrics)

-- Step 1: Drop the existing constraint that references metric_id and tracked_kpi_id
ALTER TABLE public.seat_metrics DROP CONSTRAINT IF EXISTS valid_metric_link;

-- Step 2: Drop unused columns (deprecate metric_id and tracked_kpi_id)
ALTER TABLE public.seat_metrics DROP COLUMN IF EXISTS metric_id;
ALTER TABLE public.seat_metrics DROP COLUMN IF EXISTS tracked_kpi_id;

-- Step 3: Add dimension_label column for display purposes
ALTER TABLE public.seat_metrics ADD COLUMN IF NOT EXISTS dimension_label text;

-- Step 4: Add period_type column with default 'weekly'
ALTER TABLE public.seat_metrics ADD COLUMN IF NOT EXISTS period_type text DEFAULT 'weekly';

-- Step 5: Make import_key required (NOT NULL) since it's now the canonical reference
-- First update any null values if they exist
UPDATE public.seat_metrics SET import_key = 'unknown' WHERE import_key IS NULL;
ALTER TABLE public.seat_metrics ALTER COLUMN import_key SET NOT NULL;

-- Step 6: Rename columns for clarity (breakdown_dimension_type -> dimension_type, breakdown_dimension_id -> dimension_id)
ALTER TABLE public.seat_metrics RENAME COLUMN breakdown_dimension_type TO dimension_type;
ALTER TABLE public.seat_metrics RENAME COLUMN breakdown_dimension_id TO dimension_id;

-- Step 7: Add unique constraint to prevent duplicate accountability assignments
ALTER TABLE public.seat_metrics 
ADD CONSTRAINT seat_metrics_unique_accountability 
UNIQUE (organization_id, seat_id, import_key, dimension_type, dimension_id, period_type);

-- Step 8: Add index for efficient seat lookups
CREATE INDEX IF NOT EXISTS idx_seat_metrics_seat_id ON public.seat_metrics(seat_id);
CREATE INDEX IF NOT EXISTS idx_seat_metrics_org_import ON public.seat_metrics(organization_id, import_key);