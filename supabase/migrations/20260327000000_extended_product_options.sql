-- ── Extended product options: 3D support, mold fee rules, shipping modifier ──
-- Adds columns for:
--   - Conditional mold fee rules (size-based, quantity-based)
--   - 3D product flag and required image views
--   - Per-order-item shipping modifier and multi-view design images

ALTER TABLE products ADD COLUMN IF NOT EXISTS mold_fee_rules JSONB NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_3d BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_views JSONB NOT NULL DEFAULT '[]';

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS design_images JSONB NOT NULL DEFAULT '[]';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shipping_modifier INTEGER NOT NULL DEFAULT 0;
