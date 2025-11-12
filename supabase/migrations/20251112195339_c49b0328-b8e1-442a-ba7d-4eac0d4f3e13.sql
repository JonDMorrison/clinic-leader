-- Update the trigger function to handle conflicts and allow admin-created users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into public.users table, but allow conflicts
  -- This way admin-created users can be upserted after creation
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
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;