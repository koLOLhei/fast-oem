-- Create a public bucket for product images uploaded via the admin panel.
-- Images are public (no auth needed to view) but only service_role can write.

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read product images (they are public assets)
CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Only service_role can insert (admin panel uses service client)
CREATE POLICY "Service role insert product-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'service_role');

-- Only service_role can delete
CREATE POLICY "Service role delete product-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'service_role');
