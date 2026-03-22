'use client'

import { useState, useTransition } from 'react'
import { adminCancelOrder } from '@/app/actions/factory'
import { ORDER_STATUS_LABELS, CANCELLABLE_STATUSES } from '@/lib/status-labels'

interface Props {
    orderId: string
    orderNumber: string
    status: string
    totalPrice: number
}

export function CancelOrderForm({ orderId, orderNumber, status, totalPrice }: Props) {
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState('')
    const [confirmed, setConfirmed] = useState(false)
    const [error, setError] = useState('')
    const [isPending, startTransition] = useTransition()

    const isCancellable = (CANCELLABLE_STATUSES as readonly string[]).includes(status)
    const needsRefund = status !== 'pending'

    if (!isCancellable) {
        return (
            <div className="rounded-xl border bg-card p-5">
                <p className="text-sm font-semibold text-muted-foreground">注文のキャンセル</p>
                <p className="text-xs text-muted-foreground mt-1">
                    ステータスが「{ORDER_STATUS_LABELS[status] ?? status}」のためキャンセルできません。
                </p>
            </div>
        )
    }

    const handleCancel = () => {
        if (!reason.trim()) { setError('キャンセル理由を入力してください'); return }
        if (!confirmed) { setError('確認チェックボックスにチェックを入れてください'); return }
        setError('')
        startTransition(async () => {
            try {
                await adminCancelOrder(orderId, reason)
                // Page will revalidate — no manual redirect needed
            } catch (e: any) {
                setError(e.message ?? 'キャンセルに失敗しました')
            }
        })
    }

    return (
        <div className="rounded-xl border border-red-200 bg-red-50/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-red-800">🚫 注文のキャンセル</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        管理者のみ実行できます。顧客にはキャンセルメールが自動送信されます。
                    </p>
                </div>
                {!open && (
                    <button
                        onClick={() => setOpen(true)}
                        className="px-4 py-2 text-sm font-semibold text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition"
                    >
                        キャンセルする
                    </button>
                )}
            </div>

            {open && (
                <div className="space-y-4 pt-2 border-t border-red-200">
                    {needsRefund && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                            <strong>⚠ 返金について</strong><br />
                            この注文はすでに決済済みです（¥{totalPrice.toLocaleString('ja-JP')}）。
                            キャンセル実行時に Stripe から<strong>全額自動返金</strong>を発行します。
                            カード会社の処理により顧客への反映まで数営業日かかる場合があります。
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                            キャンセル理由 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setError('') }}
                            rows={3}
                            placeholder="例: 在庫不足のため / デザインデータ不備のため / お客様と協議の上合意"
                            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            この理由は DB に記録され、顧客へのメールには含まれません。
                        </p>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => { setConfirmed(e.target.checked); setError('') }}
                            className="mt-0.5 h-4 w-4 accent-red-600 shrink-0"
                        />
                        <span className="text-sm text-foreground">
                            注文番号 <strong className="font-mono">{orderNumber}</strong> を取り消し、
                            {needsRefund ? '全額返金を発行する' : 'キャンセルする'}ことを確認しました
                        </span>
                    </label>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            disabled={isPending}
                            className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-60"
                        >
                            {isPending ? '処理中...' : needsRefund ? '注文をキャンセル・返金する' : '注文をキャンセルする'}
                        </button>
                        <button
                            onClick={() => { setOpen(false); setReason(''); setConfirmed(false); setError('') }}
                            disabled={isPending}
                            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition disabled:opacity-60"
                        >
                            戻る
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
