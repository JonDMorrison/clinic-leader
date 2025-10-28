-- ========================================
-- WEEK 1 CRITICAL FIXES: Authentication & Security
-- ========================================

-- FIX 1: Auto-create users table entry on signup
-- This ensures every auth.users entry gets a corresponding public.users entry

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_team_id uuid;
BEGIN
  -- Get or create a default team (modify this logic as needed)
  SELECT id INTO default_team_id
  FROM public.teams
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If no teams exist, create a default one
  IF default_team_id IS NULL THEN
    INSERT INTO public.teams (name)
    VALUES ('Default Organization')
    RETURNING id INTO default_team_id;
  END IF;

  -- Insert into public.users table
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
    'staff', -- Default role, admins can change this later
    default_team_id
  );

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- FIX 2: Move vector extension from public schema to extensions schema
-- Note: This is informational - extensions should be managed via Supabase dashboard
-- The vector extension should be in the extensions schema, not public

-- FIX 3: Enable RLS on any tables that don't have it
-- Ensure all user-facing tables have RLS enabled

-- Double-check critical tables have RLS (they should already)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jane_integrations ENABLE ROW LEVEL SECURITY;