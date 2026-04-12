-- 全商品の価格改定: USD原価 × 160円 × 1.5（50%マークアップ）= 税込売価
-- 全商品にサイズオプション追加（サイズ別価格）

-- ============================================================
-- 1. ACRYLIC KEYCHAIN (base: 50mm)
-- ============================================================
UPDATE products SET
  price_tiers = '[
    {"minQuantity":50,"maxQuantity":100,"unitPrice":77},
    {"minQuantity":101,"maxQuantity":200,"unitPrice":74,"discountPercent":4},
    {"minQuantity":201,"maxQuantity":300,"unitPrice":72,"discountPercent":6},
    {"minQuantity":301,"maxQuantity":500,"unitPrice":70,"discountPercent":9},
    {"minQuantity":501,"maxQuantity":1000,"unitPrice":67,"discountPercent":13},
    {"minQuantity":1001,"maxQuantity":2000,"unitPrice":65,"discountPercent":16},
    {"minQuantity":2001,"maxQuantity":3000,"unitPrice":62,"discountPercent":19},
    {"minQuantity":3001,"maxQuantity":5000,"unitPrice":60,"discountPercent":22},
    {"minQuantity":5001,"maxQuantity":10000,"unitPrice":58,"discountPercent":25},
    {"minQuantity":10001,"maxQuantity":20000,"unitPrice":55,"discountPercent":29},
    {"minQuantity":20001,"maxQuantity":50000,"unitPrice":53,"discountPercent":31},
    {"minQuantity":50001,"maxQuantity":100000,"unitPrice":50,"discountPercent":35},
    {"minQuantity":100001,"maxQuantity":200000,"unitPrice":48,"discountPercent":38}
  ]'::jsonb,
  options = '[
    {"id":"size","name":"サイズ","type":"list","required":true,"values":[
      {"id":"40mm","label":"40mm","priceModifier":{"type":"add","value":-2}},
      {"id":"50mm","label":"50mm"},
      {"id":"60mm","label":"60mm","priceModifier":{"type":"add","value":2}},
      {"id":"70mm","label":"70mm","priceModifier":{"type":"add","value":5}},
      {"id":"80mm","label":"80mm","priceModifier":{"type":"add","value":7}},
      {"id":"100mm","label":"100mm","priceModifier":{"type":"add","value":17}}
    ]},
    {"id":"chain_type","name":"チェーン種類","type":"list","required":true,"values":[
      {"id":"ball-chain","label":"ボールチェーン"},
      {"id":"lobster","label":"カニカン"}
    ]},
    {"id":"white_back","name":"ホワイト（白バック）","type":"list","required":false,"values":[
      {"id":"none","label":"なし"},
      {"id":"white","label":"ホワイト挿入","priceModifier":{"type":"multiply","value":1.2}}
    ]},
    {"id":"double_sided","name":"両面印刷","type":"list","required":false,"values":[
      {"id":"none","label":"片面のみ"},
      {"id":"double","label":"両面印刷","priceModifier":{"type":"multiply","value":1.6}}
    ]},
    {"id":"second_design","name":"裏面デザイン","type":"list","required":false,"parentId":"double_sided","showWhen":["double"],"values":[
      {"id":"same","label":"表面と同じ"},
      {"id":"different","label":"別のデザインを入稿"}
    ]},
    {"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[
      {"id":"none","label":"なし"},
      {"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}
    ]}
  ]'::jsonb,
  max_quantity = 200000
WHERE slug = 'acrylic-keychain';

-- ============================================================
-- 2. CAN BADGE / TIN BADGE (base: 44mm)
-- ============================================================
UPDATE products SET
  price_tiers = '[
    {"minQuantity":100,"maxQuantity":199,"unitPrice":119},
    {"minQuantity":200,"maxQuantity":299,"unitPrice":101,"discountPercent":15},
    {"minQuantity":300,"maxQuantity":499,"unitPrice":83,"discountPercent":30},
    {"minQuantity":500,"maxQuantity":999,"unitPrice":55,"discountPercent":54},
    {"minQuantity":1000,"maxQuantity":2999,"unitPrice":33,"discountPercent":72},
    {"minQuantity":3000,"maxQuantity":4999,"unitPrice":19,"discountPercent":84},
    {"minQuantity":5000,"maxQuantity":9999,"unitPrice":16,"discountPercent":87},
    {"minQuantity":10000,"maxQuantity":19999,"unitPrice":14,"discountPercent":88},
    {"minQuantity":20000,"maxQuantity":29999,"unitPrice":13,"discountPercent":89},
    {"minQuantity":30000,"maxQuantity":99999,"unitPrice":12,"discountPercent":90},
    {"minQuantity":100000,"maxQuantity":200000,"unitPrice":12,"discountPercent":90}
  ]'::jsonb,
  options = '[
    {"id":"size","name":"サイズ","type":"list","required":true,"values":[
      {"id":"25mm","label":"25mm","priceModifier":{"type":"add","value":-4}},
      {"id":"32mm","label":"32mm","priceModifier":{"type":"add","value":-3}},
      {"id":"44mm","label":"44mm"},
      {"id":"55mm","label":"55mm","priceModifier":{"type":"add","value":2}},
      {"id":"75mm","label":"75mm","priceModifier":{"type":"add","value":8}}
    ]},
    {"id":"background_color","name":"背景色","type":"color","required":false,"values":[]},
    {"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[
      {"id":"none","label":"なし"},
      {"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}
    ]}
  ]'::jsonb
WHERE slug = 'can-badge';

