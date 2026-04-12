// ── Quantity-based shipping fee system (tax-included) ─────────────────────────

export interface ShippingTier {
  minQuantity: number
  maxQuantity: number
  fee: number
}

/**
 * Fixed shipping tiers. For quantities above 4,000 the fee is computed
 * dynamically — see calculateShippingByQuantity().
 */
export const SHIPPING_TIERS: readonly ShippingTier[] = [
  { minQuantity: 1, maxQuantity: 300, fee: 5_000 },
  { minQuantity: 301, maxQuantity: 500, fee: 8_000 },
  { minQuantity: 501, maxQuantity: 1_000, fee: 11_000 },
  { minQuantity: 1_001, maxQuantity: 2_000, fee: 16_000 },
  { minQuantity: 2_001, maxQuantity: 3_000, fee: 18_000 },
  { minQuantity: 3_001, maxQuantity: 4_000, fee: 20_000 },
] as const

/**
 * Calculate shipping fee based on total order quantity (all cart items summed).
 *
 * For quantities above 4,000 the fee continues at ¥2,000 per additional
 * 1,000-unit block (partial blocks of 1,000+ still incur the full ¥2,000).
 */
export function calculateShippingByQuantity(totalQuantity: number): number {
  if (totalQuantity <= 0) return 0

  // Check fixed tiers first
  const tier = SHIPPING_TIERS.find(
    (t) => totalQuantity >= t.minQuantity && totalQuantity <= t.maxQuantity,
  )
  if (tier) return tier.fee

  // Above 4,000: base ¥20,000 + ¥2,000 per 1,000-unit increment
  const lastTier = SHIPPING_TIERS[SHIPPING_TIERS.length - 1]
  const excess = totalQuantity - lastTier.maxQuantity
  const additionalBlocks = Math.ceil(excess / 1_000)
  return lastTier.fee + additionalBlocks * 2_000
}

/**
 * Express delivery surcharge: 100% of the base shipping fee.
 */
export function calculateExpressShipping(baseFee: number): number {
  return baseFee * 2
}

