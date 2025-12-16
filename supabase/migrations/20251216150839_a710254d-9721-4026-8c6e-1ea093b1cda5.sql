-- Create doc_sections table for SOP sectionization
CREATE TABLE public.doc_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  doc_id uuid NOT NULL REFERENCES public.docs(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('body_markdown', 'parsed_text')),
  section_order integer NOT NULL DEFAULT 0,
  section_title text NOT NULL DEFAULT '',
  section_slug text NOT NULL DEFAULT '',
  section_body text NOT NULL DEFAULT '',
  section_type text NOT NULL DEFAULT 'other' CHECK (section_type IN ('overview', 'steps', 'scoring', 'interpretation', 'when_to_use', 'where_to_find', 'clinical_notes', 'reference', 'other')),
  heading_path text NOT NULL DEFAULT '',
  token_count integer NOT NULL DEFAULT 0,
  embedding vector(1536) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX doc_sections_org_doc_idx ON public.doc_sections (organization_id, doc_id);
CREATE INDEX doc_sections_org_title_idx ON public.doc_sections (organization_id, section_title);
CREATE INDEX doc_sections_org_slug_idx ON public.doc_sections (organization_id, section_slug);
CREATE INDEX doc_sections_org_type_idx ON public.doc_sections (organization_id, section_type);
CREATE INDEX doc_sections_org_heading_path_idx ON public.doc_sections (organization_id, heading_path);
CREATE INDEX doc_sections_embedding_idx ON public.doc_sections USING hnsw (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE public.doc_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies mirroring docs table patterns
CREATE POLICY "Team members can read org doc_sections"
ON public.doc_sections
FOR SELECT
USING (is_same_team(organization_id));

CREATE POLICY "Admins can manage org doc_sections"
ON public.doc_sections
FOR ALL
USING (is_admin() AND is_same_team(organization_id))
WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can manage org doc_sections"
ON public.doc_sections
FOR ALL
USING (is_manager() AND is_same_team(organization_id))
WITH CHECK (is_manager() AND is_same_team(organization_id));

-- Add updated_at trigger
CREATE TRIGGER update_doc_sections_updated_at
BEFORE UPDATE ON public.doc_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();