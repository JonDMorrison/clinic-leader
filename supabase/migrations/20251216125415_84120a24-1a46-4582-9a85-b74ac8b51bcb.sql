-- Rename scorecard_mode values: locked_to_template -> aligned, flex -> flexible

-- Step 1: Drop old constraint
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_scorecard_mode_check;

-- Step 2: Add new constraint allowing both old and new values (safe transition)
ALTER TABLE teams ADD CONSTRAINT teams_scorecard_mode_check 
  CHECK (scorecard_mode IN ('flex', 'locked_to_template', 'flexible', 'aligned'));

-- Step 3: Backfill old values to new
UPDATE teams SET scorecard_mode = 'aligned' WHERE scorecard_mode = 'locked_to_template';
UPDATE teams SET scorecard_mode = 'flexible' WHERE scorecard_mode = 'flex';

-- Step 4: Tighten constraint to only allow new values
ALTER TABLE teams DROP CONSTRAINT teams_scorecard_mode_check;
ALTER TABLE teams ADD CONSTRAINT teams_scorecard_mode_check 
  CHECK (scorecard_mode IN ('flexible', 'aligned'));

-- Step 5: Update default to 'flexible'
ALTER TABLE teams ALTER COLUMN scorecard_mode SET DEFAULT 'flexible';