import { Metadata } from 'next'
import { CartClient } from './cart-client'

export const metadata: Metadata = {
  title: 'カート',
  description: 'ショッピングカートの内容を確認',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return <CartClient />
}
