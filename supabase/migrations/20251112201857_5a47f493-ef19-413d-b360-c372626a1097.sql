-- Fix handle_new_user to properly handle email conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user profile based on email conflict
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    team_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'staff',
    NULL
  )
  ON CONFLICT (email) 
  DO UPDATE SET
    id = EXCLUDED.id,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    updated_at = now();

  RETURN NEW;
END;
$$;