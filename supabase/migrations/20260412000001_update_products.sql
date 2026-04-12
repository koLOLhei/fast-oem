-- ============================================================
-- 2026-04-12: Product update — 15% price increase, simplified options,
-- activate 4 products, deactivate 3 products
-- ============================================================

-- ============================================================
-- 1. Acrylic Keychain — 15% price increase + new options
-- ============================================================
UPDATE public.products
SET
  is_active = TRUE,
  requires_mold = FALSE,
  mold_fee = 0,
  lead_time_days = 30,
  express_delivery_fee = 0,
  price_tiers = '[{"minQuantity":50,"maxQuantity":100,"unitPrice":69},{"minQuantity":101,"maxQuantity":200,"unitPrice":67,"discountPercent":3},{"minQuantity":201,"maxQuantity":300,"unitPrice":64,"discountPercent":7},{"minQuantity":301,"maxQuantity":500,"unitPrice":62,"discountPercent":10},{"minQuantity":501,"maxQuantity":1000,"unitPrice":60,"discountPercent":13},{"minQuantity":1001,"maxQuantity":2000,"unitPrice":58,"discountPercent":16},{"minQuantity":2001,"maxQuantity":3000,"unitPrice":55,"discountPercent":20},{"minQuantity":3001,"maxQuantity":5000,"unitPrice":52,"discountPercent":25},{"minQuantity":5001,"maxQuantity":10000,"unitPrice":49,"discountPercent":29},{"minQuantity":10001,"maxQuantity":20000,"unitPrice":47,"discountPercent":32},{"minQuantity":20001,"maxQuantity":50000,"unitPrice":45,"discountPercent":35},{"minQuantity":50001,"maxQuantity":100000,"unitPrice":43,"discountPercent":38},{"minQuantity":100001,"maxQuantity":200000,"unitPrice":40,"discountPercent":42}]',
  options = '[{"id":"chain_type","name":"チェーン種類","type":"list","required":true,"values":[{"id":"ball-chain","label":"ボールチェーン"},{"id":"lobster","label":"カニカン"}]},{"id":"white_back","name":"ホワイト（白バック）","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"white","label":"ホワイト挿入","priceModifier":{"type":"multiply","value":1.2}}]},{"id":"double_sided","name":"両面印刷","type":"list","required":false,"values":[{"id":"none","label":"片面のみ"},{"id":"double","label":"両面印刷","priceModifier":{"type":"multiply","value":1.6}}]},{"id":"second_design","name":"裏面デザイン","type":"list","required":false,"parentId":"double_sided","showWhen":["double"],"values":[{"id":"same","label":"表面と同じ"},{"id":"different","label":"別のデザインを入稿"}]},{"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}]}]',
  quantity_presets = '[50,100,200,500,1000,2000,5000,10000]',
  features = '["高透明度アクリル","UVプリント","片面・両面印刷対応","ボールチェーン付属"]'
WHERE slug = 'acrylic-keychain';

-- ============================================================
-- 2. Can Badge — 15% price increase + new options
-- ============================================================
UPDATE public.products
SET
  is_active = TRUE,
  requires_mold = FALSE,
  mold_fee = 0,
  lead_time_days = 30,
  express_delivery_fee = 0,
  price_tiers = '[{"minQuantity":100,"maxQuantity":199,"unitPrice":114},{"minQuantity":200,"maxQuantity":299,"unitPrice":97,"discountPercent":15},{"minQuantity":300,"maxQuantity":499,"unitPrice":78,"discountPercent":32},{"minQuantity":500,"maxQuantity":999,"unitPrice":51,"discountPercent":55},{"minQuantity":1000,"maxQuantity":2999,"unitPrice":29,"discountPercent":75},{"minQuantity":3000,"maxQuantity":4999,"unitPrice":15,"discountPercent":87},{"minQuantity":5000,"maxQuantity":9999,"unitPrice":12,"discountPercent":89},{"minQuantity":10000,"maxQuantity":19999,"unitPrice":9,"discountPercent":92},{"minQuantity":20000,"maxQuantity":29999,"unitPrice":8,"discountPercent":93},{"minQuantity":30000,"maxQuantity":99999,"unitPrice":8,"discountPercent":93},{"minQuantity":100000,"maxQuantity":200000,"unitPrice":8,"discountPercent":93}]',
  options = '[{"id":"background_color","name":"背景色","type":"color","required":false,"values":[]},{"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}]}]',
  quantity_presets = '[100,200,300,500,1000,3000,5000,10000]',
  features = '["高品質印刷","安全ピン仕様","丸型","大ロット対応（最大20万個）"]'
WHERE slug = 'can-badge';

