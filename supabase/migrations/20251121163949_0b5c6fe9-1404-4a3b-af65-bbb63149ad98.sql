-- Add EOS people assessment fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gwc_gets_it boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gwc_wants_it boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gwc_capacity boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manager_notes text,
ADD COLUMN IF NOT EXISTS hire_date date;