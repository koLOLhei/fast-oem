-- Track Stripe payment intent ID for refund webhook lookups (Risk #2)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id text;
CREATE INDEX IF NOT EXISTS orders_payment_intent_id_idx
    ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;

-- Refund tracking columns (Risk #2)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_amount  integer   DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at      timestamptz;

-- Email delivery failure tracking (Risk #3)
-- NULL = no failure. Non-null = confirmation email failed with this error.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_send_error text;
