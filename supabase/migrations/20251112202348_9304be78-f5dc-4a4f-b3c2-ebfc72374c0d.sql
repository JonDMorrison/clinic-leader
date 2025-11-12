-- Final hardening: generic unique_violation guard to avoid blocking auth creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    );
  EXCEPTION WHEN unique_violation THEN
    -- If either (id) or (email) already exists, ignore to not block signup
    NULL;
  END;

  RETURN NEW;
END;
$$;