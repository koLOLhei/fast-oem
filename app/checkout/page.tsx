import { Metadata } from 'next'
import { CheckoutClient } from './checkout-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '注文手続き',
  description: '配送先情報を入力して注文を完了',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  // Shipping fees are now quantity-based (computed client-side from cart).
  // No DB lookup needed.
  return <CheckoutClient />
}
