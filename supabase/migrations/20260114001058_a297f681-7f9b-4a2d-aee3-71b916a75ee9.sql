-- Update period_type check constraint to include 'ytd'
ALTER TABLE public.metric_breakdowns DROP CONSTRAINT IF EXISTS metric_breakdowns_period_type_check;
ALTER TABLE public.metric_breakdowns ADD CONSTRAINT metric_breakdowns_period_type_check CHECK (period_type = ANY (ARRAY['weekly'::text, 'monthly'::text, 'ytd'::text]));