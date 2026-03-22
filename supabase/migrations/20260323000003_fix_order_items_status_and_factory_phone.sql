-- ── Fix order_items.status CHECK constraint ──────────────────────────────────
-- The initial migration (20260315000001) created:
--   CHECK (status IN ('unassigned','assigned','manufacturing','shipped'))
-- But the app now uses 'ready_to_ship' and 'cancelled' statuses, which
-- would be rejected by the old constraint.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_status_check;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_status_check
  CHECK (status IN ('unassigned','assigned','manufacturing','ready_to_ship','shipped','cancelled'));

-- ── Fix factories phone column ───────────────────────────────────────────────
-- Two migrations created conflicting columns:
--   20260322000001 added 'phone'
--   20260323000001 added 'contact_phone'
-- The app uses 'phone'. Copy any data from contact_phone → phone, then drop.
-- ─────────────────────────────────────────────────────────────────────────────

-- Copy contact_phone data to phone where phone is empty
UPDATE public.factories
  SET phone = contact_phone
  WHERE contact_phone IS NOT NULL
    AND (phone IS NULL OR phone = '');

ALTER TABLE public.factories DROP COLUMN IF EXISTS contact_phone;
