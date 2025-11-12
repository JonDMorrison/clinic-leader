-- Add index on lower(email) for fast case-insensitive lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));