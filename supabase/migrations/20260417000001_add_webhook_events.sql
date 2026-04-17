-- Track Stripe webhook event IDs so event handlers are truly idempotent.
-- Previously charge.refunded and charge.dispute.created used amount-based or
-- no-guard checks; on Stripe re-delivery this produced duplicate Slack alerts
-- and admin_alerts rows. Switching to an event.id primary key makes each
-- incoming event processed at most once.

CREATE TABLE IF NOT EXISTS webhook_events (
    event_id    text PRIMARY KEY,
    event_type  text NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    payload     jsonb
);

CREATE INDEX IF NOT EXISTS webhook_events_event_type_idx ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx ON webhook_events(received_at DESC);

-- RLS: only service role may read/write (webhooks run with service role).
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
