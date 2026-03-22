export type ShippingZone = 'mainland' | 'okinawa' | 'remote_island'

export const SHIPPING_FEES: Record<ShippingZone, number> = {
  mainland: 0,
  okinawa: 1500,
  remote_island: 2000,
}

export const SHIPPING_ZONE_LABELS: Record<ShippingZone, string> = {
  mainland: '送料無料',
  okinawa: '遠隔地送料（沖縄）',
  remote_island: '離島送料',
}

/**
 * 4-digit prefixes of 7-digit postal codes that belong to remote islands (離島).
 * These areas incur an additional shipping surcharge of ¥2,000.
 */
const REMOTE_ISLAND_PREFIXES: ReadonlySet<string> = new Set([
  '1002',                                                 // 小笠原諸島（東京都）
  '6850','6851','6852','6853','6854',
  '6855','6856','6857','6858','6859',                     // 隠岐諸島（島根県）
  '8115',                                                 // 壱岐島（長崎県）
  '8170','8171','8172','8173','8174',
  '8175','8176','8177','8178','8179',                     // 対馬（長崎県）
  '8940','8941','8942','8943','8944',
  '8945','8946','8947','8948','8949',                     // 奄美大島・加計呂麻島等（鹿児島県）
  '8960','8961','8962','8963','8964',
  '8965','8966','8967','8968','8969',                     // 徳之島・沖永良部島等（鹿児島県）
  '9060','9061','9062','9063','9064','9065','9066',        // 宮古諸島（沖縄県）
  '9070','9071','9072','9073','9074','9075','9076',        // 石垣島・八重山諸島（沖縄県）
  '9080','9081','9082','9083','9084','9085','9086',        // 与那国島等（沖縄県）
  '9090','9091','9092','9093','9094','9095','9096',        // 久米島等（沖縄県）
  '9520','9521','9522','9523','9524',                     // 佐渡島（新潟県）
])

export function getShippingZone(postalCode: string, prefecture: string): ShippingZone {
  // Normalize postal code: convert full-width digits → half-width, strip spaces and hyphens
  const digits = postalCode
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s　\-－]/g, '')
  const prefix4 = digits.slice(0, 4)

  // Remote island check takes priority (includes some Okinawa islands)
  if (REMOTE_ISLAND_PREFIXES.has(prefix4)) return 'remote_island'

  // Okinawa main island — accept with or without trailing '県'
  if (prefecture.trim().startsWith('沖縄')) return 'okinawa'

  return 'mainland'
}

export function calculateShippingFee(
  postalCode: string,
  prefecture: string,
  fees: Record<ShippingZone, number> = SHIPPING_FEES,
): number {
  return fees[getShippingZone(postalCode, prefecture)]
}
