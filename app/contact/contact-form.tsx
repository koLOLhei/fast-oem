'use client'

import { useState, useTransition } from 'react'
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { submitContactForm } from '@/app/actions/contact'

const CATEGORIES = [
  '注文・見積もりについて',
  'デザインデータについて',
  '納期・配送について',
  'その他のお問い合わせ',
]

export default function ContactForm() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const res = await submitContactForm({ name, email, category, orderNumber, message })
      setResult(res)
      if (res.success) {
        setName('')
        setEmail('')
        setCategory('')
        setOrderNumber('')
        setMessage('')
      }
    })
  }

  if (result?.success) {
    return (
      <div className="bg-card border-2 border-green-200 rounded-2xl p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">送信完了</h3>
        <p className="text-muted-foreground text-sm">
          お問い合わせを受け付けました。<br />
          2〜3営業日以内にご返信いたします。
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-6 text-sm text-primary underline hover:text-primary/80"
        >
          別のお問い合わせを送る
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5">
      <h2 className="font-bold text-lg text-foreground">お問い合わせフォーム</h2>

      {/* Error banner */}
      {result?.error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-foreground mb-1.5">
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="山田 太郎"
          className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-foreground mb-1.5">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@mail.com"
          className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="contact-category" className="block text-sm font-medium text-foreground mb-1.5">
          お問い合わせ種類 <span className="text-red-500">*</span>
        </label>
        <select
          id="contact-category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors appearance-none"
        >
          <option value="" disabled>選択してください</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Order number (optional) */}
      <div>
        <label htmlFor="contact-order" className="block text-sm font-medium text-foreground mb-1.5">
          注文番号 <span className="text-muted-foreground font-normal">（お持ちの場合）</span>
        </label>
        <input
          id="contact-order"
          type="text"
          maxLength={30}
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="FO-XXXXXXXX"
          className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-foreground mb-1.5">
          お問い合わせ内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ご質問・ご要望をお聞かせください（10文字以上）"
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors resize-y"
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{message.length} / 5000</p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 bg-[#1e73be] hover:bg-[#1a66a8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            送信中...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            送信する
          </>
        )}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        ご入力いただいた情報はお問い合わせ対応のみに使用いたします。
        <br />
        <a href="/privacy" className="underline hover:text-foreground">プライバシーポリシー</a>
      </p>
    </form>
  )
}
