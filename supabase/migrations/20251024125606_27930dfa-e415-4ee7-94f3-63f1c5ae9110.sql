-- Step 1: Add the new enum values to kpi_unit
-- These must be committed before they can be used
ALTER TYPE kpi_unit ADD VALUE IF NOT EXISTS 'number';
ALTER TYPE kpi_unit ADD VALUE IF NOT EXISTS 'currency';
ALTER TYPE kpi_unit ADD VALUE IF NOT EXISTS 'percentage';
ALTER TYPE kpi_unit ADD VALUE IF NOT EXISTS 'days';
ALTER TYPE kpi_unit ADD VALUE IF NOT EXISTS 'minutes';
ALTER TYPE kpi_unit ADD VALUE IF NOT EXISTS 'hours';