-- Update the check constraint to allow 'breakdown' as a valid value
ALTER TABLE public.issues DROP CONSTRAINT issues_created_from_check;

ALTER TABLE public.issues ADD CONSTRAINT issues_created_from_check 
  CHECK (created_from = ANY (ARRAY['scorecard'::text, 'rock'::text, 'manual'::text, 'escalated'::text, 'breakdown'::text]));