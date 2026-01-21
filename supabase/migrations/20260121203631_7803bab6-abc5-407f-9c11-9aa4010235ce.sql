
-- Update the sync trigger to skip user_roles sync for demo users
CREATE OR REPLACE FUNCTION public.sync_user_role_to_user_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip syncing for demo users (they don't exist in auth.users)
  IF NEW.demo_user = true THEN
    RETURN NEW;
  END IF;

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
$function$;
