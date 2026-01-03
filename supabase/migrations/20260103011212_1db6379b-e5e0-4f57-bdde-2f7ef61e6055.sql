-- Add jane_staff_member_guid to users table for linking to Jane staff
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS jane_staff_member_guid text;

-- Add unique constraint to prevent duplicate Jane staff links
CREATE UNIQUE INDEX IF NOT EXISTS users_jane_staff_member_guid_key 
ON public.users(jane_staff_member_guid) 
WHERE jane_staff_member_guid IS NOT NULL;

-- Add staff_member_name to staging_appointments_jane
ALTER TABLE public.staging_appointments_jane 
ADD COLUMN IF NOT EXISTS staff_member_name text;

-- Add staff_member_name to staging_invoices_jane
ALTER TABLE public.staging_invoices_jane 
ADD COLUMN IF NOT EXISTS staff_member_name text;

-- Add staff_member_name to staging_shifts_jane
ALTER TABLE public.staging_shifts_jane 
ADD COLUMN IF NOT EXISTS staff_member_name text;

-- Add 'provider' to the user_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'provider' AND enumtypid = 'public.user_role'::regtype) THEN
    ALTER TYPE public.user_role ADD VALUE 'provider';
  END IF;
END $$;