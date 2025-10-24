-- Add preset tracking columns to vto_versions
ALTER TABLE vto_versions
  ADD COLUMN IF NOT EXISTS preset_key text,
  ADD COLUMN IF NOT EXISTS originated_from_preset boolean DEFAULT false;

-- Create table for preset events analytics
CREATE TABLE IF NOT EXISTS vto_preset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  preset_key text NOT NULL,
  action text NOT NULL CHECK (action IN ('preview', 'apply', 'undo')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on vto_preset_events
ALTER TABLE vto_preset_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for vto_preset_events
CREATE POLICY "Admins can manage vto_preset_events"
  ON vto_preset_events
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Managers can manage team vto_preset_events"
  ON vto_preset_events
  FOR ALL
  USING (is_manager() AND is_same_team(team_id))
  WITH CHECK (is_manager() AND is_same_team(team_id));

CREATE POLICY "Team members can read vto_preset_events"
  ON vto_preset_events
  FOR SELECT
  USING (is_same_team(team_id));