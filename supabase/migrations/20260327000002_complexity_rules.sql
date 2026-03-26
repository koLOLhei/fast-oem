-- Complexity restriction rules: block ordering for certain complexity + size/shape combos
ALTER TABLE products ADD COLUMN IF NOT EXISTS complexity_rules JSONB NOT NULL DEFAULT '[]';
