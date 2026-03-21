-- ── Staff invitations ─────────────────────────────────────────────────────
-- Admin sends invite → user registers → trigger auto-sets role from this table
CREATE TABLE IF NOT EXISTS public.staff_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'factory')),
    factory_id uuid REFERENCES public.factories(id) ON DELETE SET NULL,
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    used_at timestamptz
);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
ON public.staff_invitations FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Add email + is_active to profiles ─────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- ── Update trigger: auto-assign role from invitations ─────────────────────
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
            SET role = EXCLUDED.role,
                factory_id = EXCLUDED.factory_id,
                name = EXCLUDED.name,
                email = EXCLUDED.email;
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
            SET name = EXCLUDED.name,
                email = EXCLUDED.email;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RLS policies for admin to manage profiles ─────────────────────────────
-- Allow admins to update any profile (role changes, deactivation etc.)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Allow admins to insert profiles (in case trigger missed)
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
