-- Fix storage upload policy: remove anonymous access from designs bucket.
--
-- Context: Design images are stored as base64 data URIs in the cart and saved
-- directly to order_items.design_url via the server action (startCheckoutSession).
-- The Edge Function (service_role) then processes and uploads them to Storage.
-- Direct client-side uploads to the designs bucket are NOT used in the current flow,
-- so anonymous (anon) access is unnecessary and poses a security risk.
--
-- This migration replaces the overly permissive policy (which included auth.role() = 'anon')
-- with a strict policy allowing only authenticated users and the service role.

DROP POLICY IF EXISTS "Authenticated upload to designs" ON storage.objects;

CREATE POLICY "Authenticated upload to designs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'designs'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- Also restrict updates (e.g. upsert) to service role only
DROP POLICY IF EXISTS "Service role update designs" ON storage.objects;

CREATE POLICY "Service role update designs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'designs'
  AND auth.role() = 'service_role'
);
