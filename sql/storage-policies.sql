-- Storage Bucket Setup for Smart Doc Chaser
-- Run this in Supabase SQL Editor AFTER creating the bucket manually

-- First, create the bucket via Supabase Dashboard:
-- 1. Go to Storage > New bucket
-- 2. Name: client-documents
-- 3. Public bucket: YES (for MVP simplicity)

-- Then run these policies:

-- Allow anyone to upload files (for client uploads via token link)
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'client-documents');

-- Allow anyone to read/download files
CREATE POLICY "Allow public downloads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-documents');

-- Allow updates (for file overwrites)
CREATE POLICY "Allow public updates"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

-- Allow deletes (optional, for cleanup)
CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'client-documents');
