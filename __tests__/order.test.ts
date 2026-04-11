import { describe, it, expect } from 'vitest'
import { generateOrderId } from '@/lib/order'

describe('generateOrderId', () => {
  it('returns a string in FO-XXXXXX-XXXXXX format', () => {
    const id = generateOrderId()
    expect(id).toMatch(/^FO-[A-HJ-NP-Z2-9]{6}-[A-HJ-NP-Z2-9]{6}$/)
  })

  it('excludes ambiguous characters (0, O, 1, I)', () => {
    // The alphabet excludes 0, O, 1, I (but includes L)
    for (let i = 0; i < 100; i++) {
      const id = generateOrderId()
      const chars = id.replace('FO-', '').replace('-', '')
      expect(chars).not.toMatch(/[01OI]/)
    }
  })

  it('generates unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateOrderId())
    }
    expect(ids.size).toBe(100)
  })

  it('has correct length', () => {
    const id = generateOrderId()
    // FO- (3) + 6 + - (1) + 6 = 16
    expect(id).toHaveLength(16)
  })
})
