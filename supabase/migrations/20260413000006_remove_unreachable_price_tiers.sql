-- acrylic-keychain, pin-badge, rubber-keychain の maxQuantity=100000 に対して
-- 到達不能な価格帯 100001-200000 を削除する。
-- can-badge は maxQuantity=200000 のため対象外。

-- acrylic-keychain: 最終帯 100001-200000 (unitPrice 40) を削除
UPDATE products
SET price_tiers = (
  SELECT jsonb_agg(tier ORDER BY (tier->>'minQuantity')::int)
  FROM jsonb_array_elements(price_tiers) AS tier
  WHERE (tier->>'minQuantity')::int <= 100000
)
WHERE slug = 'acrylic-keychain';

-- pin-badge: 最終帯 100001-200000 (unitPrice 44) を削除
UPDATE products
SET price_tiers = (
  SELECT jsonb_agg(tier ORDER BY (tier->>'minQuantity')::int)
  FROM jsonb_array_elements(price_tiers) AS tier
  WHERE (tier->>'minQuantity')::int <= 100000
)
WHERE slug = 'pin-badge';

-- rubber-keychain: 最終帯 100001-200000 (unitPrice 38) を削除
UPDATE products
SET price_tiers = (
  SELECT jsonb_agg(tier ORDER BY (tier->>'minQuantity')::int)
  FROM jsonb_array_elements(price_tiers) AS tier
  WHERE (tier->>'minQuantity')::int <= 100000
)
WHERE slug = 'rubber-keychain';
