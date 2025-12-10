-- Add organization_id to rocks table
ALTER TABLE rocks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Backfill organization_id from owner_id -> users.team_id
UPDATE rocks r
SET organization_id = u.team_id
FROM users u
WHERE r.owner_id = u.id
  AND r.organization_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rocks_organization_id ON rocks(organization_id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Admins can manage all rocks" ON rocks;
DROP POLICY IF EXISTS "Managers can manage team rocks" ON rocks;
DROP POLICY IF EXISTS "Staff can read team rocks" ON rocks;

-- Create strict org-scoped RLS policies
CREATE POLICY "Team members can view rocks"
ON rocks FOR SELECT
USING (
  organization_id IS NOT NULL
  AND is_same_team(organization_id)
);

CREATE POLICY "Managers can insert rocks"
ON rocks FOR INSERT
WITH CHECK (
  organization_id IS NOT NULL
  AND is_same_team(organization_id)
  AND is_manager()
);

CREATE POLICY "Managers can update rocks"
ON rocks FOR UPDATE
USING (
  organization_id IS NOT NULL
  AND is_same_team(organization_id)
  AND is_manager()
)
WITH CHECK (
  organization_id IS NOT NULL
  AND is_same_team(organization_id)
  AND is_manager()
);

CREATE POLICY "Managers can delete rocks"
ON rocks FOR DELETE
USING (
  organization_id IS NOT NULL
  AND is_same_team(organization_id)
  AND is_manager()
);