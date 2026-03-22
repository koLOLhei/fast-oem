import { Metadata } from 'next'
import { CompleteClient } from './complete-client'

export const metadata: Metadata = {
  title: '注文完了',
  description: 'ご注文ありがとうございます',
  robots: { index: false, follow: false },
}

export default function CompletePage() {
  return <CompleteClient />
}
