-- PART 1: MULTI-TENANCY HARDENING
-- Backfill organization_id from owner/user references

-- Backfill rocks from owner_id → users.team_id
UPDATE rocks r
SET organization_id = u.team_id
FROM users u
WHERE r.owner_id = u.id
  AND r.organization_id IS NULL
  AND u.team_id IS NOT NULL;

-- Backfill issues from owner_id → users.team_id
UPDATE issues i
SET organization_id = u.team_id
FROM users u
WHERE i.owner_id = u.id
  AND i.organization_id IS NULL
  AND u.team_id IS NOT NULL;

-- Backfill meetings (no created_by, use first user in org if exists)
-- Skip if can't map reliably

-- Backfill seats from user_id → users.team_id
UPDATE seats s
SET organization_id = u.team_id
FROM users u
WHERE s.user_id = u.id
  AND s.organization_id IS NULL
  AND u.team_id IS NOT NULL;

-- Delete orphaned rows that cannot be mapped (security measure)
DELETE FROM rocks WHERE organization_id IS NULL;
DELETE FROM issues WHERE organization_id IS NULL;
DELETE FROM meetings WHERE organization_id IS NULL;
DELETE FROM seats WHERE organization_id IS NULL;

-- Enforce NOT NULL constraints
ALTER TABLE rocks ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE issues ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE meetings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE seats ALTER COLUMN organization_id SET NOT NULL;

-- PART 2: MONTHLY CADENCE DATA MODEL

-- Add cadence columns to metrics
ALTER TABLE metrics 
  ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'weekly';

ALTER TABLE metrics
  ADD CONSTRAINT metrics_cadence_check CHECK (cadence IN ('weekly', 'monthly'));

ALTER TABLE metrics 
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- Add scorecard_mode to teams
ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS scorecard_mode text NOT NULL DEFAULT 'flex';

ALTER TABLE teams
  ADD CONSTRAINT teams_scorecard_mode_check CHECK (scorecard_mode IN ('flex', 'locked_to_template'));

-- Add period columns to metric_results (nullable first for backfill)
ALTER TABLE metric_results 
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_type text,
  ADD COLUMN IF NOT EXISTS period_key text;

ALTER TABLE metric_results
  ADD CONSTRAINT metric_results_period_type_check CHECK (period_type IN ('weekly', 'monthly'));

-- Backfill existing rows from week_start
UPDATE metric_results 
SET 
  period_start = week_start,
  period_type = 'weekly',
  period_key = to_char(week_start, 'YYYY-MM-DD')
WHERE period_start IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE metric_results 
  ALTER COLUMN period_start SET NOT NULL,
  ALTER COLUMN period_type SET NOT NULL,
  ALTER COLUMN period_key SET NOT NULL;

-- Add unique constraint for dedup (drop if exists first)
DROP INDEX IF EXISTS idx_metric_results_period_unique;
CREATE UNIQUE INDEX idx_metric_results_period_unique 
  ON metric_results(metric_id, period_type, period_start);

-- Set NW Injury Clinics to locked_to_template and monthly cadence
UPDATE teams 
SET scorecard_mode = 'locked_to_template' 
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE metrics 
SET cadence = 'monthly' 
WHERE organization_id = '11111111-1111-1111-1111-111111111111';