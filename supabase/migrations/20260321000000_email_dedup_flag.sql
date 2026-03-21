-- ---------------------------------------------------------------------------
-- Email deduplication: prevent duplicate confirmation emails on Stripe
-- webhook re-deliveries or concurrent invocations.
--
-- Strategy: "claim before send" — the webhook atomically sets
-- confirmation_email_sent_at ONLY when it is NULL.  If another invocation
-- already set it, the UPDATE returns 0 rows and that invocation skips the
-- email entirely.  This guarantees exactly-once delivery at the DB level
-- without any distributed lock.
-- ---------------------------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

-- Partial index for fast lookup of unsent orders
CREATE INDEX IF NOT EXISTS idx_orders_email_not_sent
  ON orders (id)
  WHERE confirmation_email_sent_at IS NULL;

-- Also add a per-email order count index used by the checkout rate-limit guard
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_created
  ON orders ((customer_info->>'email'), created_at DESC)
  WHERE status <> 'cancelled';

COMMENT ON COLUMN orders.confirmation_email_sent_at IS
  'Set atomically the first time the confirmation email is dispatched.
   NULL means the email has not been sent yet.
   Used to prevent duplicate sends on Stripe webhook re-deliveries.';
