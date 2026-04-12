-- 外枠の形（shape）オプション追加: アクリル・ピンバッジ・ラバーキーホルダー
-- 形状は金額に影響しない（priceModifier なし）
-- 金型が必要な商品は形状に関係なく金型が必要
-- 缶バッジは丸型のみ（shapeオプションなし、descriptionで明記）

-- ============================================================
-- 1. ACRYLIC KEYCHAIN: shape を index 2 に挿入（size, chain_type の後）
-- ============================================================
UPDATE products SET
  options = jsonb_insert(
    options,
    '{2}',
    '{"id":"shape","name":"外枠の形","type":"list","required":true,"values":[{"id":"die-cut","label":"型抜き（デザインに沿った形）"},{"id":"round","label":"丸型"},{"id":"rounded-rect","label":"角丸四角"}]}'::jsonb
  )
WHERE slug = 'acrylic-keychain';

-- ============================================================
-- 2. PIN BADGE: shape を index 1 に挿入（size の後）
-- ============================================================
UPDATE products SET
  options = jsonb_insert(
    options,
    '{1}',
    '{"id":"shape","name":"外枠の形","type":"list","required":true,"values":[{"id":"die-cut","label":"型抜き（デザインに沿った形）"},{"id":"round","label":"丸型"},{"id":"rounded-rect","label":"角丸四角"},{"id":"heart","label":"ハート型"},{"id":"star","label":"星型"}]}'::jsonb
  )
WHERE slug = 'pin-badge';

-- ============================================================
-- 3. RUBBER KEYCHAIN: shape を index 2 に挿入（size, chain_type の後）
-- ============================================================
UPDATE products SET
  options = jsonb_insert(
    options,
    '{2}',
    '{"id":"shape","name":"外枠の形","type":"list","required":true,"values":[{"id":"die-cut","label":"型抜き（デザインに沿った形）"},{"id":"round","label":"丸型"},{"id":"rounded-rect","label":"角丸四角"}]}'::jsonb
  )
WHERE slug = 'rubber-keychain';

-- ============================================================
-- 4. CAN BADGE: description を更新（丸型のみを明記）
-- ============================================================
UPDATE products SET
  description = 'イベントや販促に最適な丸型缶バッジ。安全ピンタイプで衣類に簡単に取り付けられます。形状は丸型のみとなります。'
WHERE slug = 'can-badge';
