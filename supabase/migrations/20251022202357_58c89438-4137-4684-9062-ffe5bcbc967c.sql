-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create seats table
CREATE TABLE public.seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  responsibilities TEXT[] DEFAULT '{}',
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

-- RLS policies for seats
CREATE POLICY "Admins can manage seats"
ON public.seats
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Managers can manage seats"
ON public.seats
FOR ALL
TO authenticated
USING (is_manager())
WITH CHECK (is_manager());

CREATE POLICY "Staff can read seats"
ON public.seats
FOR SELECT
TO authenticated
USING (true);

-- Create core_values table
CREATE TABLE public.core_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.core_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for core_values
CREATE POLICY "Admins can manage core_values"
ON public.core_values
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "All authenticated users can read core_values"
ON public.core_values
FOR SELECT
TO authenticated
USING (true);

-- Create value_rating enum
CREATE TYPE public.value_rating AS ENUM ('+', '±', '-');

-- Create value_ratings table
CREATE TABLE public.value_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  value_id UUID NOT NULL REFERENCES public.core_values(id) ON DELETE CASCADE,
  rating public.value_rating NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, value_id)
);

-- Enable RLS
ALTER TABLE public.value_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for value_ratings
CREATE POLICY "Admins can manage all value_ratings"
ON public.value_ratings
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Managers can manage team value_ratings"
ON public.value_ratings
FOR ALL
TO authenticated
USING (is_manager() AND user_id IN (
  SELECT id FROM public.users WHERE team_id = current_user_team()
))
WITH CHECK (is_manager() AND user_id IN (
  SELECT id FROM public.users WHERE team_id = current_user_team()
));

CREATE POLICY "Staff can read team value_ratings"
ON public.value_ratings
FOR SELECT
TO authenticated
USING (user_id IN (
  SELECT id FROM public.users WHERE team_id = current_user_team()
));

-- Create trigger for updated_at on seats
CREATE TRIGGER update_seats_updated_at
BEFORE UPDATE ON public.seats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on value_ratings
CREATE TRIGGER update_value_ratings_updated_at
BEFORE UPDATE ON public.value_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();