-- ============================================================
-- 2026-04-13: Fix max_quantity for 3 products + rubber-keychain size options
--
-- Problems:
-- 1. max_quantity was never updated from seed values (acrylic:1000, pin:2000, rubber:2000)
--    but price tiers go up to 200000. Static data has 100000.
-- 2. Migration 20260413000002 accidentally set wrong size labels and price modifiers
--    for rubber-keychain (medium: +5 instead of +10, large: +10 instead of +25).
-- ============================================================

-- 1. Fix max_quantity to match static data and price tier coverage
UPDATE public.products SET max_quantity = 100000 WHERE slug = 'acrylic-keychain';
UPDATE public.products SET max_quantity = 100000 WHERE slug = 'pin-badge';
UPDATE public.products SET max_quantity = 100000 WHERE slug = 'rubber-keychain';
-- can-badge already has max_quantity = 200000 (correct)

-- 2. Fix rubber-keychain options: correct size labels and price modifiers
--    to match static data in lib/products.ts
UPDATE public.products
SET options = '[
  {
    "id": "chain_type",
    "name": "チェーン種類",
    "type": "list",
    "required": true,
    "values": [
      {"id": "ball-chain", "label": "ボールチェーン"},
      {"id": "lobster", "label": "カニカン"},
      {"id": "strap", "label": "ストラップ"}
    ]
  },
  {
    "id": "size",
    "name": "サイズ",
    "type": "list",
    "required": true,
    "values": [
      {"id": "small", "label": "小（40mm以下）"},
      {"id": "medium", "label": "中（50-70mm）", "priceModifier": {"type": "add", "value": 10}},
      {"id": "large", "label": "大（80mm以上）", "priceModifier": {"type": "add", "value": 25}}
    ]
  },
  {
    "id": "background_color",
    "name": "背景色",
    "type": "color",
    "required": false,
    "values": []
  },
  {
    "id": "pp_bag",
    "name": "PP袋（個別包装）",
    "type": "list",
    "required": false,
    "values": [
      {"id": "none", "label": "なし"},
      {"id": "pp_bag", "label": "PP袋", "priceModifier": {"type": "add", "value": 7}}
    ]
  }
]'
WHERE slug = 'rubber-keychain';
