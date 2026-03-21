export interface PriceTier {
  minQuantity: number
  maxQuantity: number
  unitPrice: number
  discountPercent?: number
}

export interface PriceModifier {
  type: 'add' | 'multiply'
  value: number // 'add': extra yen per unit, 'multiply': multiplier (e.g. 1.2 = +20%)
}

export interface OptionValue {
  id: string
  label: string
  icon?: string
  imageUrl?: string
  priceModifier?: PriceModifier
}

export interface ProductOption {
  id: string
  name: string
  values: OptionValue[]
  type: 'list' | 'grid' | 'dropdown'
}

export interface Product {
  id: string
  slug: string
  name: string
  description: string
  shortDescription: string
  category: string
  priceTiers: PriceTier[]
  options: ProductOption[]
  minQuantity: number
  maxQuantity: number
  imageUrl: string
  features: string[]
  quantityPresets: number[]
  requiresMold?: boolean
  moldFee?: number              // one-time mold creation fee in JPY
  leadTimeDays?: number         // standard lead time in business days (14–30)
  expressDeliveryFee?: number   // flat fee for 10-day express delivery (0 = unavailable)
  notificationEmail?: string    // factory order email; falls back to FACTORY_DEFAULT_EMAIL if empty
  defaultFactoryId?: string     // auto-assign order_items to this factory on checkout
}

