import { describe, it, expect } from 'vitest'
import {
  isValidUUID,
  MAX_UNIT_PRICE_JPY,
  MAX_PASSWORD_LENGTH,
  MAX_ADDRESSEE_LENGTH,
  MAX_CHECKBOX_VALUES,
} from '@/lib/validation'

describe('isValidUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('accepts uppercase UUID', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  it('accepts mixed case UUID', () => {
    expect(isValidUUID('550e8400-E29B-41d4-a716-446655440000')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidUUID('')).toBe(false)
  })

  it('rejects non-UUID string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false)
  })

  it('rejects UUID without dashes', () => {
    expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false)
  })

  it('rejects UUID with extra characters', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000x')).toBe(false)
  })

  it('rejects SQL injection attempt', () => {
    expect(isValidUUID("'; DROP TABLE orders; --")).toBe(false)
  })

  it('rejects path traversal', () => {
    expect(isValidUUID('../../etc/passwd')).toBe(false)
  })

  it('rejects UUID with wrong section lengths', () => {
    expect(isValidUUID('550e840-e29b-41d4-a716-446655440000')).toBe(false)
    expect(isValidUUID('550e8400-e29-41d4-a716-446655440000')).toBe(false)
  })
})

describe('Validation constants', () => {
  it('MAX_UNIT_PRICE_JPY is 1 million', () => {
    expect(MAX_UNIT_PRICE_JPY).toBe(1_000_000)
  })

  it('MAX_PASSWORD_LENGTH is 128', () => {
    expect(MAX_PASSWORD_LENGTH).toBe(128)
  })

  it('MAX_ADDRESSEE_LENGTH is 100', () => {
    expect(MAX_ADDRESSEE_LENGTH).toBe(100)
  })

  it('MAX_CHECKBOX_VALUES is 50', () => {
    expect(MAX_CHECKBOX_VALUES).toBe(50)
  })
})
