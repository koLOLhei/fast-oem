'use client'

import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface MoldReuseSectionProps {
  moldFee: number
  moldOrderId: string
  setMoldOrderId: (v: string) => void
  moldEmail: string
  setMoldEmail: (v: string) => void
  moldReuseValid: boolean | null
  moldReuseMessage: string
  checkingMold: boolean
  onCheck: () => void
  formatPrice: (n: number) => string
}

export function MoldReuseSection({
  moldFee,
  moldOrderId,
  setMoldOrderId,
  moldEmail,
  setMoldEmail,
  moldReuseValid,
  moldReuseMessage,
  checkingMold,
  onCheck,
  formatPrice,
}: MoldReuseSectionProps) {
  return (
    <>
      {/* Prominent repeat order CTA banner */}
      {!moldReuseValid && (
        <div className="mb-4 rounded-xl border-2 border-[#1e73be] bg-[#1e73be]/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-bold text-[#007a7a] text-sm">
              🔁 リピート注文の方（型代免除）はこちら
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              前回のご注文番号を入力すると、型代 {formatPrice(moldFee)} が免除されます。
            </p>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('mold-reuse-section')
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              el?.querySelector('input')?.focus()
            }}
            className="shrink-0 px-4 py-2 rounded-lg bg-[#1e73be] text-white text-sm font-bold hover:bg-[#1a66a8] transition-colors"
          >
            注文番号を入力する ↓
          </button>
        </div>
      )}

      <Card
        id="mold-reuse-section"
        className="mb-8 border-2 border-[#f5a623]/30 bg-gradient-to-r from-[#f5a623]/5 to-transparent"
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <Info className="w-5 h-5 text-[#9a6400] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground text-lg mb-2">
                型代について（初回のみ {formatPrice(moldFee)}）
              </h3>
              <p className="text-sm text-muted-foreground">
                この商品は型が必要です。過去に同じ商品をご注文いただいている場合、注文番号を入力すると型代が免除されます（型は1年間保管しています）。
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={moldOrderId}
              onChange={(e) => setMoldOrderId(e.target.value)}
              placeholder="過去の注文番号（例：FO-ABC123-XYZ456）"
              className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              disabled={checkingMold}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={moldEmail}
                onChange={(e) => setMoldEmail(e.target.value)}
                placeholder="ご注文時のメールアドレス"
                className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={checkingMold}
              />
              <Button
                onClick={onCheck}
                disabled={
                  !moldOrderId.trim() || !moldEmail.trim() || checkingMold
                }
                className="sm:w-auto bg-[#1e73be] hover:bg-[#1a66a8] text-white"
              >
                {checkingMold ? '確認中...' : '型の再利用を確認'}
              </Button>
            </div>
          </div>

          {moldReuseMessage && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                moldReuseValid
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {moldReuseMessage}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
