-- Grant permissions for auth trigger to work with admin.createUser()
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT INSERT, UPDATE ON TABLE public.users TO supabase_auth_admin;
GRANT INSERT ON TABLE public.user_roles TO supabase_auth_admin;