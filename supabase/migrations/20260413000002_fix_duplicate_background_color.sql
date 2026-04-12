-- ============================================================
-- 2026-04-13: Fix duplicate background_color options
-- The previous migration (20260413000001) incorrectly added a second
-- background_color when the original migration already included it.
-- ============================================================

-- Can Badge: [background_color, pp_bag]
UPDATE public.products
SET options = '[{"id":"background_color","name":"背景色","type":"color","required":false,"values":[]},{"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}]}]'
WHERE slug = 'can-badge';

-- Pin Badge: [resin_coating, background_color, pp_bag]
UPDATE public.products
SET options = '[{"id":"resin_coating","name":"樹脂コーティング","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"resin","label":"樹脂コーティング","priceModifier":{"type":"multiply","value":1.4}}]},{"id":"background_color","name":"背景色","type":"color","required":false,"values":[]},{"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}]}]'
WHERE slug = 'pin-badge';

-- Rubber Keychain: [chain_type, size, background_color, pp_bag]
UPDATE public.products
SET options = '[{"id":"chain_type","name":"チェーン種類","type":"list","required":true,"values":[{"id":"ball-chain","label":"ボールチェーン"},{"id":"lobster","label":"カニカン"},{"id":"strap","label":"ストラップ"}]},{"id":"size","name":"サイズ","type":"list","required":true,"values":[{"id":"small","label":"小（30mm）"},{"id":"medium","label":"中（50mm）","priceModifier":{"type":"add","value":5}},{"id":"large","label":"大（70mm）","priceModifier":{"type":"add","value":10}}]},{"id":"background_color","name":"背景色","type":"color","required":false,"values":[]},{"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[{"id":"none","label":"なし"},{"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}]}]'
WHERE slug = 'rubber-keychain';
