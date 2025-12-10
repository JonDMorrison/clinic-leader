-- Add alignment review flags to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS needs_scorecard_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS needs_rocks_review boolean DEFAULT false;

-- Create VTO diff events table for audit trail
CREATE TABLE IF NOT EXISTS vto_diff_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  vto_version_id uuid REFERENCES vto_versions(id) ON DELETE CASCADE,
  previous_snapshot jsonb,
  updated_snapshot jsonb,
  changed_fields text[],
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE vto_diff_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for vto_diff_events
CREATE POLICY "Team members can read their org diff events"
ON vto_diff_events FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "System can insert diff events"
ON vto_diff_events FOR INSERT
WITH CHECK (is_same_team(organization_id));

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_vto_diff_events_org ON vto_diff_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_vto_diff_events_created ON vto_diff_events(created_at DESC);