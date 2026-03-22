'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Invisible client component that polls for order status changes.
 * Mounted inside the (server-rendered) status page, it refreshes the
 * Next.js route every `intervalMs` milliseconds so updates made by the
 * factory or admin appear without the customer needing to reload manually.
 *
 * When the order reaches a terminal status (shipped / completed / cancelled /
 * refunded) the interval is slowed to 5 minutes — frequent polling is only
 * useful while the order is still in flight.
 */

const TERMINAL_STATUSES = new Set(['shipped', 'completed', 'cancelled', 'refunded'])

interface StatusPollerProps {
    orderId: string
    currentStatus: string
    intervalMs?: number
}

export function StatusPoller({ orderId: _orderId, currentStatus, intervalMs = 30_000 }: StatusPollerProps) {
    const router = useRouter()
    const effectiveInterval = TERMINAL_STATUSES.has(currentStatus) ? 5 * 60_000 : intervalMs
    const intervalRef = useRef(effectiveInterval)
    intervalRef.current = effectiveInterval

    useEffect(() => {
        let timerId: ReturnType<typeof setTimeout>

        const schedule = () => {
            timerId = setTimeout(() => {
                router.refresh()
                schedule()
            }, intervalRef.current)
        }

        schedule()
        return () => clearTimeout(timerId)
    }, [router])

    return null
}
