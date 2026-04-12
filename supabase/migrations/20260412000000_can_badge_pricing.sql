-- Update all product pricing based on KD factory price table
-- Factory cost × 1.3 markup, USD→JPY @159
-- Base prices use smallest size column; size modifiers are constant additive offsets

-- ============================================================
-- Acrylic Keychain (Sheet: Acrylic keychain 1, base=20mm)
-- ============================================================
UPDATE public.products
SET
  price_tiers = '[{"minQuantity":50,"maxQuantity":100,"unitPrice":60},{"minQuantity":101,"maxQuantity":200,"unitPrice":58,"discountPercent":3},{"minQuantity":201,"maxQuantity":300,"unitPrice":56,"discountPercent":7},{"minQuantity":301,"maxQuantity":500,"unitPrice":54,"discountPercent":10},{"minQuantity":501,"maxQuantity":1000,"unitPrice":52,"discountPercent":13},{"minQuantity":1001,"maxQuantity":2000,"unitPrice":50,"discountPercent":17},{"minQuantity":2001,"maxQuantity":3000,"unitPrice":48,"discountPercent":20},{"minQuantity":3001,"maxQuantity":5000,"unitPrice":45,"discountPercent":25},{"minQuantity":5001,"maxQuantity":10000,"unitPrice":43,"discountPercent":28},{"minQuantity":10001,"maxQuantity":20000,"unitPrice":41,"discountPercent":32},{"minQuantity":20001,"maxQuantity":50000,"unitPrice":39,"discountPercent":35},{"minQuantity":50001,"maxQuantity":100000,"unitPrice":37,"discountPercent":38},{"minQuantity":100001,"maxQuantity":200000,"unitPrice":35,"discountPercent":42}]',
  options = jsonb_set(
    options,
    '{2,values}',
    '[{"id":"20mm","label":"20mm"},{"id":"30mm","label":"30mm","priceModifier":{"type":"add","value":2}},{"id":"40mm","label":"40mm","priceModifier":{"type":"add","value":4}},{"id":"50mm","label":"50mm","priceModifier":{"type":"add","value":6}},{"id":"60mm","label":"60mm","priceModifier":{"type":"add","value":8}},{"id":"70mm","label":"70mm","priceModifier":{"type":"add","value":10}},{"id":"80mm","label":"80mm","priceModifier":{"type":"add","value":12}},{"id":"90mm","label":"90mm","priceModifier":{"type":"add","value":17}},{"id":"100mm","label":"100mm","priceModifier":{"type":"add","value":21}},{"id":"110mm","label":"110mm","priceModifier":{"type":"add","value":22}},{"id":"120mm","label":"120mm","priceModifier":{"type":"add","value":29}},{"id":"custom","label":"サイズを指定"}]'
  )
WHERE slug = 'acrylic-keychain';

-- ============================================================
-- Can Badge (Sheet: Tin badge, base=25mm, sizes up to 80mm)
-- ============================================================
UPDATE public.products
SET
  min_quantity = 100,
  max_quantity = 200000,
  features = '["高品質印刷","安全ピン仕様","14サイズ展開（25mm〜80mm）","大ロット対応（最大20万個）"]',
  quantity_presets = '[100,200,300,500,1000,3000,5000,10000,20000,30000,100000]',
  price_tiers = '[{"minQuantity":100,"maxQuantity":199,"unitPrice":99},{"minQuantity":200,"maxQuantity":299,"unitPrice":84,"discountPercent":15},{"minQuantity":300,"maxQuantity":499,"unitPrice":68,"discountPercent":31},{"minQuantity":500,"maxQuantity":999,"unitPrice":44,"discountPercent":56},{"minQuantity":1000,"maxQuantity":2999,"unitPrice":25,"discountPercent":75},{"minQuantity":3000,"maxQuantity":4999,"unitPrice":13,"discountPercent":87},{"minQuantity":5000,"maxQuantity":9999,"unitPrice":10,"discountPercent":90},{"minQuantity":10000,"maxQuantity":19999,"unitPrice":8,"discountPercent":92},{"minQuantity":20000,"maxQuantity":29999,"unitPrice":7,"discountPercent":93},{"minQuantity":30000,"maxQuantity":99999,"unitPrice":7,"discountPercent":93},{"minQuantity":100000,"maxQuantity":200000,"unitPrice":7,"discountPercent":93}]',
  options = '[{"id":"size","name":"サイズ","type":"list","required":true,"values":[{"id":"25mm","label":"25mm"},{"id":"30mm","label":"30mm","priceModifier":{"type":"add","value":1}},{"id":"32mm","label":"32mm","priceModifier":{"type":"add","value":1}},{"id":"35mm","label":"35mm","priceModifier":{"type":"add","value":2}},{"id":"38mm","label":"38mm","priceModifier":{"type":"add","value":3}},{"id":"40mm","label":"40mm","priceModifier":{"type":"add","value":3}},{"id":"44mm","label":"44mm","priceModifier":{"type":"add","value":4}},{"id":"50mm","label":"50mm","priceModifier":{"type":"add","value":5}},{"id":"55mm","label":"55mm","priceModifier":{"type":"add","value":6}},{"id":"58mm","label":"58mm","priceModifier":{"type":"add","value":6}},{"id":"65mm","label":"65mm","priceModifier":{"type":"add","value":7}},{"id":"70mm","label":"70mm","priceModifier":{"type":"add","value":8}},{"id":"75mm","label":"75mm","priceModifier":{"type":"add","value":11}},{"id":"80mm","label":"80mm","priceModifier":{"type":"add","value":17}}]},{"id":"back","name":"裏面仕様","type":"dropdown","values":[{"id":"safety-pin","label":"安全ピン"},{"id":"magnet","label":"マグネット","priceModifier":{"type":"add","value":15}},{"id":"mirror","label":"ミラー付き","priceModifier":{"type":"add","value":20}},{"id":"bottle-opener","label":"栓抜き","priceModifier":{"type":"add","value":30}}]},{"id":"packaging","name":"パッケージ","type":"list","values":[{"id":"opp","label":"OPP袋（標準）"},{"id":"individual-bag","label":"個別袋","priceModifier":{"type":"add","value":10}},{"id":"header-card","label":"ヘッダーカード付き","priceModifier":{"type":"add","value":20},"shippingModifier":{"type":"add","value":100}}]}]'
