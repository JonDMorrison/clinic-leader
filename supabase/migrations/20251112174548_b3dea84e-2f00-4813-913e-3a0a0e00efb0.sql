
-- Phase 2: Fix role security issue (corrected)

-- Step 1: Backfill missing user_roles entries from users.role
-- Only for users that exist in auth.users
INSERT INTO user_roles (user_id, role)
SELECT u.id, u.role::user_role
FROM users u
WHERE u.role IS NOT NULL
  AND u.id IN (SELECT id FROM auth.users)
  AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = u.id
  );

-- Step 2: Create trigger function to sync users.role with user_roles
CREATE OR REPLACE FUNCTION sync_user_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user's role is updated in users table, sync to user_roles
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role) THEN
    -- Delete old role if exists
    DELETE FROM user_roles WHERE user_id = NEW.id;
    
    -- Insert new role if not null
    IF NEW.role IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role)
      VALUES (NEW.id, NEW.role::user_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger to automatically sync on users table changes
DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
CREATE TRIGGER sync_user_role_trigger
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_user_roles();

-- Step 4: Update current_user_role() function to use user_roles table (source of truth)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Step 5: Add comment explaining the architecture
COMMENT ON TRIGGER sync_user_role_trigger ON users IS 
'Keeps users.role in sync with user_roles table. user_roles is the source of truth for authorization checks.';
