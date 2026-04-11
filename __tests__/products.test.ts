import { describe, it, expect } from 'vitest'
import {
  calculateUnitPrice,
  calculateTotalPrice,
  calculateMoldFee,
  calculateShippingModifier,
  formatPrice,
  type Product,
  type PriceTier,
} from '@/lib/products'

// ── Test fixtures ────────────────────────────────────────────────────────────

const baseTiers: PriceTier[] = [
  { minQuantity: 50, maxQuantity: 100, unitPrice: 73 },
  { minQuantity: 101, maxQuantity: 200, unitPrice: 70 },
  { minQuantity: 201, maxQuantity: 500, unitPrice: 65 },
]

const baseProduct: Product = {
  id: 'test-product',
  slug: 'test-product',
  name: 'テスト商品',
  description: '',
  shortDescription: '',
  category: 'keychain',
  priceTiers: baseTiers,
  options: [],
  minQuantity: 50,
  maxQuantity: 500,
  imageUrl: '',
  features: [],
  quantityPresets: [],
}

const productWithOptions: Product = {
  ...baseProduct,
  options: [
    {
      id: 'color',
      name: '色',
      type: 'list',
      values: [
        { id: 'clear', label: '透明' },
        { id: 'gold', label: 'ゴールド', priceModifier: { type: 'add', value: 10 } },
        { id: 'premium', label: 'プレミアム', priceModifier: { type: 'multiply', value: 1.5 } },
      ],
    },
    {
      id: 'thickness',
      name: '厚み',
      type: 'number',
      pricePerUnit: 5,
      numberMin: 1,
      numberMax: 10,
      numberUnit: 'mm',
      values: [],
    },
    {
      id: 'extras',
      name: 'オプション',
      type: 'checkbox',
      multiSelect: true,
      values: [
        { id: 'glitter', label: 'ラメ', priceModifier: { type: 'add', value: 5 } },
        { id: 'glow', label: '蓄光', priceModifier: { type: 'add', value: 8 } },
      ],
    },
  ],
}

const productWithMold: Product = {
  ...baseProduct,
  requiresMold: true,
  moldFee: 3000,
  options: [
    {
      id: 'shape',
      name: '形',
      type: 'list',
      values: [
        { id: 'circle', label: '円形', requiresMold: false, moldFee: 0 },
        { id: 'die-cut', label: '型抜き', requiresMold: true, moldFee: 5000 },
      ],
    },
  ],
}

const productWithShipping: Product = {
  ...baseProduct,
  options: [
    {
      id: 'packaging',
      name: '梱包',
      type: 'list',
      values: [
        { id: 'normal', label: '通常' },
        { id: 'special', label: '特殊梱包', shippingModifier: { type: 'add', value: 500 } },
      ],
    },
  ],
}

// ── calculateUnitPrice ───────────────────────────────────────────────────────