WHERE slug = 'can-badge';

-- ============================================================
-- Pin Badge (Sheet: Pin badge, base=20mm, sizes up to 80mm)
-- ============================================================
UPDATE public.products
SET
  price_tiers = '[{"minQuantity":50,"maxQuantity":100,"unitPrice":52},{"minQuantity":101,"maxQuantity":200,"unitPrice":49,"discountPercent":6},{"minQuantity":201,"maxQuantity":300,"unitPrice":48,"discountPercent":8},{"minQuantity":301,"maxQuantity":500,"unitPrice":47,"discountPercent":10},{"minQuantity":501,"maxQuantity":1000,"unitPrice":45,"discountPercent":13},{"minQuantity":1001,"maxQuantity":2000,"unitPrice":44,"discountPercent":15},{"minQuantity":2001,"maxQuantity":3000,"unitPrice":44,"discountPercent":15},{"minQuantity":3001,"maxQuantity":5000,"unitPrice":43,"discountPercent":17},{"minQuantity":5001,"maxQuantity":10000,"unitPrice":42,"discountPercent":19},{"minQuantity":10001,"maxQuantity":20000,"unitPrice":41,"discountPercent":21},{"minQuantity":20001,"maxQuantity":50000,"unitPrice":41,"discountPercent":21},{"minQuantity":50001,"maxQuantity":100000,"unitPrice":40,"discountPercent":23},{"minQuantity":100001,"maxQuantity":200000,"unitPrice":38,"discountPercent":27}]',
  options = jsonb_set(
    options,
    '{2,values}',
    '[{"id":"20mm","label":"20mm"},{"id":"30mm","label":"30mm","priceModifier":{"type":"add","value":21}},{"id":"40mm","label":"40mm","priceModifier":{"type":"add","value":41}},{"id":"50mm","label":"50mm","priceModifier":{"type":"add","value":62}},{"id":"60mm","label":"60mm","priceModifier":{"type":"add","value":83}},{"id":"70mm","label":"70mm","priceModifier":{"type":"add","value":103}},{"id":"80mm","label":"80mm","priceModifier":{"type":"add","value":124}},{"id":"custom","label":"サイズを指定"}]'
  )
WHERE slug = 'pin-badge';

-- ============================================================
-- Rubber Keychain / PVC (Sheet: PVC keychain, base=20mm)
-- ============================================================
UPDATE public.products
SET
  price_tiers = '[{"minQuantity":50,"maxQuantity":100,"unitPrice":58},{"minQuantity":101,"maxQuantity":200,"unitPrice":56,"discountPercent":3},{"minQuantity":201,"maxQuantity":300,"unitPrice":54,"discountPercent":7},{"minQuantity":301,"maxQuantity":500,"unitPrice":52,"discountPercent":10},{"minQuantity":501,"maxQuantity":1000,"unitPrice":50,"discountPercent":14},{"minQuantity":1001,"maxQuantity":2000,"unitPrice":48,"discountPercent":17},{"minQuantity":2001,"maxQuantity":3000,"unitPrice":45,"discountPercent":22},{"minQuantity":3001,"maxQuantity":5000,"unitPrice":43,"discountPercent":26},{"minQuantity":5001,"maxQuantity":10000,"unitPrice":41,"discountPercent":29},{"minQuantity":10001,"maxQuantity":20000,"unitPrice":39,"discountPercent":33},{"minQuantity":20001,"maxQuantity":50000,"unitPrice":37,"discountPercent":36},{"minQuantity":50001,"maxQuantity":100000,"unitPrice":35,"discountPercent":40},{"minQuantity":100001,"maxQuantity":200000,"unitPrice":33,"discountPercent":43}]',
  options = jsonb_set(
    options,
    '{2,values}',
    '[{"id":"20mm","label":"20mm"},{"id":"30mm","label":"30mm","priceModifier":{"type":"add","value":2}},{"id":"40mm","label":"40mm","priceModifier":{"type":"add","value":4}},{"id":"50mm","label":"50mm","priceModifier":{"type":"add","value":6}},{"id":"60mm","label":"60mm","priceModifier":{"type":"add","value":8}},{"id":"70mm","label":"70mm","priceModifier":{"type":"add","value":10}},{"id":"80mm","label":"80mm","priceModifier":{"type":"add","value":12}},{"id":"90mm","label":"90mm","priceModifier":{"type":"add","value":17}},{"id":"100mm","label":"100mm","priceModifier":{"type":"add","value":21}},{"id":"110mm","label":"110mm","priceModifier":{"type":"add","value":25}},{"id":"120mm","label":"120mm","priceModifier":{"type":"add","value":29}},{"id":"custom","label":"サイズを指定"}]'
  )
WHERE slug = 'rubber-keychain';
