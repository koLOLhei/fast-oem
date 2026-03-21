-- Products table: stores all product catalog data, editable via admin UI
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT '',
  requires_mold   BOOLEAN NOT NULL DEFAULT FALSE,
  mold_fee        INTEGER NOT NULL DEFAULT 0,
  lead_time_days  INTEGER NOT NULL DEFAULT 7,   -- business days
  min_quantity    INTEGER NOT NULL DEFAULT 1,
  max_quantity    INTEGER NOT NULL DEFAULT 10000,
  image_url       TEXT NOT NULL DEFAULT '',
  features        JSONB NOT NULL DEFAULT '[]',
  quantity_presets JSONB NOT NULL DEFAULT '[]',
  price_tiers     JSONB NOT NULL DEFAULT '[]',
  options         JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public read of active products
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = TRUE);

-- Service role has full access
CREATE POLICY "products_service_all" ON products
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_products_updated_at();

-- ============================================================
-- Seed: Acrylic Keychain
-- ============================================================
INSERT INTO products (id, slug, name, description, short_description, category, requires_mold, mold_fee, lead_time_days, min_quantity, max_quantity, image_url, features, quantity_presets, price_tiers, options)
VALUES (
  'acrylic-keychain', 'acrylic-keychain', 'アクリルキーホルダー',
  'オリジナルデザインの透明感あふれるアクリルキーホルダー。耐久性に優れ、鮮やかな発色で長持ちします。',
  '透明感のあるオリジナルキーホルダー', 'keychain', FALSE, 0, 7, 10, 1000,
  '/images/acrylic-keychain.jpg',
  '["高透明度アクリル","UVプリント","片面・両面印刷対応","ボールチェーン付属"]',
  '[10,30,50,100,200,300,500,1000]',
  '[{"minQuantity":10,"maxQuantity":29,"unitPrice":350},{"minQuantity":30,"maxQuantity":49,"unitPrice":300,"discountPercent":14},{"minQuantity":50,"maxQuantity":99,"unitPrice":260,"discountPercent":26},{"minQuantity":100,"maxQuantity":199,"unitPrice":220,"discountPercent":37},{"minQuantity":200,"maxQuantity":299,"unitPrice":190,"discountPercent":46},{"minQuantity":300,"maxQuantity":499,"unitPrice":170,"discountPercent":51},{"minQuantity":500,"maxQuantity":1000,"unitPrice":150,"discountPercent":57}]',
  '[{"id":"shape","name":"形","type":"list","values":[{"id":"die-cut","label":"型抜き"},{"id":"square","label":"四角形"},{"id":"circle","label":"円形"},{"id":"rounded","label":"角丸"},{"id":"heart","label":"ハート型"},{"id":"star","label":"星型"}]},{"id":"material","name":"素材","type":"grid","values":[{"id":"clear","label":"クリア"},{"id":"frosted","label":"フロスト","priceModifier":{"type":"add","value":20}},{"id":"glitter","label":"ラメ入り","priceModifier":{"type":"add","value":30}},{"id":"hologram","label":"ホログラム","priceModifier":{"type":"add","value":50}},{"id":"mirror","label":"ミラー","priceModifier":{"type":"add","value":40}},{"id":"color","label":"カラー","priceModifier":{"type":"add","value":10}}]},{"id":"size","name":"サイズ","type":"list","values":[{"id":"30mm","label":"30mm"},{"id":"40mm","label":"40mm","priceModifier":{"type":"add","value":10}},{"id":"50mm","label":"50mm","priceModifier":{"type":"add","value":20}},{"id":"60mm","label":"60mm","priceModifier":{"type":"add","value":35}},{"id":"70mm","label":"70mm","priceModifier":{"type":"add","value":50}},{"id":"80mm","label":"80mm","priceModifier":{"type":"add","value":65}},{"id":"90mm","label":"90mm","priceModifier":{"type":"add","value":80}},{"id":"100mm","label":"100mm","priceModifier":{"type":"add","value":100}},{"id":"120mm","label":"120mm","priceModifier":{"type":"add","value":130}},{"id":"custom","label":"サイズを指定"}]},{"id":"thickness","name":"厚さ","type":"dropdown","values":[{"id":"2mm","label":"2mm（標準）"},{"id":"3mm","label":"3mm（厚め）","priceModifier":{"type":"add","value":30}},{"id":"5mm","label":"5mm（特厚）","priceModifier":{"type":"add","value":70}}]},{"id":"finish","name":"仕上げ","type":"dropdown","values":[{"id":"glossy","label":"光沢（UVカット）"},{"id":"matte","label":"マット","priceModifier":{"type":"add","value":20}},{"id":"soft","label":"ソフトタッチ","priceModifier":{"type":"add","value":40}}]}]'
);

