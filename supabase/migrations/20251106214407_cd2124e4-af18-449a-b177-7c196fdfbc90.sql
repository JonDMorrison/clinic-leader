-- Allow DOCX/PDF uploads in documents bucket and raise size limit
update storage.buckets
set allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
],
file_size_limit = 52428800 -- 50 MB
where id = 'documents';