-- Update source constraint to include 'jane_pipe' (used by production jane-kpi-rollup)
-- and other valid sources from import flows

ALTER TABLE metric_results DROP CONSTRAINT IF EXISTS metric_results_source_check;

ALTER TABLE metric_results ADD CONSTRAINT metric_results_source_check 
  CHECK (source = ANY (ARRAY['manual', 'jane', 'jane_pipe', 'google_sheet', 'pdf_import', 'monthly_upload', 'csv_import']::text[]));