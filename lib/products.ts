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
  description?: string      // optional explainer shown to the customer below the option name
  values: OptionValue[]
  type: 'list' | 'grid' | 'dropdown' | 'checkbox' | 'number' | 'color' | 'text'
  textPlaceholder?: string  // for text type
  textMaxLength?: number    // for text type
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
  updatedAt?: string                  // ISO date from DB (used for sitemap lastModified)
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

    // Check size condition — compare by finding the size option's index.
    // maxSizeId is the largest size at which the rule applies (inclusive).
    // If the user's selected size is strictly LARGER than maxSizeId (higher index
    // when values are ordered small→large), the rule does NOT apply.
    if (rule.maxSizeId && size) {
      const sizeOpt = product.options.find((o) => o.id === 'size')
      if (sizeOpt) {
        const sizeIdx = sizeOpt.values.findIndex((v) => v.id === size)
        const maxIdx = sizeOpt.values.findIndex((v) => v.id === rule.maxSizeId)
        if (sizeIdx < 0 || maxIdx < 0) continue
        if (sizeIdx > maxIdx) continue // user's size is larger than the cap → rule does not apply
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
    // 2026-04 市場相場調査に基づき改訂。50mm基準。
    // 参考相場: 100個¥150-190, 1,000個¥99-165, 10,000個¥70-95, 100,000個¥50-65
    priceTiers: [
      { minQuantity: 50, maxQuantity: 100, unitPrice: 180 },
      { minQuantity: 101, maxQuantity: 200, unitPrice: 160, discountPercent: 11 },
      { minQuantity: 201, maxQuantity: 300, unitPrice: 150, discountPercent: 17 },
      { minQuantity: 301, maxQuantity: 500, unitPrice: 135, discountPercent: 25 },
      { minQuantity: 501, maxQuantity: 1000, unitPrice: 120, discountPercent: 33 },
      { minQuantity: 1001, maxQuantity: 2000, unitPrice: 105, discountPercent: 42 },
      { minQuantity: 2001, maxQuantity: 3000, unitPrice: 95, discountPercent: 47 },
      { minQuantity: 3001, maxQuantity: 5000, unitPrice: 88, discountPercent: 51 },
      { minQuantity: 5001, maxQuantity: 10000, unitPrice: 82, discountPercent: 54 },
      { minQuantity: 10001, maxQuantity: 20000, unitPrice: 75, discountPercent: 58 },
      { minQuantity: 20001, maxQuantity: 50000, unitPrice: 68, discountPercent: 62 },
      { minQuantity: 50001, maxQuantity: 100000, unitPrice: 62, discountPercent: 66 },
      { minQuantity: 100001, maxQuantity: 200000, unitPrice: 58, discountPercent: 68 },
    ],
    options: [
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        required: true,
        values: [
          // サイズ比: 50mmを基準(1.0)に面積比相場に合わせて multiply 化
          // 40mm=0.80, 50mm=1.0, 60mm=1.25, 70mm=1.50, 80mm=1.80, 100mm=2.40
          { id: '40mm', label: '40mm', priceModifier: { type: 'multiply', value: 0.80 } },
          { id: '50mm', label: '50mm' },
          { id: '60mm', label: '60mm', priceModifier: { type: 'multiply', value: 1.25 } },
          { id: '70mm', label: '70mm', priceModifier: { type: 'multiply', value: 1.50 } },
          { id: '80mm', label: '80mm', priceModifier: { type: 'multiply', value: 1.80 } },
          { id: '100mm', label: '100mm', priceModifier: { type: 'multiply', value: 2.40 } },
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
          { id: 'square', label: '四角' },
          { id: 'rounded-rect', label: '角丸四角' },
        ],
      },
      {
        id: 'aspect_ratio',
        name: '縦横比',
        type: 'list',
        required: false,
        parentId: 'shape',
        showWhen: ['square', 'rounded-rect'],
        values: [
          { id: '1:1', label: '1:1（正方形）' },
          { id: '4:3', label: '4:3（横長）' },
          { id: '3:4', label: '3:4（縦長）' },
          { id: '16:9', label: '16:9（ワイド横）' },
          { id: '9:16', label: '9:16（ワイド縦）' },
        ],
      },
      {
        id: 'white_border',
        name: '白フチ（素材の縁取り）',
        type: 'list',
        required: false,
        description: '素材の輪郭に沿って、デザインを保護する白い縁取りを追加します（全形状対応）',
        values: [
          { id: 'none', label: 'なし' },
          { id: 'thin', label: '細め（約0.5mm）', priceModifier: { type: 'add', value: 5 } },
          { id: 'normal', label: '普通（約1mm）', priceModifier: { type: 'add', value: 8 } },
          { id: 'thick', label: '太め（約2mm）', priceModifier: { type: 'add', value: 12 } },
        ],
      },
      {
        id: 'back_print',
        name: '裏面印刷（透明部分への印刷）',
        type: 'list',
        required: false,
        description: 'アクリルの裏面・空白部分に印刷を追加（+20%）',
        values: [
          { id: 'none', label: 'なし' },
          { id: 'text', label: 'テキスト印刷（裏面に文字）', priceModifier: { type: 'multiply', value: 1.2 } },
          { id: 'same_shape', label: '裏面に同じデザイン（鏡像配置）', priceModifier: { type: 'multiply', value: 1.2 } },
          { id: 'within_frame', label: '裏面に別画像を枠内配置', priceModifier: { type: 'multiply', value: 1.2 } },
        ],
      },
      {
        id: 'back_text',
        name: '裏面テキスト',
        type: 'text',
        required: false,
        parentId: 'back_print',
        showWhen: ['text'],
        textPlaceholder: '例：©YourName 2026',
        textMaxLength: 80,
        description: '裏面に印刷する文字を入力してください（80文字以内）',
        values: [],
      },
      {
        id: 'double_sided',
        name: '印刷面',
        type: 'list',
        required: true,
        values: [
          { id: 'none', label: '片面印刷' },
          { id: 'double', label: '両面印刷', priceModifier: { type: 'multiply', value: 1.6 } },
        ],
      },
      {
        id: 'white_back',
        name: '裏面ホワイト（白押さえ）',
        type: 'list',
        required: false,
        parentId: 'double_sided',
        showWhen: ['none'],
        description: '片面印刷の裏側に白インクを敷いて、発色を鮮やかにします',
        values: [
          { id: 'none', label: 'なし' },
          { id: 'white', label: '裏面ホワイト挿入', priceModifier: { type: 'multiply', value: 1.2 } },
        ],
      },
      {
        id: 'white_middle',
        name: '中間ホワイト（両面の間に白挟み込み）',
        type: 'list',
        required: false,
        parentId: 'double_sided',
        showWhen: ['double'],
        description: '両面印刷の中間に白インクを挟み込み、表裏の透け感を防ぎます',
        values: [
          { id: 'none', label: 'なし' },
          { id: 'white', label: '中間ホワイト挿入', priceModifier: { type: 'multiply', value: 1.2 } },
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
    // 価格は44mm基準。市場相場調査(2026-04)より、国内缶バッジ製造業者の
    // 主要価格レンジに合わせて改訂。大ロットでも製造原価を下回らないように設定。
    // 参考相場: 100個¥60-95, 500個¥50-85, 1,000個¥46-75, 10,000個¥45-65
    priceTiers: [
      { minQuantity: 100, maxQuantity: 199, unitPrice: 95 },
      { minQuantity: 200, maxQuantity: 299, unitPrice: 88, discountPercent: 7 },
      { minQuantity: 300, maxQuantity: 499, unitPrice: 82, discountPercent: 14 },
      { minQuantity: 500, maxQuantity: 999, unitPrice: 72, discountPercent: 24 },
      { minQuantity: 1000, maxQuantity: 1999, unitPrice: 65, discountPercent: 32 },
      { minQuantity: 2000, maxQuantity: 2999, unitPrice: 60, discountPercent: 37 },
      { minQuantity: 3000, maxQuantity: 4999, unitPrice: 55, discountPercent: 42 },
      { minQuantity: 5000, maxQuantity: 9999, unitPrice: 52, discountPercent: 45 },
      { minQuantity: 10000, maxQuantity: 19999, unitPrice: 48, discountPercent: 49 },
      { minQuantity: 20000, maxQuantity: 29999, unitPrice: 45, discountPercent: 53 },
      { minQuantity: 30000, maxQuantity: 99999, unitPrice: 42, discountPercent: 56 },
      { minQuantity: 100000, maxQuantity: 200000, unitPrice: 40, discountPercent: 58 },
    ],
    options: [
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        required: true,
        values: [
          // サイズ比: 44mmを基準(1.0)に 相場比(0.65/0.85/1.0/1.15/1.70)で
          // multiply モディファイアを設定。add型だと大ロット時に比率が崩れるため
          { id: '25mm', label: '25mm', priceModifier: { type: 'multiply', value: 0.65 } },
          { id: '32mm', label: '32mm', priceModifier: { type: 'multiply', value: 0.85 } },
          { id: '44mm', label: '44mm' },
          { id: '55mm', label: '55mm', priceModifier: { type: 'multiply', value: 1.15 } },
          { id: '75mm', label: '75mm', priceModifier: { type: 'multiply', value: 1.70 } },
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
    // 2026-04 市場相場調査に基づき改訂。40mm基準。金型代別途。
    // 参考相場: 100個¥200-350, 1,000個¥150-220, 10,000個¥110-150, 100,000個¥85-110
    priceTiers: [
      { minQuantity: 50, maxQuantity: 100, unitPrice: 280 },
      { minQuantity: 101, maxQuantity: 200, unitPrice: 250, discountPercent: 11 },
      { minQuantity: 201, maxQuantity: 300, unitPrice: 225, discountPercent: 20 },
      { minQuantity: 301, maxQuantity: 500, unitPrice: 200, discountPercent: 29 },
      { minQuantity: 501, maxQuantity: 1000, unitPrice: 180, discountPercent: 36 },
      { minQuantity: 1001, maxQuantity: 2000, unitPrice: 160, discountPercent: 43 },
      { minQuantity: 2001, maxQuantity: 3000, unitPrice: 148, discountPercent: 47 },
      { minQuantity: 3001, maxQuantity: 5000, unitPrice: 138, discountPercent: 51 },
      { minQuantity: 5001, maxQuantity: 10000, unitPrice: 128, discountPercent: 54 },
      { minQuantity: 10001, maxQuantity: 20000, unitPrice: 118, discountPercent: 58 },
      { minQuantity: 20001, maxQuantity: 50000, unitPrice: 108, discountPercent: 61 },
      { minQuantity: 50001, maxQuantity: 100000, unitPrice: 100, discountPercent: 64 },
      { minQuantity: 100001, maxQuantity: 200000, unitPrice: 92, discountPercent: 67 },
    ],
    options: [
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        required: true,
        values: [
          // ピンバッジのサイズ比は材料費比率が低いためアクリル等より小さい
          // 20mm=0.70, 30mm=0.85, 40mm=1.0, 50mm=1.18, 60mm=1.35, 70mm=1.55, 80mm=1.75
          { id: '20mm', label: '20mm', priceModifier: { type: 'multiply', value: 0.70 } },
          { id: '30mm', label: '30mm', priceModifier: { type: 'multiply', value: 0.85 } },
          { id: '40mm', label: '40mm' },
          { id: '50mm', label: '50mm', priceModifier: { type: 'multiply', value: 1.18 } },
          { id: '60mm', label: '60mm', priceModifier: { type: 'multiply', value: 1.35 } },
          { id: '70mm', label: '70mm', priceModifier: { type: 'multiply', value: 1.55 } },
          { id: '80mm', label: '80mm', priceModifier: { type: 'multiply', value: 1.75 } },
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
          { id: 'square', label: '四角' },
          { id: 'rounded-rect', label: '角丸四角' },
          { id: 'heart', label: 'ハート型' },
          { id: 'star', label: '星型' },
        ],
      },
      {
        id: 'aspect_ratio',
        name: '縦横比',
        type: 'list',
        required: false,
        parentId: 'shape',
        showWhen: ['square', 'rounded-rect'],
        values: [
          { id: '1:1', label: '1:1（正方形）' },
          { id: '4:3', label: '4:3（横長）' },
          { id: '3:4', label: '3:4（縦長）' },
          { id: '16:9', label: '16:9（ワイド横）' },
          { id: '9:16', label: '9:16（ワイド縦）' },
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
    // 2026-04 市場相場調査に基づき改訂。50mm基準。金型代別途。
    // 参考相場: 100個¥140-200, 1,000個¥95-140, 10,000個¥65-85, 100,000個¥45-55
    priceTiers: [
      { minQuantity: 50, maxQuantity: 100, unitPrice: 170 },
      { minQuantity: 101, maxQuantity: 200, unitPrice: 150, discountPercent: 12 },
      { minQuantity: 201, maxQuantity: 300, unitPrice: 138, discountPercent: 19 },
      { minQuantity: 301, maxQuantity: 500, unitPrice: 125, discountPercent: 26 },
      { minQuantity: 501, maxQuantity: 1000, unitPrice: 110, discountPercent: 35 },
      { minQuantity: 1001, maxQuantity: 2000, unitPrice: 95, discountPercent: 44 },
      { minQuantity: 2001, maxQuantity: 3000, unitPrice: 88, discountPercent: 48 },
      { minQuantity: 3001, maxQuantity: 5000, unitPrice: 82, discountPercent: 52 },
      { minQuantity: 5001, maxQuantity: 10000, unitPrice: 75, discountPercent: 56 },
      { minQuantity: 10001, maxQuantity: 20000, unitPrice: 68, discountPercent: 60 },
      { minQuantity: 20001, maxQuantity: 50000, unitPrice: 62, discountPercent: 64 },
      { minQuantity: 50001, maxQuantity: 100000, unitPrice: 56, discountPercent: 67 },
      { minQuantity: 100001, maxQuantity: 200000, unitPrice: 52, discountPercent: 69 },
    ],
    options: [
      {
        id: 'size',
        name: 'サイズ',
        type: 'list',
        required: true,
        values: [
          // サイズ比: 50mmを基準(1.0)に面積比相場に合わせて multiply 化
          // 40mm=0.80, 50mm=1.0, 60mm=1.25, 70mm=1.50, 80mm=1.80, 100mm=2.40
          { id: '40mm', label: '40mm', priceModifier: { type: 'multiply', value: 0.80 } },
          { id: '50mm', label: '50mm' },
          { id: '60mm', label: '60mm', priceModifier: { type: 'multiply', value: 1.25 } },
          { id: '70mm', label: '70mm', priceModifier: { type: 'multiply', value: 1.50 } },
          { id: '80mm', label: '80mm', priceModifier: { type: 'multiply', value: 1.80 } },
          { id: '100mm', label: '100mm', priceModifier: { type: 'multiply', value: 2.40 } },
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
          { id: 'square', label: '四角' },
          { id: 'rounded-rect', label: '角丸四角' },
        ],
      },
      {
        id: 'aspect_ratio',
        name: '縦横比',
        type: 'list',
        required: false,
        parentId: 'shape',
        showWhen: ['square', 'rounded-rect'],
        values: [
          { id: '1:1', label: '1:1（正方形）' },
          { id: '4:3', label: '4:3（横長）' },
          { id: '3:4', label: '3:4（縦長）' },
          { id: '16:9', label: '16:9（ワイド横）' },
          { id: '9:16', label: '9:16（ワイド縦）' },
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

/**
 * When the bulk-discount tier above yields a LOWER total price than the
 * user's current selection (can happen where tier pricing isn't strictly
 * monotone in total), return the suggestion details; else null.
 *
 * Example: 499個 @¥83 = ¥41,417 but 500個 @¥55 = ¥27,500 — returns
 * { suggestedQuantity: 500, newTotal: 27500, saving: 13917 }.
 */
export function findCheaperTierSuggestion(
  product: Product,
  currentQuantity: number,
  selectedOptions?: Record<string, string>,
): { suggestedQuantity: number; newTotal: number; saving: number } | null {
  if (!product.priceTiers || product.priceTiers.length === 0) return null
  const currentTotal = calculateTotalPrice(product, currentQuantity, selectedOptions)
  // For each tier whose minQuantity > current, compute the cost at that minQuantity
  for (const tier of product.priceTiers) {
    if (tier.minQuantity <= currentQuantity) continue
    if (tier.minQuantity > product.maxQuantity) continue
    const candidateTotal = calculateTotalPrice(product, tier.minQuantity, selectedOptions)
    if (candidateTotal < currentTotal) {
      return {
        suggestedQuantity: tier.minQuantity,
        newTotal: candidateTotal,
        saving: currentTotal - candidateTotal,
      }
    }
  }
  return null
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

  // Two-pass modifier evaluation to remove dependence on iteration order:
  //  1. Sum all 'add' modifiers (including number-type pricePerUnit increments)
  //  2. Apply all 'multiply' modifiers in sequence on top.
  // This matches lib/products.ts:calculateShippingModifier and the server's
  // app/actions/stripe.ts:computeUnitPrice to prevent security.price_mismatch
  // warnings when client and server iterate options in different orders.
  let addTotal = 0
  const multipliers: number[] = []

  for (const [optionId, selectedValue] of Object.entries(selectedOptions)) {
    const option = product.options.find((o) => o.id === optionId)
    if (!option) continue

    // number type: input value × pricePerUnit counts as additive
    if (option.type === 'number' && option.pricePerUnit) {
      const num = parseFloat(selectedValue)
      if (!isNaN(num)) addTotal += Math.round(num * option.pricePerUnit)
      continue
    }

    const collectFromValue = (val: OptionValue | undefined) => {
      const mod = val?.priceModifier
      if (!mod) return
      if (mod.type === 'add') addTotal += mod.value
      else if (mod.type === 'multiply') multipliers.push(mod.value)
    }

    if (option.type === 'checkbox' || option.multiSelect) {
      for (const id of selectedValue.split(',').filter(Boolean)) {
        collectFromValue(option.values.find((v) => v.id === id || v.label === id))
      }
      continue
    }

    collectFromValue(option.values.find((v) => v.id === selectedValue || v.label === selectedValue))
  }

  let price = base + addTotal
  for (const m of multipliers) price = Math.round(price * m)
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
  // Two-pass evaluation so the result is deterministic regardless of JS
  // iteration order of selectedOptions:
  //   1. sum all 'add' modifiers
  //   2. then apply all 'multiply' modifiers to the running total
  let addTotal = 0
  const multipliers: number[] = []
  for (const [optionId, selectedValue] of Object.entries(selectedOptions)) {
    const option = product.options.find((o) => o.id === optionId)
    if (!option) continue

    const collectModifier = (val: OptionValue | undefined) => {
      if (!val?.shippingModifier) return
      if (val.shippingModifier.type === 'add') addTotal += val.shippingModifier.value
      else if (val.shippingModifier.type === 'multiply') multipliers.push(val.shippingModifier.value)
    }

    if (option.type === 'checkbox' || option.multiSelect) {
      for (const id of selectedValue.split(',').filter(Boolean)) {
        collectModifier(option.values.find((v) => v.id === id || v.label === id))
      }
    } else {
      collectModifier(option.values.find((v) => v.id === selectedValue || v.label === selectedValue))
    }
  }
  // Apply additions first, then multipliers against the running total.
  let total = addTotal
  for (const m of multipliers) {
    total = Math.round(total * m)
  }
  return total
}

export function formatPrice(priceInYen: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(priceInYen)
}
