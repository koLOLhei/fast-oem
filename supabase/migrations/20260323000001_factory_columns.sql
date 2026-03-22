-- ── Additional factory columns ────────────────────────────────────────────
-- Extends the factories table with contact details, capacity, and active flag
-- for the factory edit/delete admin UI.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.factories
    ADD COLUMN IF NOT EXISTS contact_name    text,
    ADD COLUMN IF NOT EXISTS contact_phone   text,
    ADD COLUMN IF NOT EXISTS address         text,
    ADD COLUMN IF NOT EXISTS max_capacity    integer,
    ADD COLUMN IF NOT EXISTS is_active       boolean NOT NULL DEFAULT true;
