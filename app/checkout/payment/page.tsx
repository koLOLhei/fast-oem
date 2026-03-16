import { Metadata } from 'next'
import { PaymentClient } from './payment-client'

export const metadata: Metadata = {
  title: 'お支払い',
  description: 'クレジットカードでお支払い',
}

export default function PaymentPage() {
  return <PaymentClient />
}
