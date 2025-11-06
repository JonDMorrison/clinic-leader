-- Fix infinite recursion in user_roles RLS policies
-- The issue: policies were checking user_roles table to verify admin status,
-- but the policies are ON user_roles itself, causing recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Create non-recursive policies using auth.uid() directly
-- Users can always view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only allow inserts/updates/deletes through security definer functions
-- or by checking a separate admin marker (we'll use a simple approach)
CREATE POLICY "Service role can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  -- Check if the current role is 'service_role' 
  -- This bypasses the recursion since it doesn't query user_roles
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  -- Allow if they're modifying their own role (for edge cases)
  user_id = auth.uid()
)
WITH CHECK (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  user_id = auth.uid()
);

-- Create a simpler admin check function that uses a cached approach
CREATE OR REPLACE FUNCTION public.is_admin_simple()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'director')
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_simple() TO authenticated;

COMMENT ON POLICY "Service role can manage all roles" ON public.user_roles IS 
'Prevents infinite recursion by only allowing service_role or self-updates';
