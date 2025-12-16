-- Create function for semantic similarity search on doc_sections
CREATE OR REPLACE FUNCTION match_doc_sections(
  query_embedding vector(1536),
  match_org_id uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  doc_id uuid,
  doc_title text,
  section_title text,
  section_type text,
  heading_path text,
  section_body text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ds.id,
    ds.doc_id,
    d.title as doc_title,
    ds.section_title,
    ds.section_type,
    ds.heading_path,
    ds.section_body,
    1 - (ds.embedding <=> query_embedding) as similarity
  FROM doc_sections ds
  JOIN docs d ON d.id = ds.doc_id
  WHERE ds.organization_id = match_org_id
    AND ds.embedding IS NOT NULL
    AND d.status = 'approved'
    AND d.kind = 'SOP'
    AND 1 - (ds.embedding <=> query_embedding) > match_threshold
  ORDER BY ds.embedding <=> query_embedding
  LIMIT match_count;
$$;