describe('calculateUnitPrice', () => {
  it('returns correct price for quantity in first tier', () => {
    expect(calculateUnitPrice(baseProduct, 50)).toBe(73)
    expect(calculateUnitPrice(baseProduct, 100)).toBe(73)
  })

  it('returns correct price for quantity in middle tier', () => {
    expect(calculateUnitPrice(baseProduct, 150)).toBe(70)
  })

  it('returns correct price for quantity in last tier', () => {
    expect(calculateUnitPrice(baseProduct, 300)).toBe(65)
    expect(calculateUnitPrice(baseProduct, 500)).toBe(65)
  })

  it('uses first tier price for quantity below min', () => {
    expect(calculateUnitPrice(baseProduct, 10)).toBe(73)
  })

  it('uses last tier price for quantity above max', () => {
    expect(calculateUnitPrice(baseProduct, 1000)).toBe(65)
  })

  it('returns base price with no options selected', () => {
    expect(calculateUnitPrice(productWithOptions, 100)).toBe(73)
  })

  it('applies add modifier for single-select option', () => {
    expect(calculateUnitPrice(productWithOptions, 100, { color: 'gold' })).toBe(83)
  })

  it('applies add modifier when matching by label', () => {
    expect(calculateUnitPrice(productWithOptions, 100, { color: 'ゴールド' })).toBe(83)
  })

  it('applies multiply modifier', () => {
    // 73 * 1.5 = 109.5 → round to 110
    expect(calculateUnitPrice(productWithOptions, 100, { color: 'premium' })).toBe(110)
  })

  it('applies number type modifier', () => {
    // 73 + round(3 * 5) = 73 + 15 = 88
    expect(calculateUnitPrice(productWithOptions, 100, { thickness: '3' })).toBe(88)
  })

  it('applies checkbox modifiers cumulatively', () => {
    // 73 + 5 (glitter) + 8 (glow) = 86
    expect(calculateUnitPrice(productWithOptions, 100, { extras: 'glitter,glow' })).toBe(86)
  })

  it('ignores unknown option IDs', () => {
    expect(calculateUnitPrice(productWithOptions, 100, { nonexistent: 'value' })).toBe(73)
  })

  it('ignores option without priceModifier', () => {
    expect(calculateUnitPrice(productWithOptions, 100, { color: 'clear' })).toBe(73)
  })

  it('applies fixedUnitPrice — ignores option modifiers', () => {
    const fixed = { ...productWithOptions, fixedUnitPrice: true }
    expect(calculateUnitPrice(fixed, 100, { color: 'gold' })).toBe(73)
  })

  it('combines multiple option types', () => {
    // base 73 + gold(+10) + thickness 2mm(+10) + glitter(+5) = 98
    const result = calculateUnitPrice(productWithOptions, 100, {
      color: 'gold',
      thickness: '2',
      extras: 'glitter',
    })
    expect(result).toBe(98)
  })
})

// ── calculateTotalPrice ──────────────────────────────────────────────────────

describe('calculateTotalPrice', () => {
  it('multiplies unit price by quantity', () => {
    expect(calculateTotalPrice(baseProduct, 100)).toBe(7300)
  })

  it('applies options before multiplying', () => {
    // (73 + 10) * 100 = 8300
    expect(calculateTotalPrice(productWithOptions, 100, { color: 'gold' })).toBe(8300)
  })
})

// ── calculateMoldFee ─────────────────────────────────────────────────────────

describe('calculateMoldFee', () => {
  it('returns product-level mold fee when no options', () => {
    const { requiresMold, moldFee } = calculateMoldFee(productWithMold)
    expect(requiresMold).toBe(true)
    expect(moldFee).toBe(3000)
  })

  it('returns no mold for product without requiresMold', () => {
    const { requiresMold, moldFee } = calculateMoldFee(baseProduct)
    expect(requiresMold).toBe(false)
    expect(moldFee).toBe(0)
  })

  it('uses option-level mold fee when option values have mold settings', () => {
    const { requiresMold, moldFee } = calculateMoldFee(productWithMold, { shape: 'die-cut' })
    expect(requiresMold).toBe(true)
    expect(moldFee).toBe(5000)
  })

  it('returns no mold for option value with requiresMold=false', () => {
    const { requiresMold, moldFee } = calculateMoldFee(productWithMold, { shape: 'circle' })
    expect(requiresMold).toBe(false)
    expect(moldFee).toBe(0)
  })
})

// ── calculateShippingModifier ────────────────────────────────────────────────

describe('calculateShippingModifier', () => {
  it('returns 0 when no options selected', () => {
    expect(calculateShippingModifier(productWithShipping)).toBe(0)
  })

  it('returns 0 for option without shipping modifier', () => {
    expect(calculateShippingModifier(productWithShipping, { packaging: 'normal' })).toBe(0)
  })

  it('returns shipping add modifier', () => {
    expect(calculateShippingModifier(productWithShipping, { packaging: 'special' })).toBe(500)
  })
})

// ── formatPrice ──────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats price in JPY', () => {
    expect(formatPrice(1000)).toBe('￥1,000')
  })

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('￥0')
  })

  it('formats large amount', () => {
    expect(formatPrice(1000000)).toBe('￥1,000,000')
  })
})