-- ============================================================
-- 3. PIN BADGE (base: 40mm)
-- ============================================================
UPDATE products SET
  price_tiers = '[
    {"minQuantity":50,"maxQuantity":100,"unitPrice":108},
    {"minQuantity":101,"maxQuantity":200,"unitPrice":104,"discountPercent":4},
    {"minQuantity":201,"maxQuantity":300,"unitPrice":103,"discountPercent":5},
    {"minQuantity":301,"maxQuantity":500,"unitPrice":102,"discountPercent":6},
    {"minQuantity":501,"maxQuantity":1000,"unitPrice":101,"discountPercent":6},
    {"minQuantity":1001,"maxQuantity":2000,"unitPrice":100,"discountPercent":7},
    {"minQuantity":2001,"maxQuantity":3000,"unitPrice":99,"discountPercent":8},
    {"minQuantity":3001,"maxQuantity":5000,"unitPrice":98,"discountPercent":9},
    {"minQuantity":5001,"maxQuantity":10000,"unitPrice":97,"discountPercent":10},
    {"minQuantity":10001,"maxQuantity":20000,"unitPrice":96,"discountPercent":11},
    {"minQuantity":20001,"maxQuantity":50000,"unitPrice":96,"discountPercent":11},
    {"minQuantity":50001,"maxQuantity":100000,"unitPrice":94,"discountPercent":13},
    {"minQuantity":100001,"maxQuantity":200000,"unitPrice":93,"discountPercent":14}
  ]'::jsonb,
  options = '[
    {"id":"size","name":"サイズ","type":"list","required":true,"values":[
      {"id":"20mm","label":"20mm","priceModifier":{"type":"add","value":-48}},
      {"id":"30mm","label":"30mm","priceModifier":{"type":"add","value":-24}},
      {"id":"40mm","label":"40mm"},
      {"id":"50mm","label":"50mm","priceModifier":{"type":"add","value":24}},
      {"id":"60mm","label":"60mm","priceModifier":{"type":"add","value":48}},
      {"id":"70mm","label":"70mm","priceModifier":{"type":"add","value":72}},
      {"id":"80mm","label":"80mm","priceModifier":{"type":"add","value":96}}
    ]},
    {"id":"resin_coating","name":"樹脂コーティング","type":"list","required":false,"values":[
      {"id":"none","label":"なし"},
      {"id":"resin","label":"樹脂コーティング","priceModifier":{"type":"multiply","value":1.4}}
    ]},
    {"id":"background_color","name":"背景色","type":"color","required":false,"values":[]},
    {"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[
      {"id":"none","label":"なし"},
      {"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}
    ]}
  ]'::jsonb,
  max_quantity = 200000
WHERE slug = 'pin-badge';

-- ============================================================
-- 4. PVC / RUBBER KEYCHAIN (base: 50mm)
-- ============================================================
UPDATE products SET
  price_tiers = '[
    {"minQuantity":50,"maxQuantity":100,"unitPrice":74},
    {"minQuantity":101,"maxQuantity":200,"unitPrice":72,"discountPercent":3},
    {"minQuantity":201,"maxQuantity":300,"unitPrice":70,"discountPercent":5},
    {"minQuantity":301,"maxQuantity":500,"unitPrice":67,"discountPercent":9},
    {"minQuantity":501,"maxQuantity":1000,"unitPrice":65,"discountPercent":12},
    {"minQuantity":1001,"maxQuantity":2000,"unitPrice":62,"discountPercent":16},
    {"minQuantity":2001,"maxQuantity":3000,"unitPrice":60,"discountPercent":19},
    {"minQuantity":3001,"maxQuantity":5000,"unitPrice":58,"discountPercent":22},
    {"minQuantity":5001,"maxQuantity":10000,"unitPrice":55,"discountPercent":26},
    {"minQuantity":10001,"maxQuantity":20000,"unitPrice":53,"discountPercent":28},
    {"minQuantity":20001,"maxQuantity":50000,"unitPrice":50,"discountPercent":32},
    {"minQuantity":50001,"maxQuantity":100000,"unitPrice":48,"discountPercent":35},
    {"minQuantity":100001,"maxQuantity":200000,"unitPrice":46,"discountPercent":38}
  ]'::jsonb,
  options = '[
    {"id":"size","name":"サイズ","type":"list","required":true,"values":[
      {"id":"40mm","label":"40mm","priceModifier":{"type":"add","value":-2}},
      {"id":"50mm","label":"50mm"},
      {"id":"60mm","label":"60mm","priceModifier":{"type":"add","value":2}},
      {"id":"70mm","label":"70mm","priceModifier":{"type":"add","value":5}},
      {"id":"80mm","label":"80mm","priceModifier":{"type":"add","value":7}},
      {"id":"100mm","label":"100mm","priceModifier":{"type":"add","value":17}}
    ]},
    {"id":"chain_type","name":"チェーン種類","type":"list","required":true,"values":[
      {"id":"ball-chain","label":"ボールチェーン"},
      {"id":"lobster","label":"カニカン"},
      {"id":"strap","label":"ストラップ"}
    ]},
    {"id":"background_color","name":"背景色","type":"color","required":false,"values":[]},
    {"id":"pp_bag","name":"PP袋（個別包装）","type":"list","required":false,"values":[
      {"id":"none","label":"なし"},
      {"id":"pp_bag","label":"PP袋","priceModifier":{"type":"add","value":7}}
    ]}
  ]'::jsonb,
  max_quantity = 200000
WHERE slug = 'rubber-keychain';
