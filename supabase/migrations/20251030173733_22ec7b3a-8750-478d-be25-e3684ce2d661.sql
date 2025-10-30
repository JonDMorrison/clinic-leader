
-- Fix RLS helper functions to use user_roles table instead of users.role

-- Update is_admin function to check user_roles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.email = auth.email() 
    AND ur.role IN ('owner', 'director')
  );
$$;

-- Update is_manager function to check user_roles table
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.email = auth.email() 
    AND ur.role IN ('manager', 'owner', 'director')
  );
$$;