-- ============================================================
-- Seed: Can Badge
-- ============================================================
INSERT INTO products (id, slug, name, description, short_description, category, requires_mold, mold_fee, lead_time_days, min_quantity, max_quantity, image_url, features, quantity_presets, price_tiers, options)
VALUES (
  'can-badge', 'can-badge', '缶バッジ',
  'イベントや販促に最適な缶バッジ。安全ピンタイプで衣類に簡単に取り付けられます。',
  '定番の缶バッジでオリジナルグッズ', 'badge', FALSE, 0, 5, 30, 2000,
  '/images/can-badge.jpg',
  '["高品質印刷","安全ピン仕様","豊富なサイズ展開","短納期対応"]',
  '[30,50,100,200,300,500,1000,2000]',
  '[{"minQuantity":30,"maxQuantity":49,"unitPrice":120},{"minQuantity":50,"maxQuantity":99,"unitPrice":100,"discountPercent":17},{"minQuantity":100,"maxQuantity":199,"unitPrice":80,"discountPercent":33},{"minQuantity":200,"maxQuantity":299,"unitPrice":65,"discountPercent":46},{"minQuantity":300,"maxQuantity":499,"unitPrice":55,"discountPercent":54},{"minQuantity":500,"maxQuantity":999,"unitPrice":45,"discountPercent":63},{"minQuantity":1000,"maxQuantity":2000,"unitPrice":38,"discountPercent":68}]',
  '[{"id":"shape","name":"形","type":"list","values":[{"id":"circle","label":"円形"},{"id":"square","label":"四角形","priceModifier":{"type":"add","value":5}},{"id":"heart","label":"ハート型","priceModifier":{"type":"add","value":10}},{"id":"oval","label":"楕円形","priceModifier":{"type":"add","value":5}}]},{"id":"material","name":"素材","type":"grid","values":[{"id":"standard","label":"スタンダード"},{"id":"hologram","label":"ホログラム","priceModifier":{"type":"add","value":20}},{"id":"glitter","label":"グリッター","priceModifier":{"type":"add","value":15}},{"id":"mirror","label":"ミラー","priceModifier":{"type":"add","value":20}},{"id":"matte","label":"マット","priceModifier":{"type":"add","value":10}},{"id":"lenticular","label":"レンチキュラー","priceModifier":{"type":"multiply","value":1.5}}]},{"id":"size","name":"サイズ","type":"list","values":[{"id":"25mm","label":"25mm"},{"id":"32mm","label":"32mm","priceModifier":{"type":"add","value":5}},{"id":"38mm","label":"38mm","priceModifier":{"type":"add","value":10}},{"id":"44mm","label":"44mm","priceModifier":{"type":"add","value":15}},{"id":"50mm","label":"50mm","priceModifier":{"type":"add","value":25}},{"id":"57mm","label":"57mm","priceModifier":{"type":"add","value":35}},{"id":"65mm","label":"65mm","priceModifier":{"type":"add","value":50}},{"id":"76mm","label":"76mm","priceModifier":{"type":"add","value":70}},{"id":"100mm","label":"100mm","priceModifier":{"type":"add","value":100}},{"id":"custom","label":"サイズを指定"}]},{"id":"back","name":"裏面仕様","type":"dropdown","values":[{"id":"safety-pin","label":"安全ピン"},{"id":"magnet","label":"マグネット","priceModifier":{"type":"add","value":15}},{"id":"mirror","label":"ミラー付き","priceModifier":{"type":"add","value":20}},{"id":"bottle-opener","label":"栓抜き","priceModifier":{"type":"add","value":30}}]}]'
);

