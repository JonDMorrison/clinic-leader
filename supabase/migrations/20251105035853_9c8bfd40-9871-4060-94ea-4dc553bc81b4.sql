-- Create playbooks table
CREATE TABLE public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  filename TEXT NOT NULL,
  file_url TEXT,
  parsed_text TEXT,
  parsed_steps JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on organization_id for faster queries
CREATE INDEX idx_playbooks_organization_id ON public.playbooks(organization_id);

-- Create GIN index for full-text search
CREATE INDEX idx_playbooks_search ON public.playbooks 
USING GIN (to_tsvector('english', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(parsed_text, '')
));

-- Create updated_at trigger
CREATE TRIGGER update_playbooks_updated_at
  BEFORE UPDATE ON public.playbooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Staff can view playbooks in their org
CREATE POLICY "Users can view org playbooks"
  ON public.playbooks
  FOR SELECT
  USING (is_same_team(organization_id));

-- Admins can insert playbooks
CREATE POLICY "Admins can insert org playbooks"
  ON public.playbooks
  FOR INSERT
  WITH CHECK (is_admin() AND is_same_team(organization_id));

-- Admins can update playbooks in their org
CREATE POLICY "Admins can update org playbooks"
  ON public.playbooks
  FOR UPDATE
  USING (is_admin() AND is_same_team(organization_id));

-- Admins can delete playbooks in their org
CREATE POLICY "Admins can delete org playbooks"
  ON public.playbooks
  FOR DELETE
  USING (is_admin() AND is_same_team(organization_id));

-- Create storage bucket for playbooks
INSERT INTO storage.buckets (id, name, public) 
VALUES ('playbooks', 'playbooks', false);

-- RLS for storage bucket
-- Users can view files from their org folder
CREATE POLICY "Users can view org playbook files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'playbooks' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT team_id::text 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );

-- Authenticated users can upload files to their org folder
-- (Application logic will ensure only admins call this)
CREATE POLICY "Users can upload org playbook files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'playbooks' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT team_id::text 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );

-- Authenticated users can delete files from their org folder  
-- (Application logic will ensure only admins call this)
CREATE POLICY "Users can delete org playbook files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'playbooks' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT team_id::text 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );