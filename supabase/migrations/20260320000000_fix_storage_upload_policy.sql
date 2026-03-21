-- Fix storage upload policy: remove anonymous uploads from designs bucket.
-- The previous policy (20260318000000) accidentally included auth.role() = 'anon',
-- which allows unauthenticated users to upload arbitrary files. This corrects it.

DROP POLICY IF EXISTS "Authenticated upload to designs" ON storage.objects;

CREATE POLICY "Authenticated upload to designs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'designs'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);
