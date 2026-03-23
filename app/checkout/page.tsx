import { Metadata } from 'next'
import { CheckoutClient } from './checkout-client'
import { createServiceClient } from '@/lib/supabase/service'
import { SHIPPING_FEES, type ShippingZone } from '@/lib/shipping'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '注文手続き',
  description: '配送先情報を入力して注文を完了',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  // Fetch shipping fees from DB, fall back to hardcoded defaults
  const supabase = createServiceClient()
  const { data: rows } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['shipping_fee_okinawa', 'shipping_fee_remote_island'])

  const s: Record<string, string> = {}
  for (const row of rows ?? []) s[row.key] = row.value

  const shippingFees: Record<ShippingZone, number> = {
    mainland: 0,
    okinawa: parseInt(s.shipping_fee_okinawa ?? '') || SHIPPING_FEES.okinawa,
    remote_island: parseInt(s.shipping_fee_remote_island ?? '') || SHIPPING_FEES.remote_island,
  }

  return <CheckoutClient shippingFees={shippingFees} />
}
