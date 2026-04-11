import { describe, it, expect } from 'vitest'

/**
 * Tests for C-2: access_token expiry validation logic.
 *
 * The actual check is performed inline in route handlers / pages:
 *   if (order.access_token_expires_at && new Date(order.access_token_expires_at) < new Date()) { ... }
 *
 * These tests verify the logic itself works correctly for various edge cases.
 */

function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false // NULL = no expiry (backward compat)
  return new Date(expiresAt) < new Date()
}

describe('access_token expiry check', () => {
  it('returns false when expires_at is null (backward compat)', () => {
    expect(isTokenExpired(null)).toBe(false)
  })

  it('returns false when token expires in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString() // +1 day
    expect(isTokenExpired(future)).toBe(false)
  })

  it('returns true when token expired in the past', () => {
    const past = new Date(Date.now() - 86400000).toISOString() // -1 day
    expect(isTokenExpired(past)).toBe(true)
  })

  it('returns true when token expired 1 second ago', () => {
    const justExpired = new Date(Date.now() - 1000).toISOString()
    expect(isTokenExpired(justExpired)).toBe(true)
  })

  it('returns false when token expires 1 second from now', () => {
    const almostExpired = new Date(Date.now() + 1000).toISOString()
    expect(isTokenExpired(almostExpired)).toBe(false)
  })

  it('handles ISO string format with timezone', () => {
    const past = '2020-01-01T00:00:00.000Z'
    expect(isTokenExpired(past)).toBe(true)
  })

  it('handles far-future expiry', () => {
    const farFuture = '2099-12-31T23:59:59.000Z'
    expect(isTokenExpired(farFuture)).toBe(false)
  })
})
