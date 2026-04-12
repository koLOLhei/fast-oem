import { describe, it, expect } from 'vitest'
import {
  calculateShippingByQuantity,
  calculateExpressShipping,
  SHIPPING_TIERS,
} from '@/lib/shipping'

describe('SHIPPING_TIERS', () => {
  it('has 6 fixed tiers', () => {
    expect(SHIPPING_TIERS).toHaveLength(6)
  })

  it('first tier starts at 1', () => {
    expect(SHIPPING_TIERS[0].minQuantity).toBe(1)
  })

  it('last tier ends at 4000', () => {
    expect(SHIPPING_TIERS[SHIPPING_TIERS.length - 1].maxQuantity).toBe(4000)
  })
})

describe('calculateShippingByQuantity', () => {
  it('returns 0 for quantity 0', () => {
    expect(calculateShippingByQuantity(0)).toBe(0)
  })

  it('returns ¥5,000 for 1 item', () => {
    expect(calculateShippingByQuantity(1)).toBe(5000)
  })

  it('returns ¥5,000 for 300 items', () => {
    expect(calculateShippingByQuantity(300)).toBe(5000)
  })

  it('returns ¥8,000 for 301 items', () => {
    expect(calculateShippingByQuantity(301)).toBe(8000)
  })

  it('returns ¥8,000 for 500 items', () => {
    expect(calculateShippingByQuantity(500)).toBe(8000)
  })

  it('returns ¥11,000 for 501 items', () => {
    expect(calculateShippingByQuantity(501)).toBe(11000)
  })

  it('returns ¥11,000 for 1000 items', () => {
    expect(calculateShippingByQuantity(1000)).toBe(11000)
  })

  it('returns ¥16,000 for 2000 items', () => {
    expect(calculateShippingByQuantity(2000)).toBe(16000)
  })

  it('returns ¥18,000 for 3000 items', () => {
    expect(calculateShippingByQuantity(3000)).toBe(18000)
  })

  it('returns ¥20,000 for 4000 items', () => {
    expect(calculateShippingByQuantity(4000)).toBe(20000)
  })

  // Above 4000: ¥20,000 + ¥2,000 per 1,000-unit block
  it('returns ¥22,000 for 4001 items (1 excess block)', () => {
    expect(calculateShippingByQuantity(4001)).toBe(22000)
  })

  it('returns ¥22,000 for 5000 items (1 excess block)', () => {
    expect(calculateShippingByQuantity(5000)).toBe(22000)
  })

  it('returns ¥24,000 for 5001 items (2 excess blocks)', () => {
    expect(calculateShippingByQuantity(5001)).toBe(24000)
  })

  it('returns ¥30,000 for 9000 items (5 excess blocks)', () => {
    expect(calculateShippingByQuantity(9000)).toBe(30000)
  })
})

describe('calculateExpressShipping', () => {
  it('doubles the base fee', () => {
    expect(calculateExpressShipping(5000)).toBe(10000)
  })

  it('returns 0 when base is 0', () => {
    expect(calculateExpressShipping(0)).toBe(0)
  })
})
