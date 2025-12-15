-- Add Level 10 score and outcome fields to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS level10_score integer,
ADD COLUMN IF NOT EXISTS outcome_headline text,
ADD COLUMN IF NOT EXISTS outcome_notes text;

-- Add constraint for score range
ALTER TABLE public.meetings 
ADD CONSTRAINT meetings_level10_score_range 
CHECK (level10_score IS NULL OR (level10_score >= 1 AND level10_score <= 10));