-- Admin-initiated cancellation tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_cancel_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by_admin_at timestamptz;
