-- Add scorecard readiness fields to teams table for locked clinic cutover
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS scorecard_ready boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS scorecard_ready_checked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS scorecard_ready_notes text;