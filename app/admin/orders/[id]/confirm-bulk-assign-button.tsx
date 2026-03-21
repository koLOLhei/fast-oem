'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { bulkAssignFactory } from '@/app/actions/factory'

interface Props {
    orderId: string
    unassignedCount: number
    factories: { id: string; name: string; country: string }[]
}

export function ConfirmBulkAssignForm({ orderId, unassignedCount, factories }: Props) {
    const [factoryId, setFactoryId] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleAssign = async () => {
        if (!factoryId) {
            alert('工場を選択してください')
            return
        }
        const factory = factories.find((f) => f.id === factoryId)
        const ok = window.confirm(
            `「${factory?.name}」に未割当 ${unassignedCount}件をまとめて割り当てます。\nよろしいですか？`
        )
        if (!ok) return

        setLoading(true)
        try {
            await bulkAssignFactory(orderId, factoryId)
            router.push(`/admin/orders/${orderId}?msg=${encodeURIComponent('未割当アイテムをすべて割り当てました')}`)
        } catch (err: any) {
            alert(err?.message ?? '割り当てに失敗しました')
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <select
                value={factoryId}
                onChange={(e) => setFactoryId(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-2 bg-background"
            >
                <option value="">-- 工場を選択 --</option>
                {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                        {f.name} ({f.country})
                    </option>
                ))}
            </select>
            <button
                onClick={handleAssign}
                disabled={loading || !factoryId}
                className="bg-orange-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
                {loading ? '割り当て中...' : '未割当をすべて割り当て'}
            </button>
        </div>
    )
}
