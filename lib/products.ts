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

export interface ShippingModifier {
  type: 'add' | 'multiply'
  value: number
}

export interface MoldFeeRule {
  conditionType: 'size' | 'quantity' | 'fixed'
  conditionValue?: string  // size: option value id e.g. '20mm'; quantity: 'min-max' e.g. '1-100'
  moldFee: number
}

export interface ImageView {
  id: string        // e.g. 'front', 'side', 'back'
  label: string     // e.g. '正面', '横', '後面'
  required: boolean
}

/** Controls how an option value visually affects the product preview */
export interface PreviewOverlay {
  imageUrl: string            // overlay image URL (transparent PNG recommended)
  position: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'background'
  zIndex?: number             // stacking order (default: 10)
  scale?: number              // relative scale (default: 1)
  offsetY?: number            // vertical offset in % (e.g. -10 = 10% above center)
  offsetX?: number            // horizontal offset in %
}

export interface OptionValue {
  id: string
  label: string
  description?: string    // explanatory text shown to the customer
  icon?: string
  imageUrl?: string
  priceModifier?: PriceModifier
  requiresMold?: boolean   // true = this option value requires a mold (overrides product-level)
  moldFee?: number         // mold fee in JPY for this specific option value
  shippingModifier?: ShippingModifier  // impact on shipping cost
  // Preview customization
  previewOverlay?: PreviewOverlay      // overlay image on product preview
  previewColor?: string                // CSS color to tint/show (e.g. chain color)
  previewTexture?: string              // texture/pattern image URL (for 3D material preview)
}

export interface ProductOption {
  id: string
  name: string
  values: OptionValue[]
  type: 'list' | 'grid' | 'dropdown' | 'checkbox' | 'number' | 'color'
  multiSelect?: boolean     // for checkbox type
  numberMin?: number        // for number type
  numberMax?: number
  numberUnit?: string       // e.g. 'mm'
  pricePerUnit?: number     // for number type: input value × this = added to unit price
  required?: boolean        // true = must select before ordering (default: true for backwards compat)
  // Hierarchical grouping: parent → child → grandchild
  parentId?: string         // id of the parent option (creates sub-option relationship)
  showWhen?: string[]       // only show when parent option's selected value is one of these ids
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
  moldFeeRules?: MoldFeeRule[]  // conditional mold fee (size/quantity based)
  leadTimeDays?: number         // standard lead time in business days (14–30)
  expressDeliveryFee?: number   // flat fee for 10-day express delivery (0 = unavailable)
  notificationEmail?: string    // factory order email; falls back to FACTORY_DEFAULT_EMAIL if empty
  defaultFactoryId?: string     // auto-assign order_items to this factory on checkout
  isActive?: boolean            // false = hidden from storefront
  is3d?: boolean                // 3D product requiring multi-view design uploads
  imageViews?: ImageView[]      // required views for 3D products
  fixedUnitPrice?: boolean      // true = unit price from priceTiers only, option modifiers ignored
  complexityRules?: ComplexityRule[]  // restrict ordering by complexity + size/shape
}

/**
 * A rule that blocks ordering when complexity + other conditions are met.
 * Example: "complexity D or E with die-cut shape and size ≤ 40mm → block"
 */
export interface ComplexityRule {
  id: string
  /** Complexity grades that trigger this rule (e.g. ['D', 'E']) */
  blockedGrades: string[]
  /** Shape values that trigger this rule (e.g. ['die-cut']). Empty = all shapes */
  shapes?: string[]
  /** Max size value id below which ordering is blocked (e.g. '40mm'). Empty = any size */
  maxSizeId?: string
  /** Whether this blocks 3D products */
  applies3d?: boolean
  /** Message shown to the user when blocked */
  message: string
}

/**
 * Check if the current option selection violates any complexity rules.
 * Returns the first matching rule's message, or null if OK.
 */
