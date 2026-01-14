-- Add CHECK constraints for dimension correctness and period_type validation

-- 1. Add CHECK: dimension fields must both be null or both be set
ALTER TABLE public.seat_metrics 
ADD CONSTRAINT seat_metrics_dimension_consistency 
CHECK (
  (dimension_type IS NULL AND dimension_id IS NULL) OR
  (dimension_type IS NOT NULL AND dimension_id IS NOT NULL)
);

-- 2. Add CHECK: dimension_type must be one of the allowed values (when not null)
ALTER TABLE public.seat_metrics 
ADD CONSTRAINT seat_metrics_dimension_type_valid 
CHECK (
  dimension_type IS NULL OR 
  dimension_type IN ('clinician', 'location', 'discipline')
);

-- 3. Add CHECK: period_type must be one of the allowed values
ALTER TABLE public.seat_metrics 
ADD CONSTRAINT seat_metrics_period_type_valid 
CHECK (
  period_type IS NULL OR 
  period_type IN ('weekly', 'monthly', 'ytd')
);