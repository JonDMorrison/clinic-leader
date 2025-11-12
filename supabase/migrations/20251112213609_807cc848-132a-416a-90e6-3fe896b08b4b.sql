
-- Add missing unique constraint to user_roles table
-- This is required for the admin-add-user edge function's upsert operation
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
