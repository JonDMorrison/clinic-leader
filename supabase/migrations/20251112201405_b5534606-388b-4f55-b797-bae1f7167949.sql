-- Harden handle_new_user to avoid unique constraint aborts during auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Attempt to insert a skeleton user record; ignore unique conflicts (e.g., email)
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
    ON CONFLICT (id) DO NOTHING;  -- if id already exists, skip
  EXCEPTION WHEN unique_violation THEN
    -- Likely a conflicting email row exists; do nothing so auth creation succeeds
    NULL;
  END;

  RETURN NEW;
END;
$$;