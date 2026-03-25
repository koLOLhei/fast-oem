-- ── Fix: add UNIQUE constraint on staff_invitations.email ──────────────────
-- The inviteStaffUser action uses upsert with onConflict: 'email',
-- which requires a unique constraint on the email column.
-- Before adding the constraint, deduplicate any existing rows by keeping
-- only the most recently created invitation per email.
-- ───────────────────────────────────────────────────────────────────────────

-- Remove duplicate emails, keeping the newest row per email
DELETE FROM public.staff_invitations a
USING public.staff_invitations b
WHERE a.email = b.email
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE public.staff_invitations
    ADD CONSTRAINT staff_invitations_email_key UNIQUE (email);
