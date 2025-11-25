-- Create user_departments junction table
CREATE TABLE user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, department_id)
);

-- Enable RLS
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_departments
CREATE POLICY "Team members can read user_departments"
  ON user_departments
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE team_id = current_user_team()
    )
  );

CREATE POLICY "Managers can manage team user_departments"
  ON user_departments
  FOR ALL
  USING (
    is_manager() AND user_id IN (
      SELECT id FROM users WHERE team_id = current_user_team()
    )
  )
  WITH CHECK (
    is_manager() AND user_id IN (
      SELECT id FROM users WHERE team_id = current_user_team()
    )
  );

CREATE POLICY "Admins can manage all user_departments"
  ON user_departments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Migrate existing department_id data to user_departments
INSERT INTO user_departments (user_id, department_id)
SELECT id, department_id 
FROM users 
WHERE department_id IS NOT NULL
ON CONFLICT (user_id, department_id) DO NOTHING;