-- ============================================================
-- Seed: Pin Badge
-- ============================================================
INSERT INTO products (id, slug, name, description, short_description, category, requires_mold, mold_fee, lead_time_days, min_quantity, max_quantity, image_url, features, quantity_presets, price_tiers, options)
VALUES (
  'pin-badge', 'pin-badge', 'ピンバッジ',
  '高級感のあるメタル素材のピンバッジ。企業ノベルティやコレクターアイテムに最適です。',
  'メタル素材の高級ピンバッジ', 'badge', TRUE, 15000, 14, 30, 2000,
  '/images/pin-badge.jpg',
  '["メタル素材","ソフトエナメル加工","バタフライクラッチ","個別OPP袋入り"]',
  '[30,50,100,200,300,500,1000,2000]',
  '[{"minQuantity":30,"maxQuantity":49,"unitPrice":450},{"minQuantity":50,"maxQuantity":99,"unitPrice":380,"discountPercent":16},{"minQuantity":100,"maxQuantity":199,"unitPrice":320,"discountPercent":29},{"minQuantity":200,"maxQuantity":299,"unitPrice":280,"discountPercent":38},{"minQuantity":300,"maxQuantity":499,"unitPrice":250,"discountPercent":44},{"minQuantity":500,"maxQuantity":999,"unitPrice":220,"discountPercent":51},{"minQuantity":1000,"maxQuantity":2000,"unitPrice":190,"discountPercent":58}]',
  '[{"id":"shape","name":"形","type":"list","values":[{"id":"die-cut","label":"型抜き"},{"id":"circle","label":"円形"},{"id":"square","label":"四角形"},{"id":"shield","label":"シールド型","priceModifier":{"type":"add","value":30}},{"id":"oval","label":"楕円形"}]},{"id":"material","name":"素材・仕上げ","type":"grid","values":[{"id":"soft-enamel","label":"ソフトエナメル"},{"id":"hard-enamel","label":"ハードエナメル","priceModifier":{"type":"add","value":60}},{"id":"die-struck","label":"打ち抜き","priceModifier":{"type":"add","value":40}},{"id":"sandblast","label":"サンドブラスト","priceModifier":{"type":"add","value":50}},{"id":"offset","label":"オフセット印刷"},{"id":"epoxy","label":"エポキシコート","priceModifier":{"type":"add","value":30}}]},{"id":"size","name":"サイズ","type":"list","values":[{"id":"15mm","label":"15mm"},{"id":"20mm","label":"20mm","priceModifier":{"type":"add","value":20}},{"id":"25mm","label":"25mm","priceModifier":{"type":"add","value":40}},{"id":"30mm","label":"30mm","priceModifier":{"type":"add","value":60}},{"id":"35mm","label":"35mm","priceModifier":{"type":"add","value":80}},{"id":"40mm","label":"40mm","priceModifier":{"type":"add","value":100}},{"id":"45mm","label":"45mm","priceModifier":{"type":"add","value":120}},{"id":"50mm","label":"50mm","priceModifier":{"type":"add","value":150}},{"id":"custom","label":"サイズを指定"}]},{"id":"plating","name":"メッキ","type":"dropdown","values":[{"id":"gold","label":"ゴールド"},{"id":"silver","label":"シルバー"},{"id":"black-nickel","label":"ブラックニッケル","priceModifier":{"type":"add","value":20}},{"id":"antique-gold","label":"アンティークゴールド","priceModifier":{"type":"add","value":30}},{"id":"antique-silver","label":"アンティークシルバー","priceModifier":{"type":"add","value":30}},{"id":"copper","label":"カッパー","priceModifier":{"type":"add","value":20}}]},{"id":"back","name":"留め具","type":"dropdown","values":[{"id":"butterfly","label":"バタフライクラッチ"},{"id":"rubber","label":"ラバークラッチ","priceModifier":{"type":"add","value":10}},{"id":"deluxe","label":"デラックスクラッチ","priceModifier":{"type":"add","value":30}},{"id":"magnet","label":"マグネット","priceModifier":{"type":"add","value":50}},{"id":"safety-pin","label":"安全ピン"}]}]'
);

