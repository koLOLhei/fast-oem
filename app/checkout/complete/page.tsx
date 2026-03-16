import { Metadata } from 'next'
import { CompleteClient } from './complete-client'

export const metadata: Metadata = {
  title: '注文完了',
  description: 'ご注文ありがとうございます',
}

export default function CompletePage() {
  return <CompleteClient />
}
