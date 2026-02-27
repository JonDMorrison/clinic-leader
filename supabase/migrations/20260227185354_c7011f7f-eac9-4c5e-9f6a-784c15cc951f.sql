
-- Add period tracking and run metadata to clinic_insights
ALTER TABLE public.clinic_insights
  ADD COLUMN period_start DATE,
  ADD COLUMN period_end DATE,
  ADD COLUMN run_id UUID,
  ADD COLUMN computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Drop old unique constraint and create new one scoped to period
ALTER TABLE public.clinic_insights
  DROP CONSTRAINT uq_clinic_insights_key;

-- Backfill existing rows with a default period_start so NOT NULL can be applied
UPDATE public.clinic_insights SET period_start = CURRENT_DATE WHERE period_start IS NULL;

ALTER TABLE public.clinic_insights
  ALTER COLUMN period_start SET NOT NULL;

ALTER TABLE public.clinic_insights
  ADD CONSTRAINT uq_clinic_insights_period UNIQUE (clinic_guid, insight_key, period_start);

CREATE INDEX idx_clinic_insights_period ON public.clinic_insights (period_start, period_end);