-- ============================================================
-- Seed: Rubber Keychain
-- ============================================================
INSERT INTO products (id, slug, name, description, short_description, category, requires_mold, mold_fee, lead_time_days, min_quantity, max_quantity, image_url, features, quantity_presets, price_tiers, options)
VALUES (
  'rubber-keychain', 'rubber-keychain', 'ラバーキーホルダー',
  '柔らかいPVC素材のラバーキーホルダー。立体的なデザインで存在感抜群です。',
  '柔らかいPVC素材のキーホルダー', 'keychain', TRUE, 8000, 10, 30, 2000,
  '/images/rubber-keychain.jpg',
  '["PVC素材","立体成型","フルカラー対応","ナスカン付属"]',
  '[30,50,100,200,300,500,1000,2000]',
  '[{"minQuantity":30,"maxQuantity":49,"unitPrice":380},{"minQuantity":50,"maxQuantity":99,"unitPrice":320,"discountPercent":16},{"minQuantity":100,"maxQuantity":199,"unitPrice":280,"discountPercent":26},{"minQuantity":200,"maxQuantity":299,"unitPrice":250,"discountPercent":34},{"minQuantity":300,"maxQuantity":499,"unitPrice":220,"discountPercent":42},{"minQuantity":500,"maxQuantity":999,"unitPrice":190,"discountPercent":50},{"minQuantity":1000,"maxQuantity":2000,"unitPrice":160,"discountPercent":58}]',
  '[{"id":"shape","name":"形","type":"list","values":[{"id":"die-cut","label":"型抜き"},{"id":"circle","label":"円形"},{"id":"square","label":"四角形"},{"id":"rounded","label":"角丸"}]},{"id":"type","name":"タイプ","type":"grid","values":[{"id":"single-3d","label":"片面立体"},{"id":"double-3d","label":"両面立体","priceModifier":{"type":"add","value":80}},{"id":"flat","label":"フラット"},{"id":"glow","label":"蓄光","priceModifier":{"type":"add","value":50}},{"id":"color-fill","label":"カラー充填","priceModifier":{"type":"add","value":40}},{"id":"photo","label":"写真印刷","priceModifier":{"type":"add","value":60}}]},{"id":"size","name":"サイズ","type":"list","values":[{"id":"30mm","label":"30mm"},{"id":"40mm","label":"40mm","priceModifier":{"type":"add","value":20}},{"id":"50mm","label":"50mm","priceModifier":{"type":"add","value":40}},{"id":"60mm","label":"60mm","priceModifier":{"type":"add","value":60}},{"id":"70mm","label":"70mm","priceModifier":{"type":"add","value":80}},{"id":"80mm","label":"80mm","priceModifier":{"type":"add","value":100}},{"id":"90mm","label":"90mm","priceModifier":{"type":"add","value":130}},{"id":"100mm","label":"100mm","priceModifier":{"type":"add","value":160}},{"id":"custom","label":"サイズを指定"}]},{"id":"thickness","name":"厚さ","type":"dropdown","values":[{"id":"3mm","label":"3mm（標準）"},{"id":"4mm","label":"4mm","priceModifier":{"type":"add","value":20}},{"id":"5mm","label":"5mm（厚め）","priceModifier":{"type":"add","value":50}}]},{"id":"attachment","name":"パーツ","type":"dropdown","values":[{"id":"ball-chain","label":"ボールチェーン"},{"id":"lobster","label":"ナスカン","priceModifier":{"type":"add","value":10}},{"id":"key-ring","label":"キーリング","priceModifier":{"type":"add","value":5}},{"id":"strap","label":"ストラップ","priceModifier":{"type":"add","value":15}}]}]'
);

