-- Add partial unique constraint to prevent duplicate jane_staff_member_guid within an org
-- Only applies when jane_staff_member_guid is not null
CREATE UNIQUE INDEX IF NOT EXISTS users_unique_jane_guid_per_org 
ON public.users (team_id, jane_staff_member_guid) 
WHERE jane_staff_member_guid IS NOT NULL;