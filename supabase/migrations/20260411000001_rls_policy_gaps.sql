-- ── C-1: Fix remaining RLS policy gaps ────────────────────────────────────────
--
-- 1. admin_alerts: policies use hard-coded role='admin', missing super_admin.
--    Replace with is_admin_user(). Add DELETE policy for alert cleanup.
-- 2. site_settings: add INSERT/DELETE so admins can manage settings via UI
--    (currently only UPDATE exists; inserts were migration-only).
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN_ALERTS: Fix super_admin exclusion + add DELETE
-- ═══════════════════════════════════════════════════════════════════════════

-- Replace SELECT: was hard-coded role='admin', now uses is_admin_user()
DROP POLICY IF EXISTS "Admins can read admin_alerts" ON public.admin_alerts;
CREATE POLICY "admin_alerts_admin_select" ON public.admin_alerts
    FOR SELECT TO authenticated
    USING (public.is_admin_user());

-- Replace UPDATE: same fix
DROP POLICY IF EXISTS "Admins can update admin_alerts" ON public.admin_alerts;
CREATE POLICY "admin_alerts_admin_update" ON public.admin_alerts
    FOR UPDATE TO authenticated
    USING (public.is_admin_user());

-- Add DELETE: admins can remove resolved alerts for cleanup
CREATE POLICY "admin_alerts_admin_delete" ON public.admin_alerts
    FOR DELETE TO authenticated
    USING (public.is_admin_user());

-- ═══════════════════════════════════════════════════════════════════════════
-- SITE_SETTINGS: Add INSERT/DELETE for admin management
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow admins to add new settings from the dashboard
CREATE POLICY "site_settings_admin_insert" ON public.site_settings
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_user());

-- Allow admins to remove deprecated settings
CREATE POLICY "site_settings_admin_delete" ON public.site_settings
    FOR DELETE TO authenticated
    USING (public.is_admin_user());
