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

// ── Deprecated: zone-based shipping (kept for backward compatibility) ─────────

/** @deprecated Use quantity-based shipping instead. */
export type ShippingZone = 'mainland' | 'okinawa' | 'remote_island'

/** @deprecated Use SHIPPING_TIERS + calculateShippingByQuantity() instead. */
export const SHIPPING_FEES: Record<ShippingZone, number> = {
  mainland: 0,
  okinawa: 1500,
  remote_island: 2000,
}

/** @deprecated No longer used — shipping is quantity-based. */
export const SHIPPING_ZONE_LABELS: Record<ShippingZone, string> = {
  mainland: '送料無料',
  okinawa: '遠隔地送料（沖縄）',
  remote_island: '離島送料',
}

/**
 * @deprecated Zone-based shipping is no longer active. Kept for reference only.
 */
const REMOTE_ISLAND_PREFIXES: ReadonlySet<string> = new Set([
  '1002',
  '6850','6851','6852','6853','6854',
  '6855','6856','6857','6858','6859',
  '8115',
  '8170','8171','8172','8173','8174',
  '8175','8176','8177','8178','8179',
  '8940','8941','8942','8943','8944',
  '8945','8946','8947','8948','8949',
  '8960','8961','8962','8963','8964',
  '8965','8966','8967','8968','8969',
  '9060','9061','9062','9063','9064','9065','9066',
  '9070','9071','9072','9073','9074','9075','9076',
  '9080','9081','9082','9083','9084','9085','9086',
  '9090','9091','9092','9093','9094','9095','9096',
  '9520','9521','9522','9523','9524',
])

/** @deprecated Use calculateShippingByQuantity() instead. */
export function getShippingZone(postalCode: string, prefecture: string): ShippingZone {
  const digits = postalCode
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s　\-－]/g, '')
  const prefix4 = digits.slice(0, 4)

  if (REMOTE_ISLAND_PREFIXES.has(prefix4)) return 'remote_island'
  if (prefecture.trim().startsWith('沖縄')) return 'okinawa'
  return 'mainland'
}

/** @deprecated Use calculateShippingByQuantity() instead. */
export function calculateShippingFee(
  postalCode: string,
  prefecture: string,
  fees: Record<ShippingZone, number> = SHIPPING_FEES,
): number {
  return fees[getShippingZone(postalCode, prefecture)]
}
