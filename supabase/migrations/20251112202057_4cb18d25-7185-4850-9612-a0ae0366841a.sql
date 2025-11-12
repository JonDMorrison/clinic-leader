-- Make handle_new_user safe: never update primary key; ignore email conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  ON CONFLICT (email) DO NOTHING;  -- don't block signup if email row pre-exists

  RETURN NEW;
END;
$$;