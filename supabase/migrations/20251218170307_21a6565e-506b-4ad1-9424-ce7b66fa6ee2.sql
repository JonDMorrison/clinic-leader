-- Add clearance_level to seats table (1-5 scale)
ALTER TABLE public.seats ADD COLUMN IF NOT EXISTS clearance_level integer DEFAULT 3 CHECK (clearance_level >= 1 AND clearance_level <= 5);

-- Create seat_users join table for many-to-many (multiple people per seat)
CREATE TABLE IF NOT EXISTS public.seat_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seat_id uuid NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(seat_id, user_id)
);

-- Enable RLS on seat_users
ALTER TABLE public.seat_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for seat_users
CREATE POLICY "Admins can manage org seat_users" ON public.seat_users FOR ALL
  USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can manage org seat_users" ON public.seat_users FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org seat_users" ON public.seat_users FOR SELECT
  USING (is_same_team(organization_id));

-- Migrate existing user_id assignments to seat_users table
INSERT INTO public.seat_users (seat_id, user_id, organization_id, is_primary)
SELECT id, user_id, organization_id, true
FROM public.seats
WHERE user_id IS NOT NULL
ON CONFLICT (seat_id, user_id) DO NOTHING;