export const PRODUCTS: Product[] = [
  {
    id: 'acrylic-keychain',
    slug: 'acrylic-keychain',
    name: 'アクリルキーホルダー',
    description: 'オリジナルデザインの透明感あふれるアクリルキーホルダー。耐久性に優れ、鮮やかな発色で長持ちします。',
    shortDescription: '透明感のあるオリジナルキーホルダー',
    category: 'keychain',
    requiresMold: false,
    priceTiers: [
      { minQuantity: 50, maxQuantity: 100, unitPrice: 73 },
      { minQuantity: 101, maxQuantity: 200, unitPrice: 70, discountPercent: 4 },
      { minQuantity: 201, maxQuantity: 300, unitPrice: 68, discountPercent: 7 },
      { minQuantity: 301, maxQuantity: 500, unitPrice: 65, discountPercent: 11 },
      { minQuantity: 501, maxQuantity: 1000, unitPrice: 63, discountPercent: 14 },
      { minQuantity: 1001, maxQuantity: 2000, unitPrice: 60, discountPercent: 18 },
      { minQuantity: 2001, maxQuantity: 3000, unitPrice: 57, discountPercent: 22 },
      { minQuantity: 3001, maxQuantity: 5000, unitPrice: 55, discountPercent: 25 },
      { minQuantity: 5001, maxQuantity: 10000, unitPrice: 52, discountPercent: 29 },
      { minQuantity: 10001, maxQuantity: 20000, unitPrice: 50, discountPercent: 32 },
      { minQuantity: 20001, maxQuantity: 50000, unitPrice: 48, discountPercent: 34 },
      { minQuantity: 50001, maxQuantity: 100000, unitPrice: 45, discountPercent: 38 },
      { minQuantity: 100001, maxQuantity: 999999, unitPrice: 43, discountPercent: 41 },
    ],
    options: [
      {
        id: 'shape',
        name: '形',
        type: 'list',
        values: [
          { id: 'die-cut', label: '型抜き' },
          { id: 'square', label: '四角形' },
          { id: 'circle', label: '円形' },
          { id: 'rounded', label: '角丸' },
          { id: 'heart', label: 'ハート型' },
          { id: 'star', label: '星型' },
        ],
      },
      {
        id: 'material',
        name: '素材',
        type: 'grid',
        values: [
          { id: 'clear', label: 'クリア' },
          { id: 'frosted', label: 'フロスト', priceModifier: { type: 'add', value: 20 } },
          { id: 'glitter', label: 'ラメ入り', priceModifier: { type: 'add', value: 30 } },
          { id: 'hologram', label: 'ホログラム', priceModifier: { type: 'add', value: 50 } },
          { id: 'mirror', label: 'ミラー', priceModifier: { type: 'add', value: 40 } },
          { id: 'color', label: 'カラー', priceModifier: { type: 'add', value: 10 } },
        ],
      },
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        values: [
          { id: '20mm', label: '20mm' },
          { id: '30mm', label: '30mm', priceModifier: { type: 'add', value: 2 } },
          { id: '40mm', label: '40mm', priceModifier: { type: 'add', value: 5 } },
          { id: '50mm', label: '50mm', priceModifier: { type: 'add', value: 7 } },
          { id: '60mm', label: '60mm', priceModifier: { type: 'add', value: 10 } },
          { id: '70mm', label: '70mm', priceModifier: { type: 'add', value: 12 } },
          { id: '80mm', label: '80mm', priceModifier: { type: 'add', value: 15 } },
          { id: '90mm', label: '90mm', priceModifier: { type: 'add', value: 20 } },
          { id: '100mm', label: '100mm', priceModifier: { type: 'add', value: 25 } },
          { id: '110mm', label: '110mm', priceModifier: { type: 'add', value: 30 } },
          { id: '120mm', label: '120mm', priceModifier: { type: 'add', value: 35 } },
          { id: 'custom', label: 'サイズを指定' },
        ],
      },
      {
        id: 'thickness',
        name: '厚さ',
        type: 'dropdown',
        values: [
          { id: '2mm', label: '2mm（標準）' },
          { id: '3mm', label: '3mm（厚め）', priceModifier: { type: 'add', value: 30 } },
          { id: '5mm', label: '5mm（特厚）', priceModifier: { type: 'add', value: 70 } },
        ],
      },
      {
        id: 'finish',
        name: '仕上げ',
        type: 'dropdown',
        values: [
          { id: 'glossy', label: '光沢（UVカット）' },
          { id: 'matte', label: 'マット', priceModifier: { type: 'add', value: 20 } },
          { id: 'soft', label: 'ソフトタッチ', priceModifier: { type: 'add', value: 40 } },
        ],
      },
    ],
    minQuantity: 50,
    maxQuantity: 100000,
    imageUrl: '/images/acrylic-keychain.jpg',
    features: ['高透明度アクリル', 'UVプリント', '片面・両面印刷対応', 'ボールチェーン付属'],
    quantityPresets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
    expressDeliveryFee: 3000,
  },
  {
    id: 'can-badge',
    slug: 'can-badge',
    name: '缶バッジ',
    description: 'イベントや販促に最適な缶バッジ。安全ピンタイプで衣類に簡単に取り付けられます。',
    shortDescription: '定番の缶バッジでオリジナルグッズ',
    category: 'badge',
    priceTiers: [
      { minQuantity: 30, maxQuantity: 49, unitPrice: 120 },
      { minQuantity: 50, maxQuantity: 99, unitPrice: 100, discountPercent: 17 },
      { minQuantity: 100, maxQuantity: 199, unitPrice: 80, discountPercent: 33 },
      { minQuantity: 200, maxQuantity: 299, unitPrice: 65, discountPercent: 46 },
      { minQuantity: 300, maxQuantity: 499, unitPrice: 55, discountPercent: 54 },
      { minQuantity: 500, maxQuantity: 999, unitPrice: 45, discountPercent: 63 },
      { minQuantity: 1000, maxQuantity: 2000, unitPrice: 38, discountPercent: 68 },
    ],
    options: [
      {
        id: 'shape',
        name: '形',
        type: 'list',
        values: [
          { id: 'circle', label: '円形' },
          { id: 'square', label: '四角形', priceModifier: { type: 'add', value: 5 } },
          { id: 'heart', label: 'ハート型', priceModifier: { type: 'add', value: 10 } },
          { id: 'oval', label: '楕円形', priceModifier: { type: 'add', value: 5 } },
        ],
      },
      {
        id: 'material',
        name: '素材',
        type: 'grid',
        values: [
          { id: 'standard', label: 'スタンダード' },
          { id: 'hologram', label: 'ホログラム', priceModifier: { type: 'add', value: 20 } },
          { id: 'glitter', label: 'グリッター', priceModifier: { type: 'add', value: 15 } },
          { id: 'mirror', label: 'ミラー', priceModifier: { type: 'add', value: 20 } },
          { id: 'matte', label: 'マット', priceModifier: { type: 'add', value: 10 } },
          { id: 'lenticular', label: 'レンチキュラー', priceModifier: { type: 'multiply', value: 1.5 } },
        ],
      },
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        values: [
          { id: '25mm', label: '25mm' },
          { id: '32mm', label: '32mm', priceModifier: { type: 'add', value: 5 } },
          { id: '38mm', label: '38mm', priceModifier: { type: 'add', value: 10 } },
          { id: '44mm', label: '44mm', priceModifier: { type: 'add', value: 15 } },
          { id: '50mm', label: '50mm', priceModifier: { type: 'add', value: 25 } },
          { id: '57mm', label: '57mm', priceModifier: { type: 'add', value: 35 } },
          { id: '65mm', label: '65mm', priceModifier: { type: 'add', value: 50 } },
          { id: '76mm', label: '76mm', priceModifier: { type: 'add', value: 70 } },
          { id: '100mm', label: '100mm', priceModifier: { type: 'add', value: 100 } },
          { id: 'custom', label: 'サイズを指定' },
        ],
      },
      {
        id: 'back',
        name: '裏面仕様',
        type: 'dropdown',
        values: [
          { id: 'safety-pin', label: '安全ピン' },
          { id: 'magnet', label: 'マグネット', priceModifier: { type: 'add', value: 15 } },
          { id: 'mirror', label: 'ミラー付き', priceModifier: { type: 'add', value: 20 } },
          { id: 'bottle-opener', label: '栓抜き', priceModifier: { type: 'add', value: 30 } },
        ],
      },
    ],
    minQuantity: 30,
    maxQuantity: 2000,
    imageUrl: '/images/can-badge.jpg',
    features: ['高品質印刷', '安全ピン仕様', '豊富なサイズ展開', '短納期対応'],
    quantityPresets: [30, 50, 100, 200, 300, 500, 1000, 2000],
    expressDeliveryFee: 3000,
  },
  {
    id: 'pin-badge',
    slug: 'pin-badge',
    name: 'ピンバッジ',
    description: '高級感のあるメタル素材のピンバッジ。企業ノベルティやコレクターアイテムに最適です。',
    shortDescription: 'メタル素材の高級ピンバッジ',
    category: 'badge',
    requiresMold: true,
    moldFee: 15000,
    priceTiers: [
      { minQuantity: 50, maxQuantity: 100, unitPrice: 63 },
      { minQuantity: 101, maxQuantity: 200, unitPrice: 61, discountPercent: 3 },
      { minQuantity: 201, maxQuantity: 300, unitPrice: 60, discountPercent: 5 },
      { minQuantity: 301, maxQuantity: 500, unitPrice: 59, discountPercent: 6 },
      { minQuantity: 501, maxQuantity: 1000, unitPrice: 57, discountPercent: 10 },
      { minQuantity: 1001, maxQuantity: 2000, unitPrice: 55, discountPercent: 13 },
      { minQuantity: 2001, maxQuantity: 3000, unitPrice: 54, discountPercent: 14 },
      { minQuantity: 3001, maxQuantity: 5000, unitPrice: 53, discountPercent: 16 },
      { minQuantity: 5001, maxQuantity: 10000, unitPrice: 51, discountPercent: 19 },
      { minQuantity: 10001, maxQuantity: 20000, unitPrice: 50, discountPercent: 21 },
      { minQuantity: 20001, maxQuantity: 50000, unitPrice: 49, discountPercent: 22 },
      { minQuantity: 50001, maxQuantity: 100000, unitPrice: 47, discountPercent: 25 },
      { minQuantity: 100001, maxQuantity: 999999, unitPrice: 46, discountPercent: 27 },
    ],
    options: [
      {
        id: 'shape',
        name: '形',
        type: 'list',
        values: [
          { id: 'die-cut', label: '型抜き' },
          { id: 'circle', label: '円形' },
          { id: 'square', label: '四角形' },
          { id: 'shield', label: 'シールド型', priceModifier: { type: 'add', value: 30 } },
          { id: 'oval', label: '楕円形' },
        ],
      },
      {
        id: 'material',
        name: '素材・仕上げ',
        type: 'grid',
        values: [
          { id: 'soft-enamel', label: 'ソフトエナメル' },
          { id: 'hard-enamel', label: 'ハードエナメル', priceModifier: { type: 'add', value: 60 } },
          { id: 'die-struck', label: '打ち抜き', priceModifier: { type: 'add', value: 40 } },
          { id: 'sandblast', label: 'サンドブラスト', priceModifier: { type: 'add', value: 50 } },
          { id: 'offset', label: 'オフセット印刷' },
          { id: 'epoxy', label: 'エポキシコート', priceModifier: { type: 'add', value: 30 } },
        ],
      },
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        values: [
          { id: '20mm', label: '20mm' },
          { id: '30mm', label: '30mm', priceModifier: { type: 'add', value: 25 } },
          { id: '40mm', label: '40mm', priceModifier: { type: 'add', value: 50 } },
          { id: '50mm', label: '50mm', priceModifier: { type: 'add', value: 75 } },
          { id: '60mm', label: '60mm', priceModifier: { type: 'add', value: 100 } },
          { id: '70mm', label: '70mm', priceModifier: { type: 'add', value: 125 } },
          { id: '80mm', label: '80mm', priceModifier: { type: 'add', value: 150 } },
          { id: 'custom', label: 'サイズを指定' },
        ],
      },
      {
        id: 'plating',
        name: 'メッキ',
        type: 'dropdown',
        values: [
          { id: 'gold', label: 'ゴールド' },
          { id: 'silver', label: 'シルバー' },
          { id: 'black-nickel', label: 'ブラックニッケル', priceModifier: { type: 'add', value: 20 } },
          { id: 'antique-gold', label: 'アンティークゴールド', priceModifier: { type: 'add', value: 30 } },
          { id: 'antique-silver', label: 'アンティークシルバー', priceModifier: { type: 'add', value: 30 } },
          { id: 'copper', label: 'カッパー', priceModifier: { type: 'add', value: 20 } },
        ],
      },
      {
        id: 'back',
        name: '留め具',
        type: 'dropdown',
        values: [
          { id: 'butterfly', label: 'バタフライクラッチ' },
          { id: 'rubber', label: 'ラバークラッチ', priceModifier: { type: 'add', value: 10 } },
          { id: 'deluxe', label: 'デラックスクラッチ', priceModifier: { type: 'add', value: 30 } },
          { id: 'magnet', label: 'マグネット', priceModifier: { type: 'add', value: 50 } },
          { id: 'safety-pin', label: '安全ピン' },
        ],
      },
    ],
    minQuantity: 50,
    maxQuantity: 100000,
    imageUrl: '/images/pin-badge.jpg',
    features: ['メタル素材', 'ソフトエナメル加工', 'バタフライクラッチ', '個別OPP袋入り'],
    quantityPresets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
    expressDeliveryFee: 5000,
  },
  {
    id: 'rubber-keychain',
    slug: 'rubber-keychain',
    name: 'ラバーキーホルダー',
    description: '柔らかいPVC素材のラバーキーホルダー。立体的なデザインで存在感抜群です。',
    shortDescription: '柔らかいPVC素材のキーホルダー',
    category: 'keychain',
    requiresMold: true,
    moldFee: 8000,
    priceTiers: [
      { minQuantity: 50, maxQuantity: 100, unitPrice: 70 },
      { minQuantity: 101, maxQuantity: 200, unitPrice: 67, discountPercent: 4 },
      { minQuantity: 201, maxQuantity: 300, unitPrice: 65, discountPercent: 7 },
      { minQuantity: 301, maxQuantity: 500, unitPrice: 62, discountPercent: 11 },
      { minQuantity: 501, maxQuantity: 1000, unitPrice: 60, discountPercent: 14 },
      { minQuantity: 1001, maxQuantity: 2000, unitPrice: 57, discountPercent: 19 },
      { minQuantity: 2001, maxQuantity: 3000, unitPrice: 54, discountPercent: 23 },
      { minQuantity: 3001, maxQuantity: 5000, unitPrice: 52, discountPercent: 26 },
      { minQuantity: 5001, maxQuantity: 10000, unitPrice: 49, discountPercent: 30 },
      { minQuantity: 10001, maxQuantity: 20000, unitPrice: 47, discountPercent: 33 },
      { minQuantity: 20001, maxQuantity: 50000, unitPrice: 45, discountPercent: 36 },
      { minQuantity: 50001, maxQuantity: 100000, unitPrice: 42, discountPercent: 40 },
      { minQuantity: 100001, maxQuantity: 999999, unitPrice: 40, discountPercent: 43 },
    ],
    options: [
      {
        id: 'shape',
        name: '形',
        type: 'list',
        values: [
          { id: 'die-cut', label: '型抜き' },
          { id: 'circle', label: '円形' },
          { id: 'square', label: '四角形' },
          { id: 'rounded', label: '角丸' },
        ],
      },
      {
        id: 'type',
        name: 'タイプ',
        type: 'grid',
        values: [
          { id: 'single-3d', label: '片面立体' },
          { id: 'double-3d', label: '両面立体', priceModifier: { type: 'add', value: 80 } },
          { id: 'flat', label: 'フラット' },
          { id: 'glow', label: '蓄光', priceModifier: { type: 'add', value: 50 } },
          { id: 'color-fill', label: 'カラー充填', priceModifier: { type: 'add', value: 40 } },
          { id: 'photo', label: '写真印刷', priceModifier: { type: 'add', value: 60 } },
        ],
      },
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        values: [
          { id: '20mm', label: '20mm' },
          { id: '30mm', label: '30mm', priceModifier: { type: 'add', value: 3 } },
          { id: '40mm', label: '40mm', priceModifier: { type: 'add', value: 5 } },
          { id: '50mm', label: '50mm', priceModifier: { type: 'add', value: 8 } },
          { id: '60mm', label: '60mm', priceModifier: { type: 'add', value: 10 } },
          { id: '70mm', label: '70mm', priceModifier: { type: 'add', value: 13 } },
          { id: '80mm', label: '80mm', priceModifier: { type: 'add', value: 15 } },
          { id: '90mm', label: '90mm', priceModifier: { type: 'add', value: 20 } },
          { id: '100mm', label: '100mm', priceModifier: { type: 'add', value: 25 } },
          { id: '110mm', label: '110mm', priceModifier: { type: 'add', value: 30 } },
          { id: '120mm', label: '120mm', priceModifier: { type: 'add', value: 35 } },
          { id: 'custom', label: 'サイズを指定' },
        ],
      },
      {
        id: 'thickness',
        name: '厚さ',
        type: 'dropdown',
        values: [
          { id: '3mm', label: '3mm（標準）' },
          { id: '4mm', label: '4mm', priceModifier: { type: 'add', value: 20 } },
          { id: '5mm', label: '5mm（厚め）', priceModifier: { type: 'add', value: 50 } },
        ],
      },
      {
        id: 'attachment',
        name: 'パーツ',
        type: 'dropdown',
        values: [
          { id: 'ball-chain', label: 'ボールチェーン' },
          { id: 'lobster', label: 'ナスカン', priceModifier: { type: 'add', value: 10 } },
          { id: 'key-ring', label: 'キーリング', priceModifier: { type: 'add', value: 5 } },
          { id: 'strap', label: 'ストラップ', priceModifier: { type: 'add', value: 15 } },
        ],
      },
    ],
    minQuantity: 50,
    maxQuantity: 100000,
    imageUrl: '/images/rubber-keychain.jpg',
    features: ['PVC素材', '立体成型', 'フルカラー対応', 'ナスカン付属'],
    quantityPresets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
    expressDeliveryFee: 5000,
  },
  {
    id: 'plastic-bag',
    slug: 'plastic-bag',
    name: 'レジ袋',
    description: '店舗やイベントで使えるオリジナルレジ袋。環境に配慮した素材も選択可能です。',
    shortDescription: 'オリジナルデザインのレジ袋',
    category: 'packaging',
    priceTiers: [
      { minQuantity: 500, maxQuantity: 999, unitPrice: 25 },
      { minQuantity: 1000, maxQuantity: 1999, unitPrice: 20, discountPercent: 20 },
      { minQuantity: 2000, maxQuantity: 2999, unitPrice: 15, discountPercent: 40 },
      { minQuantity: 3000, maxQuantity: 4999, unitPrice: 12, discountPercent: 52 },
      { minQuantity: 5000, maxQuantity: 9999, unitPrice: 9, discountPercent: 64 },
      { minQuantity: 10000, maxQuantity: 30000, unitPrice: 7, discountPercent: 72 },
    ],
    options: [
      {
        id: 'type',
        name: 'タイプ',
        type: 'list',
        values: [
          { id: 'standard', label: 'スタンダード' },
          { id: 'heavy-duty', label: '厚手タイプ', priceModifier: { type: 'add', value: 3 } },
          { id: 'soft', label: 'ソフトタイプ', priceModifier: { type: 'add', value: 2 } },
        ],
      },
      {
        id: 'material',
        name: '素材',
        type: 'grid',
        values: [
          { id: 'pe', label: 'PE（ポリエチレン）' },
          { id: 'hdpe', label: 'HDPE（高密度）' },
          { id: 'ldpe', label: 'LDPE（低密度）', priceModifier: { type: 'add', value: 1 } },
          { id: 'bio', label: 'バイオマス25%', priceModifier: { type: 'add', value: 3 } },
          { id: 'bio50', label: 'バイオマス50%', priceModifier: { type: 'add', value: 5 } },
          { id: 'recycle', label: 'リサイクル素材', priceModifier: { type: 'add', value: 2 } },
        ],
      },
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        values: [
          { id: 'ss', label: 'SS（18×35cm）' },
          { id: 's', label: 'S（25×40cm）', priceModifier: { type: 'add', value: 2 } },
          { id: 'm', label: 'M（30×45cm）', priceModifier: { type: 'add', value: 4 } },
          { id: 'l', label: 'L（35×50cm）', priceModifier: { type: 'add', value: 6 } },
          { id: 'xl', label: 'XL（40×55cm）', priceModifier: { type: 'add', value: 9 } },
          { id: '2l', label: '2L（45×60cm）', priceModifier: { type: 'add', value: 12 } },
          { id: '3l', label: '3L（50×65cm）', priceModifier: { type: 'add', value: 16 } },
          { id: 'custom', label: 'サイズを指定' },
        ],
      },
      {
        id: 'print',
        name: '印刷',
        type: 'dropdown',
        values: [
          { id: '1-color', label: '1色印刷' },
          { id: '2-color', label: '2色印刷', priceModifier: { type: 'add', value: 2 } },
          { id: 'full-color', label: 'フルカラー印刷', priceModifier: { type: 'multiply', value: 1.3 } },
        ],
      },
      {
        id: 'handle',
        name: '持ち手',
        type: 'dropdown',
        values: [
          { id: 'standard', label: '標準タイプ' },
          { id: 'loop', label: 'ループハンドル', priceModifier: { type: 'add', value: 1 } },
          { id: 'soft', label: 'ソフトハンドル', priceModifier: { type: 'add', value: 2 } },
        ],
      },
    ],
    minQuantity: 500,
    maxQuantity: 30000,
    imageUrl: '/images/plastic-bag.jpg',
    features: ['1色印刷', 'フルカラー印刷対応', 'バイオマス素材選択可', '大ロット対応'],
    quantityPresets: [500, 1000, 2000, 3000, 5000, 10000, 20000, 30000],
    expressDeliveryFee: 10000,
  },
]

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug)
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export function calculateUnitPrice(
  product: Product,
  quantity: number,
  selectedOptions?: Record<string, string>
): number {
  // Base price from quantity tier
  let base: number
  const tier = product.priceTiers.find(
    (t) => quantity >= t.minQuantity && quantity <= t.maxQuantity
  )
  if (tier) {
    base = tier.unitPrice
  } else if (quantity < product.minQuantity) {
    base = product.priceTiers[0].unitPrice
  } else {
    base = product.priceTiers[product.priceTiers.length - 1].unitPrice
  }

  if (!selectedOptions) return base

  // Apply option modifiers
  let price = base
  for (const [optionId, valueId] of Object.entries(selectedOptions)) {
    const option = product.options.find((o) => o.id === optionId)
    const value = option?.values.find((v) => v.id === valueId)
    const mod = value?.priceModifier
    if (!mod) continue
    if (mod.type === 'add') {
      price += mod.value
    } else if (mod.type === 'multiply') {
      price = Math.round(price * mod.value)
    }
  }

  return price
}

export function calculateTotalPrice(
  product: Product,
  quantity: number,
  selectedOptions?: Record<string, string>
): number {
  return calculateUnitPrice(product, quantity, selectedOptions) * quantity
}

export function getDiscountPercent(product: Product, quantity: number): number | undefined {
  const tier = product.priceTiers.find(
    (t) => quantity >= t.minQuantity && quantity <= t.maxQuantity
  )
  return tier?.discountPercent
}

export function formatPrice(priceInYen: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(priceInYen)
}
