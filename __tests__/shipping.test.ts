import { describe, it, expect } from 'vitest'
import { getShippingZone, calculateShippingFee, SHIPPING_FEES } from '@/lib/shipping'

describe('getShippingZone', () => {
  it('returns mainland for standard Tokyo address', () => {
    expect(getShippingZone('1000001', '東京都')).toBe('mainland')
  })

  it('returns mainland for Osaka', () => {
    expect(getShippingZone('5300001', '大阪府')).toBe('mainland')
  })

  it('returns okinawa for Okinawa main island', () => {
    expect(getShippingZone('9000001', '沖縄県')).toBe('okinawa')
  })

  it('returns okinawa for 沖縄 without 県', () => {
    expect(getShippingZone('9000001', '沖縄')).toBe('okinawa')
  })

  it('returns remote_island for Ogasawara (東京都 remote island)', () => {
    expect(getShippingZone('1002100', '東京都')).toBe('remote_island')
  })

  it('returns remote_island for Amami (鹿児島県 remote island)', () => {
    expect(getShippingZone('8940001', '鹿児島県')).toBe('remote_island')
  })

  it('returns remote_island for Miyako Islands (沖縄県 remote island)', () => {
    // Miyako postal prefix 9060 — remote island takes priority over okinawa
    expect(getShippingZone('9060001', '沖縄県')).toBe('remote_island')
  })

  it('returns remote_island for Sado Island (新潟県)', () => {
    expect(getShippingZone('9520001', '新潟県')).toBe('remote_island')
  })

  it('handles full-width digit postal codes', () => {
    expect(getShippingZone('１００００１', '東京都')).toBe('mainland')
  })

  it('handles postal codes with hyphens', () => {
    expect(getShippingZone('100-0001', '東京都')).toBe('mainland')
  })

  it('handles postal codes with full-width hyphens', () => {
    expect(getShippingZone('100－0001', '東京都')).toBe('mainland')
  })
})

describe('calculateShippingFee', () => {
  it('returns 0 for mainland', () => {
    expect(calculateShippingFee('1000001', '東京都')).toBe(0)
  })

  it('returns 1500 for Okinawa', () => {
    expect(calculateShippingFee('9000001', '沖縄県')).toBe(1500)
  })

  it('returns 2000 for remote island', () => {
    expect(calculateShippingFee('1002100', '東京都')).toBe(2000)
  })

  it('accepts custom fee schedule', () => {
    const customFees = { mainland: 100, okinawa: 2000, remote_island: 3000 }
    expect(calculateShippingFee('9000001', '沖縄県', customFees)).toBe(2000)
  })
})

describe('SHIPPING_FEES defaults', () => {
  it('has correct default values', () => {
    expect(SHIPPING_FEES.mainland).toBe(0)
    expect(SHIPPING_FEES.okinawa).toBe(1500)
    expect(SHIPPING_FEES.remote_island).toBe(2000)
  })
})