-- ============================================================
-- 3. Pin Badge — 15% price increase + new options
-- ============================================================
UPDATE public.products
SET
  is_active = TRUE,
  requires_mold = TRUE,
  mold_fee = 10000,
  lead_time_days = 30,
  express_delivery_fee = 0,
  price_tiers = '[{"minQuantity":50,"maxQuantity":100,"unitPrice":60},{"minQuantity":101,"maxQuantity":200,"unitPrice":56,"discountPercent":7},{"minQuantity":201,"maxQuantity":300,"unitPrice":55,"discountPercent":8},{"minQuantity":301,"maxQuantity":500,"unitPrice":54,"discountPercent":10},{"minQuantity":501,"maxQuantity":1000,"unitPrice":52,"discountPercent":13},{"minQuantity":1001,"maxQuantity":2000,"unitPrice":51,"discountPercent":15},{"minQuantity":2001,"maxQuantity":3000,"unitPrice":51,"discountPercent":15},{"minQuantity":3001,"maxQuantity":5000,"unitPrice":49,"discountPercent":18},{"minQuantity":5001,"maxQuantity":10000,"unitPrice":48,"discountPercent":20},{"minQuantity":10001,"maxQuantity":20000,"unitPrice":47,"discountPercent":22},{"minQuantity":20001,"maxQuantity":50000,"unitPrice":47,"discountPercent":22},{"minQuantity":50001,"maxQuantity":100000,"unitPrice":46,"discountPercent":23},{"minQuantity":100001,"maxQuantity":200000,"unitPrice":44,"discountPercent":27}]',
  options = '[{"id":"resin_coating","name":"樹脂コーティング","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"resin","label":"樹脂コーティング","priceModifier":{"type":"multiply","value":1.4}}]},{"id":"background_color","name":"背景色","type":"color","required":false,"values":[]},{"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}]}]',
  quantity_presets = '[50,100,200,500,1000,2000,5000,10000]',
  features = '["メタル素材","ソフトエナメル加工","バタフライクラッチ","個別OPP袋入り"]'
WHERE slug = 'pin-badge';

-- ============================================================
-- 4. Rubber Keychain — 15% price increase + new options
-- ============================================================
UPDATE public.products
SET
  is_active = TRUE,
  requires_mold = TRUE,
  mold_fee = 7000,
  lead_time_days = 30,
  express_delivery_fee = 0,
  price_tiers = '[{"minQuantity":50,"maxQuantity":100,"unitPrice":67},{"minQuantity":101,"maxQuantity":200,"unitPrice":64,"discountPercent":4},{"minQuantity":201,"maxQuantity":300,"unitPrice":62,"discountPercent":7},{"minQuantity":301,"maxQuantity":500,"unitPrice":60,"discountPercent":10},{"minQuantity":501,"maxQuantity":1000,"unitPrice":58,"discountPercent":13},{"minQuantity":1001,"maxQuantity":2000,"unitPrice":55,"discountPercent":18},{"minQuantity":2001,"maxQuantity":3000,"unitPrice":52,"discountPercent":22},{"minQuantity":3001,"maxQuantity":5000,"unitPrice":49,"discountPercent":27},{"minQuantity":5001,"maxQuantity":10000,"unitPrice":47,"discountPercent":30},{"minQuantity":10001,"maxQuantity":20000,"unitPrice":45,"discountPercent":33},{"minQuantity":20001,"maxQuantity":50000,"unitPrice":43,"discountPercent":36},{"minQuantity":50001,"maxQuantity":100000,"unitPrice":40,"discountPercent":40},{"minQuantity":100001,"maxQuantity":200000,"unitPrice":38,"discountPercent":43}]',
  options = '[{"id":"chain_type","name":"チェーン種類","type":"list","required":true,"values":[{"id":"ball-chain","label":"ボールチェーン"},{"id":"lobster","label":"カニカン"},{"id":"strap","label":"ストラップ"}]},{"id":"size","name":"サイズ","type":"list","required":true,"values":[{"id":"small","label":"小（40mm以下）"},{"id":"medium","label":"中（50-70mm）","priceModifier":{"type":"add","value":10}},{"id":"large","label":"大（80mm以上）","priceModifier":{"type":"add","value":25}}]},{"id":"background_color","name":"背景色","type":"color","required":false,"values":[]},{"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}]}]',
  quantity_presets = '[50,100,200,500,1000,2000,5000,10000]',
  features = '["PVC素材","立体成型","フルカラー対応","ボールチェーン付属"]'
WHERE slug = 'rubber-keychain';

-- ============================================================
-- 5. Deactivate products
-- ============================================================
UPDATE public.products SET is_active = FALSE WHERE slug = 'plush-toy';
UPDATE public.products SET is_active = FALSE WHERE slug = 'sticker';
UPDATE public.products SET is_active = FALSE WHERE slug = 'plastic-bag';
