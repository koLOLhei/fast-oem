-- ── C-2: access_token expiry mechanism ────────────────────────────────────────
-- Adds time-limited validity to order access tokens. Previously tokens were
-- permanent, creating an indefinite access window if a link was leaked.
--
-- Design:
--   - NULL = no expiry (backward compat for existing orders if desired)
--   - New orders get 1 year from creation by default
--   - Backfill existing orders: created_at + 1 year
--   - RLS policy updated to check expiry
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add the expiry column (nullable for backward compatibility)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz;

-- 2. Backfill existing orders: 1 year from creation date
UPDATE public.orders
SET access_token_expires_at = created_at + interval '1 year'
WHERE access_token_expires_at IS NULL;

-- 3. Set default for new orders: 1 year from insertion time
ALTER TABLE public.orders
ALTER COLUMN access_token_expires_at SET DEFAULT (now() + interval '1 year');

-- 4. Update the RLS token-based read policy to also enforce expiry.
--    Tokens past their expiry date will no longer match.
DROP POLICY IF EXISTS "Token-based order read" ON public.orders;

CREATE POLICY "Token-based order read"
ON public.orders FOR SELECT
USING (
    access_token = (current_setting('request.jwt.claims', true)::jsonb->>'order_token')::uuid
    AND (access_token_expires_at IS NULL OR access_token_expires_at > now())
);

-- 5. Index for efficient expiry-aware lookups
CREATE INDEX IF NOT EXISTS orders_access_token_expires_idx
ON public.orders (access_token, access_token_expires_at);
