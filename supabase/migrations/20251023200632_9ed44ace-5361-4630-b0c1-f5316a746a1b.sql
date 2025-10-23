-- Create tour status record for existing user to prevent wizard loop
INSERT INTO user_tour_status (user_id, organization_id, completed, current_step)
SELECT 
  u.id,
  u.team_id,
  true,
  0
FROM users u
WHERE u.email = 'jon@getclear.ca'
ON CONFLICT (user_id) DO UPDATE 
SET completed = true, current_step = 0;