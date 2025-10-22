-- Create storage bucket for imports
INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false);

-- RLS policies for imports bucket
CREATE POLICY "Admins can upload to imports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'imports' AND (is_admin() OR is_billing()));

CREATE POLICY "Admins can read imports"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'imports' AND (is_admin() OR is_billing()));

CREATE POLICY "Admins can delete imports"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'imports' AND (is_admin() OR is_billing()));