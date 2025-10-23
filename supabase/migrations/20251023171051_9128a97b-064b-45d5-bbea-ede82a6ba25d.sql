-- Create user_tour_status table
CREATE TABLE IF NOT EXISTS public.user_tour_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_tour_status ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tour status
CREATE POLICY "Users can manage their own tour status"
ON public.user_tour_status
FOR ALL
USING (user_id = current_user_id())
WITH CHECK (user_id = current_user_id());

-- Admins can manage all tour statuses
CREATE POLICY "Admins can manage all tour statuses"
ON public.user_tour_status
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Create index for faster lookups
CREATE INDEX idx_user_tour_status_user_id ON public.user_tour_status(user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_tour_status_updated_at
BEFORE UPDATE ON public.user_tour_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();