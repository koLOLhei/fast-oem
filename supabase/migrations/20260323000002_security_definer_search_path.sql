-- Fix: SECURITY DEFINER functions without SET search_path are vulnerable to
-- search_path hijacking attacks where a malicious schema object intercepts calls.
-- Recreate all affected functions with SET search_path = public.

-- ── handle_new_user (originally in 20260319000008_user_management.sql) ────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_invite public.staff_invitations%ROWTYPE;
BEGIN
    -- Check for a pending staff invitation matching this email
    SELECT * INTO v_invite
    FROM public.staff_invitations
    WHERE lower(email) = lower(new.email)
      AND used_at IS NULL
    LIMIT 1;

    IF FOUND THEN
        INSERT INTO public.profiles (id, role, factory_id, name, email)
        VALUES (
            new.id,
            v_invite.role,
            v_invite.factory_id,
            COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
            new.email
        )
        ON CONFLICT (id) DO UPDATE
            -- Only update role/factory if the existing profile is still 'customer'.
            -- This prevents an already-elevated account from being silently downgraded
            -- or re-escalated by a replayed or duplicate invitation record.
            SET role       = CASE WHEN profiles.role = 'customer' THEN EXCLUDED.role ELSE profiles.role END,
                factory_id = CASE WHEN profiles.role = 'customer' THEN EXCLUDED.factory_id ELSE profiles.factory_id END,
                name       = EXCLUDED.name,
                email      = EXCLUDED.email;
        -- Mark invitation as used
        UPDATE public.staff_invitations SET used_at = now() WHERE id = v_invite.id;
    ELSE
        INSERT INTO public.profiles (id, role, name, email)
        VALUES (
            new.id,
            'customer',
            COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
            new.email
        )
        ON CONFLICT (id) DO UPDATE
            SET name  = EXCLUDED.name,
                email = EXCLUDED.email;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
