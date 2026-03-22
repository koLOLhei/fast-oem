-- ── super_admin role ───────────────────────────────────────────────────────
-- Adds 'super_admin' to the role hierarchy:
--   super_admin > admin > factory > customer
--
-- Changes:
--   1. Extend CHECK constraints on profiles.role and staff_invitations.role
--   2. Update is_admin_user() helper to include super_admin
--   3. Replace hard-coded role='admin' policies with is_admin_user() on profiles/invitations
--   4. Promote k-ogawa@soara-mu.com to super_admin
-- ───────────────────────────────────────────────────────────────────────────

-- ── 1. Extend CHECK constraints ──────────────────────────────────────────

-- profiles.role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('super_admin', 'admin', 'factory', 'customer'));

-- staff_invitations.role
ALTER TABLE public.staff_invitations DROP CONSTRAINT IF EXISTS staff_invitations_role_check;
ALTER TABLE public.staff_invitations
    ADD CONSTRAINT staff_invitations_role_check
    CHECK (role IN ('super_admin', 'admin', 'factory'));

-- ── 2. Update is_admin_user() to accept super_admin ──────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin')
          AND is_active = true
    );
$$;

-- ── 3. Replace hard-coded role='admin' policies ───────────────────────────

-- profiles: view all
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin_user());

-- profiles: update
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
USING (public.is_admin_user());

-- profiles: insert
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (public.is_admin_user());

-- staff_invitations: manage
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.staff_invitations;
CREATE POLICY "Admins can manage invitations"
ON public.staff_invitations FOR ALL
USING (public.is_admin_user());

-- ── 4. Promote k-ogawa@soara-mu.com to super_admin ───────────────────────
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'k-ogawa@soara-mu.com';
