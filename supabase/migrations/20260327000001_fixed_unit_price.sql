-- Allow products to have fixed unit pricing that ignores option modifiers.
-- When fixed_unit_price = TRUE, the unit price comes solely from price_tiers
-- and option selections do not affect the per-unit cost.
ALTER TABLE products ADD COLUMN IF NOT EXISTS fixed_unit_price BOOLEAN NOT NULL DEFAULT FALSE;
