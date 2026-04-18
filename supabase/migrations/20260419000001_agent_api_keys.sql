-- Agent API keys: opt-in credential customers can issue so AI agents can
-- place orders and charge their saved card off-session.
--
-- - secret_hash: SHA-256 hex of the raw key; plaintext keys are never stored.
-- - stripe_customer_id / stripe_default_pm_id: populated after the customer
--   saves a card via /mypage/agent-access (Stripe SetupIntent flow).
-- - daily_cap_jpy: hard per-day spending cap. Server sums orders where
--   agent_key_id = this row and enforces before charging.

CREATE TABLE IF NOT EXISTS agent_api_keys (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name                    text        NOT NULL,
    secret_hash             text        NOT NULL UNIQUE,
    prefix                  text        NOT NULL,   -- e.g. 'sk_agent_xxxx' (first 12 chars) for display
    daily_cap_jpy           integer     NOT NULL DEFAULT 100000 CHECK (daily_cap_jpy >= 0),
    enabled                 boolean     NOT NULL DEFAULT true,
    stripe_customer_id      text,
    stripe_default_pm_id    text,
    last_used_at            timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    disabled_at             timestamptz
);

CREATE INDEX IF NOT EXISTS agent_api_keys_user_id_idx ON agent_api_keys(user_id);
CREATE INDEX IF NOT EXISTS agent_api_keys_enabled_idx ON agent_api_keys(enabled) WHERE enabled;

-- Audit: link each order to the agent key that created it (nullable — human
-- orders leave this NULL).
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS agent_key_id uuid REFERENCES agent_api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_agent_key_id_idx ON orders(agent_key_id) WHERE agent_key_id IS NOT NULL;

-- RLS: only the service role may read/write this table (never the anon client).
ALTER TABLE agent_api_keys ENABLE ROW LEVEL SECURITY;
