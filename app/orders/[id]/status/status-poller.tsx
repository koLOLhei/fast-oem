'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StatusPollerProps {
  orderId: string
  currentStatus: string
  intervalMs?: number
}

export function StatusPoller({ orderId, currentStatus, intervalMs = 5000 }: StatusPollerProps) {
  const router = useRouter()

  useEffect(() => {
    // pending または processing の場合のみポーリング
    if (!['pending', 'processing'].includes(currentStatus)) return

    const interval = setInterval(() => {
      router.refresh()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [orderId, currentStatus, intervalMs, router])

  return null
}