-- ============================================================
-- Seed: Plastic Bag
-- ============================================================
INSERT INTO products (id, slug, name, description, short_description, category, requires_mold, mold_fee, lead_time_days, min_quantity, max_quantity, image_url, features, quantity_presets, price_tiers, options)
VALUES (
  'plastic-bag', 'plastic-bag', 'レジ袋',
  '店舗やイベントで使えるオリジナルレジ袋。環境に配慮した素材も選択可能です。',
  'オリジナルデザインのレジ袋', 'packaging', FALSE, 0, 14, 500, 30000,
  '/images/plastic-bag.jpg',
  '["1色印刷","フルカラー印刷対応","バイオマス素材選択可","大ロット対応"]',
  '[500,1000,2000,3000,5000,10000,20000,30000]',
  '[{"minQuantity":500,"maxQuantity":999,"unitPrice":25},{"minQuantity":1000,"maxQuantity":1999,"unitPrice":20,"discountPercent":20},{"minQuantity":2000,"maxQuantity":2999,"unitPrice":15,"discountPercent":40},{"minQuantity":3000,"maxQuantity":4999,"unitPrice":12,"discountPercent":52},{"minQuantity":5000,"maxQuantity":9999,"unitPrice":9,"discountPercent":64},{"minQuantity":10000,"maxQuantity":30000,"unitPrice":7,"discountPercent":72}]',
  '[{"id":"type","name":"タイプ","type":"list","values":[{"id":"standard","label":"スタンダード"},{"id":"heavy-duty","label":"厚手タイプ","priceModifier":{"type":"add","value":3}},{"id":"soft","label":"ソフトタイプ","priceModifier":{"type":"add","value":2}}]},{"id":"material","name":"素材","type":"grid","values":[{"id":"pe","label":"PE（ポリエチレン）"},{"id":"hdpe","label":"HDPE（高密度）"},{"id":"ldpe","label":"LDPE（低密度）","priceModifier":{"type":"add","value":1}},{"id":"bio","label":"バイオマス25%","priceModifier":{"type":"add","value":3}},{"id":"bio50","label":"バイオマス50%","priceModifier":{"type":"add","value":5}},{"id":"recycle","label":"リサイクル素材","priceModifier":{"type":"add","value":2}}]},{"id":"size","name":"サイズ","type":"list","values":[{"id":"ss","label":"SS（18×35cm）"},{"id":"s","label":"S（25×40cm）","priceModifier":{"type":"add","value":2}},{"id":"m","label":"M（30×45cm）","priceModifier":{"type":"add","value":4}},{"id":"l","label":"L（35×50cm）","priceModifier":{"type":"add","value":6}},{"id":"xl","label":"XL（40×55cm）","priceModifier":{"type":"add","value":9}},{"id":"2l","label":"2L（45×60cm）","priceModifier":{"type":"add","value":12}},{"id":"3l","label":"3L（50×65cm）","priceModifier":{"type":"add","value":16}},{"id":"custom","label":"サイズを指定"}]},{"id":"print","name":"印刷","type":"dropdown","values":[{"id":"1-color","label":"1色印刷"},{"id":"2-color","label":"2色印刷","priceModifier":{"type":"add","value":2}},{"id":"full-color","label":"フルカラー印刷","priceModifier":{"type":"multiply","value":1.3}}]},{"id":"handle","name":"持ち手","type":"dropdown","values":[{"id":"standard","label":"標準タイプ"},{"id":"loop","label":"ループハンドル","priceModifier":{"type":"add","value":1}},{"id":"soft","label":"ソフトハンドル","priceModifier":{"type":"add","value":2}}]}]'
);
