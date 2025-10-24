-- Step 2: Update KPIs with the correct unit values
-- Now that enum values are committed, we can use them

UPDATE kpis 
SET unit = 'number'::kpi_unit
WHERE unit::text IN ('count', 'ratio');

UPDATE kpis 
SET unit = 'currency'::kpi_unit
WHERE unit::text = '$';

UPDATE kpis 
SET unit = 'percentage'::kpi_unit
WHERE unit::text = '%';

-- Add a comment for reference
COMMENT ON COLUMN kpis.unit IS 'Valid values: number, currency, percentage, days, minutes, hours';