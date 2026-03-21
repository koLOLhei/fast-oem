-- Add partially_shipped to any CHECK constraints on orders.status
-- If the column has no constraint, this is a no-op comment migration.
-- PostgreSQL text columns without CHECK constraints accept any value,
-- so no DDL change is strictly required — this file documents the new status.

-- To add a CHECK constraint if one exists (uncomment if needed):
-- ALTER TABLE public.orders
--   DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE public.orders
--   ADD CONSTRAINT orders_status_check
--   CHECK (status IN ('pending','paid','partially_shipped','shipped','cancelled','refunded'));

COMMENT ON COLUMN public.orders.status IS
  'pending | paid | partially_shipped | shipped | cancelled | refunded';
