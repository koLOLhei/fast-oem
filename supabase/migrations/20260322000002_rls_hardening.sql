-- ── RLS Hardening ─────────────────────────────────────────────────────────────
-- The initial migration shipped with USING (true) policies on orders and
-- order_items — allowing any anonymous request to read, insert, and update
-- every row.  This migration replaces those with role-scoped policies.
--
-- Service role always bypasses RLS, so all server actions and Edge Functions
-- continue to work unchanged.  Only direct anon/authenticated client queries
-- are now gated by these policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Shared helper: is the calling JWT an admin? ────────────────────────────
-- SECURITY DEFINER so it can query profiles without the caller needing SELECT
-- permission on that table.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
$$;

-- ── Shared helper: factory_id for the calling user ─────────────────────────
CREATE OR REPLACE FUNCTION public.my_factory_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT factory_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'factory' AND is_active = true;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ORDERS
-- ═══════════════════════════════════════════════════════════════════════════
-- Drop overly-permissive init policies
DROP POLICY IF EXISTS "Enable read access for all users"  ON public.orders;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable update for service role"    ON public.orders;

-- Admins can do everything
CREATE POLICY "orders_admin_all" ON public.orders
    FOR ALL TO authenticated
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- Factory users can SELECT orders that have at least one item assigned to them
-- (needed to display order context in the factory portal via server-side rendering).
-- Direct client queries from the factory portal are server-side with service role,
-- so this policy mainly guards any future direct-client access.
CREATE POLICY "orders_factory_select" ON public.orders
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.order_items oi
            WHERE oi.order_id = orders.id
              AND oi.factory_id = public.my_factory_id()
              AND public.my_factory_id() IS NOT NULL
        )
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- ORDER ITEMS
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Enable read access for all users"  ON public.order_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.order_items;
DROP POLICY IF EXISTS "Enable update for service role"    ON public.order_items;

-- Tighten existing factory policies (they used a subquery; replace with helper)
DROP POLICY IF EXISTS "Admins can manage order items"    ON public.order_items;
DROP POLICY IF EXISTS "Factories can view assigned items" ON public.order_items;
DROP POLICY IF EXISTS "Factories can update status"      ON public.order_items;

-- Admin: full access
CREATE POLICY "order_items_admin_all" ON public.order_items
    FOR ALL TO authenticated
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- Factory: read only their items
CREATE POLICY "order_items_factory_select" ON public.order_items
    FOR SELECT TO authenticated
    USING (
        factory_id = public.my_factory_id()
        AND public.my_factory_id() IS NOT NULL
    );

-- Factory: update only their items (status + tracking_number)
CREATE POLICY "order_items_factory_update" ON public.order_items
    FOR UPDATE TO authenticated
    USING (
        factory_id = public.my_factory_id()
        AND public.my_factory_id() IS NOT NULL
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCTS  (add admin write; public read of active products already exists)
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "products_admin_write" ON public.products;

CREATE POLICY "products_admin_write" ON public.products
    FOR ALL TO authenticated
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- ═══════════════════════════════════════════════════════════════════════════
-- SITE_SETTINGS  (tighten update: require admin, not just any authenticated)
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Auth update for site_settings" ON public.site_settings;

CREATE POLICY "site_settings_admin_update" ON public.site_settings
    FOR UPDATE TO authenticated
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- ═══════════════════════════════════════════════════════════════════════════
-- FACTORIES  (already scoped; just replace subquery style with helper)
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can manage factories"           ON public.factories;
DROP POLICY IF EXISTS "Factory users can view their own factory info" ON public.factories;

CREATE POLICY "factories_admin_all" ON public.factories
    FOR ALL TO authenticated
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

CREATE POLICY "factories_factory_select" ON public.factories
    FOR SELECT TO authenticated
    USING (id = public.my_factory_id() AND public.my_factory_id() IS NOT NULL);
