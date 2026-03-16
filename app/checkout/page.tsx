import { Metadata } from 'next'
import { CheckoutClient } from './checkout-client'

export const metadata: Metadata = {
  title: '注文手続き',
  description: '配送先情報を入力して注文を完了',
}

export default function CheckoutPage() {
  return <CheckoutClient />
}
