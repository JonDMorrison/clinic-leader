-- Update metric_results source check constraint to include 'legacy_workbook'
-- Constraint name: metric_results_source_check

-- Drop existing constraint
ALTER TABLE public.metric_results DROP CONSTRAINT IF EXISTS metric_results_source_check;

-- Recreate with legacy_workbook added
ALTER TABLE public.metric_results ADD CONSTRAINT metric_results_source_check 
CHECK (source = ANY (ARRAY['manual'::text, 'jane'::text, 'jane_pipe'::text, 'google_sheet'::text, 'pdf_import'::text, 'monthly_upload'::text, 'csv_import'::text, 'legacy_workbook'::text]));