export function checkComplexityRestriction(
  product: Product,
  selectedOptions: Record<string, string>,
): string | null {
  const rules = product.complexityRules
  if (!rules || rules.length === 0) return null

  const complexity = selectedOptions['complexity']
  if (!complexity) return null

  const shape = selectedOptions['shape']
  const size = selectedOptions['size']

  for (const rule of rules) {
    if (!rule.blockedGrades.includes(complexity)) continue

    // Check shape condition
    if (rule.shapes && rule.shapes.length > 0) {
      if (!shape || !rule.shapes.includes(shape)) continue
    }

    // Check size condition — compare by finding the size option's index
    if (rule.maxSizeId && size) {
      const sizeOpt = product.options.find((o) => o.id === 'size')
      if (sizeOpt) {
        const sizeIdx = sizeOpt.values.findIndex((v) => v.id === size)
        const maxIdx = sizeOpt.values.findIndex((v) => v.id === rule.maxSizeId)
        if (sizeIdx < 0 || maxIdx < 0 || sizeIdx > maxIdx) continue
      }
    }

    // Check 3D condition
    if (rule.applies3d && !product.is3d) continue

    return rule.message
  }

  return null
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
    isActive: true,
    leadTimeDays: 30,
    expressDeliveryFee: 0,
    priceTiers: [
      { minQuantity: 50, maxQuantity: 100, unitPrice: 77 },
      { minQuantity: 101, maxQuantity: 200, unitPrice: 74, discountPercent: 4 },
      { minQuantity: 201, maxQuantity: 300, unitPrice: 72, discountPercent: 6 },
      { minQuantity: 301, maxQuantity: 500, unitPrice: 70, discountPercent: 9 },
      { minQuantity: 501, maxQuantity: 1000, unitPrice: 67, discountPercent: 13 },
      { minQuantity: 1001, maxQuantity: 2000, unitPrice: 65, discountPercent: 16 },
      { minQuantity: 2001, maxQuantity: 3000, unitPrice: 62, discountPercent: 19 },
      { minQuantity: 3001, maxQuantity: 5000, unitPrice: 60, discountPercent: 22 },
      { minQuantity: 5001, maxQuantity: 10000, unitPrice: 58, discountPercent: 25 },
      { minQuantity: 10001, maxQuantity: 20000, unitPrice: 55, discountPercent: 29 },
      { minQuantity: 20001, maxQuantity: 50000, unitPrice: 53, discountPercent: 31 },
      { minQuantity: 50001, maxQuantity: 100000, unitPrice: 50, discountPercent: 35 },
      { minQuantity: 100001, maxQuantity: 200000, unitPrice: 48, discountPercent: 38 },
    ],
    options: [
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        required: true,
        values: [
          { id: '40mm', label: '40mm', priceModifier: { type: 'add', value: -2 } },
          { id: '50mm', label: '50mm' },
          { id: '60mm', label: '60mm', priceModifier: { type: 'add', value: 2 } },
          { id: '70mm', label: '70mm', priceModifier: { type: 'add', value: 5 } },
          { id: '80mm', label: '80mm', priceModifier: { type: 'add', value: 7 } },
          { id: '100mm', label: '100mm', priceModifier: { type: 'add', value: 17 } },
        ],
      },
      {
        id: 'chain_type',
        name: 'チェーン種類',
        type: 'list',
        required: true,
        values: [
          { id: 'ball-chain', label: 'ボールチェーン' },
          { id: 'lobster', label: 'カニカン' },
        ],
      },
      {
        id: 'shape',
        name: '外枠の形',
        type: 'list',
        required: true,
        values: [
          { id: 'die-cut', label: '型抜き（デザインに沿った形）' },
          { id: 'round', label: '丸型' },
          { id: 'rounded-rect', label: '角丸四角' },
        ],
      },
      {
        id: 'white_back',
        name: 'ホワイト（白バック）',
        type: 'list',
        required: false,
        values: [
          { id: 'none', label: 'なし' },
          { id: 'white', label: 'ホワイト挿入', priceModifier: { type: 'multiply', value: 1.2 } },
        ],
      },
      {
        id: 'double_sided',
        name: '両面印刷',
        type: 'list',
        required: false,
        values: [
          { id: 'none', label: '片面のみ' },
          { id: 'double', label: '両面印刷', priceModifier: { type: 'multiply', value: 1.6 } },
        ],
      },
      {
        id: 'second_design',
        name: '裏面デザイン',
        type: 'list',
        required: false,
        parentId: 'double_sided',
        showWhen: ['double'],
        values: [
          { id: 'same', label: '表面と同じ' },
          { id: 'different', label: '別のデザインを入稿' },
        ],
      },
      {
        id: 'pp_bag',
        name: 'PP袋（個別包装）',
        type: 'list',
        required: false,
        values: [
          { id: 'none', label: 'なし' },
          { id: 'pp_bag', label: 'PP袋', priceModifier: { type: 'add', value: 7 } },
        ],
      },
    ],
    minQuantity: 50,
    maxQuantity: 200000,
    imageUrl: '/images/acrylic-keychain.jpg',
    features: ['高透明度アクリル', 'UVプリント', '片面・両面印刷対応', 'ボールチェーン付属'],
    quantityPresets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
  },
  {
    id: 'can-badge',
    slug: 'can-badge',
    name: '缶バッジ',
    description: 'イベントや販促に最適な丸型缶バッジ。安全ピンタイプで衣類に簡単に取り付けられます。形状は丸型のみとなります。',
    shortDescription: '丸型の定番缶バッジでオリジナルグッズ',
    category: 'badge',
    requiresMold: false,
    isActive: true,
    leadTimeDays: 30,
    expressDeliveryFee: 0,
    priceTiers: [
      { minQuantity: 100, maxQuantity: 199, unitPrice: 119 },
      { minQuantity: 200, maxQuantity: 299, unitPrice: 101, discountPercent: 15 },
      { minQuantity: 300, maxQuantity: 499, unitPrice: 83, discountPercent: 30 },
      { minQuantity: 500, maxQuantity: 999, unitPrice: 55, discountPercent: 54 },
      { minQuantity: 1000, maxQuantity: 2999, unitPrice: 33, discountPercent: 72 },
      { minQuantity: 3000, maxQuantity: 4999, unitPrice: 19, discountPercent: 84 },
      { minQuantity: 5000, maxQuantity: 9999, unitPrice: 16, discountPercent: 87 },
      { minQuantity: 10000, maxQuantity: 19999, unitPrice: 14, discountPercent: 88 },
      { minQuantity: 20000, maxQuantity: 29999, unitPrice: 13, discountPercent: 89 },
      { minQuantity: 30000, maxQuantity: 99999, unitPrice: 12, discountPercent: 90 },
      { minQuantity: 100000, maxQuantity: 200000, unitPrice: 12, discountPercent: 90 },
    ],
    options: [
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        required: true,
        values: [
          { id: '25mm', label: '25mm', priceModifier: { type: 'add', value: -4 } },
          { id: '32mm', label: '32mm', priceModifier: { type: 'add', value: -3 } },
          { id: '44mm', label: '44mm' },
          { id: '55mm', label: '55mm', priceModifier: { type: 'add', value: 2 } },
          { id: '75mm', label: '75mm', priceModifier: { type: 'add', value: 8 } },
        ],
      },
      {
        id: 'background_color',
        name: '背景色',
        type: 'color',
        required: false,
        values: [],
      },
      {
        id: 'pp_bag',
        name: 'PP袋（個別包装）',
        type: 'list',
        required: false,
        values: [
          { id: 'none', label: 'なし' },
          { id: 'pp_bag', label: 'PP袋', priceModifier: { type: 'add', value: 7 } },
        ],
      },
    ],
    minQuantity: 100,
    maxQuantity: 200000,
    imageUrl: '/images/can-badge.jpg',
    features: ['高品質印刷', '安全ピン仕様', '丸型のみ（型抜き不可）', '大ロット対応（最大20万個）'],
    quantityPresets: [100, 200, 300, 500, 1000, 3000, 5000, 10000],
  },
  {
    id: 'pin-badge',
    slug: 'pin-badge',
    name: 'ピンバッジ',
    description: '高級感のあるメタル素材のピンバッジ。企業ノベルティやコレクターアイテムに最適です。',
    shortDescription: 'メタル素材の高級ピンバッジ',
    category: 'badge',
    requiresMold: true,
    moldFee: 10000,
    isActive: true,
    leadTimeDays: 30,
    expressDeliveryFee: 0,
    priceTiers: [
      { minQuantity: 50, maxQuantity: 100, unitPrice: 108 },
      { minQuantity: 101, maxQuantity: 200, unitPrice: 104, discountPercent: 4 },
      { minQuantity: 201, maxQuantity: 300, unitPrice: 103, discountPercent: 5 },
      { minQuantity: 301, maxQuantity: 500, unitPrice: 102, discountPercent: 6 },
      { minQuantity: 501, maxQuantity: 1000, unitPrice: 101, discountPercent: 6 },
      { minQuantity: 1001, maxQuantity: 2000, unitPrice: 100, discountPercent: 7 },
      { minQuantity: 2001, maxQuantity: 3000, unitPrice: 99, discountPercent: 8 },
      { minQuantity: 3001, maxQuantity: 5000, unitPrice: 98, discountPercent: 9 },
      { minQuantity: 5001, maxQuantity: 10000, unitPrice: 97, discountPercent: 10 },
      { minQuantity: 10001, maxQuantity: 20000, unitPrice: 96, discountPercent: 11 },
      { minQuantity: 20001, maxQuantity: 50000, unitPrice: 96, discountPercent: 11 },
      { minQuantity: 50001, maxQuantity: 100000, unitPrice: 94, discountPercent: 13 },
      { minQuantity: 100001, maxQuantity: 200000, unitPrice: 93, discountPercent: 14 },
    ],
    options: [
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        required: true,
        values: [
          { id: '20mm', label: '20mm', priceModifier: { type: 'add', value: -48 } },
          { id: '30mm', label: '30mm', priceModifier: { type: 'add', value: -24 } },
          { id: '40mm', label: '40mm' },
          { id: '50mm', label: '50mm', priceModifier: { type: 'add', value: 24 } },
          { id: '60mm', label: '60mm', priceModifier: { type: 'add', value: 48 } },
          { id: '70mm', label: '70mm', priceModifier: { type: 'add', value: 72 } },
          { id: '80mm', label: '80mm', priceModifier: { type: 'add', value: 96 } },
        ],
      },
      {
        id: 'shape',
        name: '外枠の形',
        type: 'list',
        required: true,
        values: [
          { id: 'die-cut', label: '型抜き（デザインに沿った形）' },
          { id: 'round', label: '丸型' },
          { id: 'rounded-rect', label: '角丸四角' },
          { id: 'heart', label: 'ハート型' },
          { id: 'star', label: '星型' },
        ],
      },
      {
        id: 'resin_coating',
        name: '樹脂コーティング',
        type: 'list',
        required: false,
        values: [
          { id: 'none', label: 'なし' },
          { id: 'resin', label: '樹脂コーティング', priceModifier: { type: 'multiply', value: 1.4 } },
        ],
      },
      {
        id: 'background_color',
        name: '背景色',
        type: 'color',
        required: false,
        values: [],
      },
      {
        id: 'pp_bag',
        name: 'PP袋（個別包装）',
        type: 'list',
        required: false,
        values: [
          { id: 'none', label: 'なし' },
          { id: 'pp_bag', label: 'PP袋', priceModifier: { type: 'add', value: 7 } },
        ],
      },
    ],
    minQuantity: 50,
    maxQuantity: 200000,
    imageUrl: '/images/pin-badge.jpg',
    features: ['メタル素材', 'ソフトエナメル加工', 'バタフライクラッチ', '個別OPP袋入り'],
    quantityPresets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
  },
  {
    id: 'rubber-keychain',
    slug: 'rubber-keychain',
    name: 'ラバーキーホルダー',
    description: '柔らかいPVC素材のラバーキーホルダー。立体的なデザインで存在感抜群です。',
    shortDescription: '柔らかいPVC素材のキーホルダー',
    category: 'keychain',
    requiresMold: true,
    moldFee: 7000,
    isActive: true,
    leadTimeDays: 30,
    expressDeliveryFee: 0,
    priceTiers: [
      { minQuantity: 50, maxQuantity: 100, unitPrice: 74 },
      { minQuantity: 101, maxQuantity: 200, unitPrice: 72, discountPercent: 3 },
      { minQuantity: 201, maxQuantity: 300, unitPrice: 70, discountPercent: 5 },
      { minQuantity: 301, maxQuantity: 500, unitPrice: 67, discountPercent: 9 },
      { minQuantity: 501, maxQuantity: 1000, unitPrice: 65, discountPercent: 12 },
      { minQuantity: 1001, maxQuantity: 2000, unitPrice: 62, discountPercent: 16 },
      { minQuantity: 2001, maxQuantity: 3000, unitPrice: 60, discountPercent: 19 },
      { minQuantity: 3001, maxQuantity: 5000, unitPrice: 58, discountPercent: 22 },
      { minQuantity: 5001, maxQuantity: 10000, unitPrice: 55, discountPercent: 26 },
      { minQuantity: 10001, maxQuantity: 20000, unitPrice: 53, discountPercent: 28 },
      { minQuantity: 20001, maxQuantity: 50000, unitPrice: 50, discountPercent: 32 },
      { minQuantity: 50001, maxQuantity: 100000, unitPrice: 48, discountPercent: 35 },
      { minQuantity: 100001, maxQuantity: 200000, unitPrice: 46, discountPercent: 38 },
    ],
    options: [
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        required: true,
        values: [
          { id: '40mm', label: '40mm', priceModifier: { type: 'add', value: -2 } },
          { id: '50mm', label: '50mm' },
          { id: '60mm', label: '60mm', priceModifier: { type: 'add', value: 2 } },
          { id: '70mm', label: '70mm', priceModifier: { type: 'add', value: 5 } },
          { id: '80mm', label: '80mm', priceModifier: { type: 'add', value: 7 } },
          { id: '100mm', label: '100mm', priceModifier: { type: 'add', value: 17 } },
        ],
      },
      {
        id: 'chain_type',
        name: 'チェーン種類',
        type: 'list',
        required: true,
        values: [
          { id: 'ball-chain', label: 'ボールチェーン' },
          { id: 'lobster', label: 'カニカン' },
          { id: 'strap', label: 'ストラップ' },
        ],
      },
      {
        id: 'shape',
        name: '外枠の形',
        type: 'list',
        required: true,
        values: [
          { id: 'die-cut', label: '型抜き（デザインに沿った形）' },
          { id: 'round', label: '丸型' },
          { id: 'rounded-rect', label: '角丸四角' },
        ],
      },
      {
        id: 'background_color',
        name: '背景色',
        type: 'color',
        required: false,
        values: [],
      },
      {
        id: 'pp_bag',
        name: 'PP袋（個別包装）',
        type: 'list',
        required: false,
        values: [
          { id: 'none', label: 'なし' },
          { id: 'pp_bag', label: 'PP袋', priceModifier: { type: 'add', value: 7 } },
        ],
      },
    ],
    minQuantity: 50,
    maxQuantity: 200000,
    imageUrl: '/images/rubber-keychain.jpg',
    features: ['PVC素材', '立体成型', 'フルカラー対応', 'ボールチェーン付属'],
    quantityPresets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
  },
  {
    id: 'plastic-bag',
    slug: 'plastic-bag',
    name: 'レジ袋',
    description: '店舗やイベントで使えるオリジナルレジ袋。環境に配慮した素材も選択可能です。',
    shortDescription: 'オリジナルデザインのレジ袋',
    category: 'packaging',
    isActive: false,
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
      {
        id: 'color_count',
        name: '色数',
        type: 'list',
        values: [
          { id: '1-color', label: '1色' },
          { id: '2-color', label: '2色', priceModifier: { type: 'add', value: 2 } },
          { id: '3-color', label: '3色', priceModifier: { type: 'add', value: 4 } },
          { id: '4-color-plus', label: '4色以上', priceModifier: { type: 'add', value: 7 } },
        ],
      },
      {
        id: 'print_side',
        name: '印刷面',
        type: 'list',
        values: [
          { id: 'single', label: '片面印刷（標準）' },
          { id: 'double', label: '両面印刷', priceModifier: { type: 'add', value: 5 } },
        ],
      },
      {
        id: 'thickness_bag',
        name: '厚さ',
        type: 'list',
        values: [
          { id: 'standard', label: '標準' },
          { id: 'thick', label: '厚手', priceModifier: { type: 'add', value: 3 } },
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
  } else if (product.priceTiers.length === 0) {
    return 0
  } else if (quantity < product.minQuantity) {
    base = product.priceTiers[0].unitPrice
  } else {
    base = product.priceTiers[product.priceTiers.length - 1].unitPrice
  }

  if (!selectedOptions || product.fixedUnitPrice) return base

  // Apply option modifiers
  let price = base
  for (const [optionId, selectedValue] of Object.entries(selectedOptions)) {
    const option = product.options.find((o) => o.id === optionId)
    if (!option) continue

    // number type: input value × pricePerUnit
    if (option.type === 'number' && option.pricePerUnit) {
      const num = parseFloat(selectedValue)
      if (!isNaN(num)) {
        price += Math.round(num * option.pricePerUnit)
      }
      continue
    }

    // checkbox type: comma-separated values, accumulate all modifiers
    if (option.type === 'checkbox' || option.multiSelect) {
      const ids = selectedValue.split(',').filter(Boolean)
      for (const id of ids) {
        // Match by ID first, then by label (cart stores labels after addToCart)
        const val = option.values.find((v) => v.id === id || v.label === id)
        const mod = val?.priceModifier
        if (!mod) continue
        if (mod.type === 'add') price += mod.value
        else if (mod.type === 'multiply') price = Math.round(price * mod.value)
      }
      continue
    }

    // Standard single-select
    // Match by ID first, then by label (cart stores labels after addToCart)
    const value = option.values.find((v) => v.id === selectedValue || v.label === selectedValue)
    const mod = value?.priceModifier
    if (!mod) continue
    if (mod.type === 'add') {
      price += mod.value
    } else if (mod.type === 'multiply') {
      price = Math.round(price * mod.value)
    }
  }

  return Math.max(1, price)
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

/**
 * Calculate mold fee based on selected option values.
 * Option-value-level mold settings take priority over product-level.
 * If no option values specify mold settings, falls back to product-level.
 *
 * Returns { requiresMold, moldFee } where moldFee is the total across
 * all selected options that require molds (supports multi-mold products).
 */
export function calculateMoldFee(
  product: Product,
  selectedOptions?: Record<string, string>,
  quantity?: number,
): { requiresMold: boolean; moldFee: number } {
  if (!selectedOptions) {
    return {
      requiresMold: product.requiresMold ?? false,
      moldFee: product.moldFee ?? 0,
    }
  }

  // 1. Check moldFeeRules (size-based or quantity-based conditional fees)
  const rules = product.moldFeeRules
  if (rules && rules.length > 0) {
    const sizeValue = selectedOptions['size']
    const qty = quantity ?? 0
    for (const rule of rules) {
      if (rule.conditionType === 'fixed') {
        return { requiresMold: true, moldFee: rule.moldFee }
      }
      if (rule.conditionType === 'size' && sizeValue === rule.conditionValue) {
        return { requiresMold: true, moldFee: rule.moldFee }
      }
      if (rule.conditionType === 'quantity' && rule.conditionValue) {
        const [minStr, maxStr] = rule.conditionValue.split('-')
        const min = parseInt(minStr, 10)
        const max = parseInt(maxStr, 10)
        if (qty >= min && qty <= max) {
          return { requiresMold: true, moldFee: rule.moldFee }
        }
      }
    }
    // No rule matched — fall through to option-level / product-level
  }

  // 2. Check if ANY option value has mold settings configured
  const hasOptionLevelMold = product.options.some((opt) =>
    opt.values.some((v) => v.requiresMold !== undefined)
  )

  if (!hasOptionLevelMold) {
    return {
      requiresMold: product.requiresMold ?? false,
      moldFee: product.moldFee ?? 0,
    }
  }

  // 3. Option-level: accumulate mold fees from all selected values
  let totalMoldFee = 0
  let anyRequiresMold = false

  for (const [optionId, selectedValue] of Object.entries(selectedOptions)) {
    const option = product.options.find((o) => o.id === optionId)
    if (!option) continue

    // checkbox: check all selected values
    if (option.type === 'checkbox' || option.multiSelect) {
      for (const id of selectedValue.split(',').filter(Boolean)) {
        const val = option.values.find((v) => v.id === id || v.label === id)
        if (val?.requiresMold) {
          anyRequiresMold = true
          totalMoldFee += val.moldFee ?? 0
        }
      }
      continue
    }

    const value = option.values.find((v) => v.id === selectedValue || v.label === selectedValue)
    if (value?.requiresMold) {
      anyRequiresMold = true
      totalMoldFee += value.moldFee ?? 0
    }
  }

  return { requiresMold: anyRequiresMold, moldFee: totalMoldFee }
}

/**
 * Calculate shipping cost modifier from selected options.
 * Returns additional shipping cost in JPY (can be 0).
 */
export function calculateShippingModifier(
  product: Product,
  selectedOptions?: Record<string, string>,
): number {
  if (!selectedOptions) return 0
  let extra = 0
  for (const [optionId, selectedValue] of Object.entries(selectedOptions)) {
    const option = product.options.find((o) => o.id === optionId)
    if (!option) continue

    const getModifier = (val: OptionValue | undefined) => {
      if (!val?.shippingModifier) return
      if (val.shippingModifier.type === 'add') extra += val.shippingModifier.value
      else if (val.shippingModifier.type === 'multiply') extra = Math.round(extra * val.shippingModifier.value)
    }

    if (option.type === 'checkbox' || option.multiSelect) {
      for (const id of selectedValue.split(',').filter(Boolean)) {
        getModifier(option.values.find((v) => v.id === id || v.label === id))
      }
    } else {
      getModifier(option.values.find((v) => v.id === selectedValue || v.label === selectedValue))
    }
  }
  return extra
}

export function formatPrice(priceInYen: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(priceInYen)
}
