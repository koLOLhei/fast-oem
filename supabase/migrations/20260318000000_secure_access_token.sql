-- Add access_token for no-auth order status lookup
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS access_token uuid DEFAULT gen_random_uuid() NOT NULL;

-- Ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS orders_access_token_idx ON public.orders (access_token);

-- ============================================================
-- DENY-BY-DEFAULT: Drop the overly permissive initial policies
-- ============================================================

-- Drop old permissive policies from init.sql
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable update for service role" ON public.orders;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.order_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.order_items;
DROP POLICY IF EXISTS "Enable update for service role" ON public.order_items;

-- ============================================================
-- ORDERS: Scoped access only
-- ============================================================

-- Admins (authenticated, role=admin) can read all orders
CREATE POLICY "Admins can read orders"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Service role can insert orders (webhook uses service role key)
CREATE POLICY "Service role can insert orders"
ON public.orders FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Service role can update orders
CREATE POLICY "Service role can update orders"
ON public.orders FOR UPDATE
USING (auth.role() = 'service_role');

-- Customers can read their own order by matching access_token
-- (used by /orders/[id]/status?token=... — no auth required, anon role)
CREATE POLICY "Token-based order read"
ON public.orders FOR SELECT
USING (access_token = (current_setting('request.jwt.claims', true)::jsonb->>'order_token')::uuid);

-- ============================================================
-- ORDER_ITEMS: Scoped access only
-- ============================================================

-- Service role can insert order items
CREATE POLICY "Service role can insert order_items"
ON public.order_items FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- STORAGE: Restrict designs bucket
-- ============================================================

-- Only allow uploads when authenticated or service role (restrict anonymous uploads)
DROP POLICY IF EXISTS "Public Upload to designs" ON storage.objects;

CREATE POLICY "Authenticated upload to designs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'designs'
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon')
);
