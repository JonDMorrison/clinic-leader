-- Add import_key and aliases columns to metrics table for better matching
ALTER TABLE public.metrics 
ADD COLUMN IF NOT EXISTS import_key text,
ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}';

-- Create monthly_import_profiles table
CREATE TABLE public.monthly_import_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Primary Monthly KPI Upload',
  file_fingerprint text,
  sheet_name text NOT NULL,
  layout_type text NOT NULL CHECK (layout_type IN ('row_metrics', 'column_metrics')),
  header_row_index int NOT NULL DEFAULT 0,
  metric_name_column text,
  value_column text,
  month_column text,
  mappings jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monthly_import_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for monthly_import_profiles
CREATE POLICY "Users can view their org profiles"
ON public.monthly_import_profiles FOR SELECT
USING (organization_id = public.current_user_team());

CREATE POLICY "Users can insert their org profiles"
ON public.monthly_import_profiles FOR INSERT
WITH CHECK (organization_id = public.current_user_team());

CREATE POLICY "Users can update their org profiles"
ON public.monthly_import_profiles FOR UPDATE
USING (organization_id = public.current_user_team());

CREATE POLICY "Users can delete their org profiles"
ON public.monthly_import_profiles FOR DELETE
USING (organization_id = public.current_user_team());

-- Create index for organization lookup
CREATE INDEX idx_monthly_import_profiles_org ON public.monthly_import_profiles(organization_id);

-- Create updated_at trigger
CREATE TRIGGER update_monthly_import_profiles_updated_at
BEFORE UPDATE ON public.monthly_import_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();