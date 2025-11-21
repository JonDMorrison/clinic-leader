-- Create enum for GWC ratings
CREATE TYPE gwc_rating AS ENUM ('+', '±', '-');

-- Create enum for assessment types
CREATE TYPE assessment_type AS ENUM ('manager', 'self', 'peer');

-- Create enum for assessment status
CREATE TYPE assessment_status AS ENUM ('draft', 'pending_review', 'completed');

-- Create gwc_assessments table
CREATE TABLE public.gwc_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assessed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quarter TEXT NOT NULL,
  assessment_type assessment_type NOT NULL DEFAULT 'manager',
  
  -- Gets It ratings and notes
  gets_it_rating gwc_rating,
  gets_it_notes TEXT,
  
  -- Wants It ratings and notes
  wants_it_rating gwc_rating,
  wants_it_notes TEXT,
  
  -- Capacity ratings and notes
  capacity_rating gwc_rating,
  capacity_notes TEXT,
  
  -- Overall assessment
  overall_notes TEXT,
  action_items TEXT,
  next_review_date DATE,
  status assessment_status NOT NULL DEFAULT 'draft',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_gwc_assessments_user_id ON public.gwc_assessments(user_id);
CREATE INDEX idx_gwc_assessments_assessed_by ON public.gwc_assessments(assessed_by);
CREATE INDEX idx_gwc_assessments_status ON public.gwc_assessments(status);
CREATE INDEX idx_gwc_assessments_assessment_date ON public.gwc_assessments(assessment_date DESC);

-- Enable RLS
ALTER TABLE public.gwc_assessments ENABLE ROW LEVEL SECURITY;

-- Policies: Managers can manage team assessments
CREATE POLICY "Managers can manage team gwc_assessments"
  ON public.gwc_assessments
  FOR ALL
  USING (
    is_manager() AND (
      user_id IN (SELECT id FROM users WHERE team_id = current_user_team())
    )
  )
  WITH CHECK (
    is_manager() AND (
      user_id IN (SELECT id FROM users WHERE team_id = current_user_team())
    )
  );

-- Policies: Users can view their own assessments
CREATE POLICY "Users can view their own gwc_assessments"
  ON public.gwc_assessments
  FOR SELECT
  USING (user_id = current_user_id());

-- Policies: Users can create self-assessments
CREATE POLICY "Users can create self gwc_assessments"
  ON public.gwc_assessments
  FOR INSERT
  WITH CHECK (
    assessment_type = 'self' AND
    user_id = current_user_id() AND
    assessed_by = current_user_id()
  );

-- Policies: Users can update their own draft self-assessments
CREATE POLICY "Users can update their own draft self gwc_assessments"
  ON public.gwc_assessments
  FOR UPDATE
  USING (
    assessment_type = 'self' AND
    user_id = current_user_id() AND
    status = 'draft'
  );

-- Policies: Admins can manage all assessments
CREATE POLICY "Admins can manage all gwc_assessments"
  ON public.gwc_assessments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_gwc_assessments_updated_at
  BEFORE UPDATE ON public.gwc_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();