'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { ArrowRight, CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { submitQuoteRequest, type QuoteFormState } from '@/app/actions/quote'
import { FREQUENCY_OPTIONS, GOODS_OPTIONS, LIMITS, QUANTITY_OPTIONS, type QuoteField } from '@/lib/quote'
import { CONTACT_EMAIL, REPLY_LEAD_TIME } from '@/lib/site'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

const initialState: QuoteFormState = { status: 'idle' }

const inputClass =
  'block w-full rounded-xl border border-border bg-background px-4 text-[15px] text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 aria-[invalid=true]:border-destructive'

const chipClass =
  'flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2.5 text-[13px] font-semibold sm:gap-2.5 sm:px-3.5 sm:text-sm text-foreground transition-colors hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:text-secondary-foreground has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20'

function Required() {
  return (
    <span aria-hidden="true" className="ml-1.5 rounded bg-[#fdecec] px-1.5 py-0.5 text-[11px] font-bold text-[#b42318]">
      必須
    </span>
  )
}

function Optional() {
  return (
    <span aria-hidden="true" className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] font-bold text-[#4a5463]">
      任意
    </span>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-destructive">
      <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

export function QuoteForm() {
  const [state, formAction, isPending] = useActionState(submitQuoteRequest, initialState)
  const [goodsError, setGoodsError] = useState<string>()
  const [messageLength, setMessageLength] = useState(state.values?.message.length ?? 0)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.status === 'idle') return
    statusRef.current?.focus()
    if (state.status === 'success') {
      window.gtag?.('event', 'generate_lead', { form_name: 'recurring_quote' })
    }
  }, [state])

  if (state.status === 'success') {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl bg-card p-8 text-center shadow-float ring-1 ring-border focus:outline-none sm:p-10"
      >
        <CircleCheck className="mx-auto h-14 w-14 text-primary" aria-hidden="true" />
        <p className="mt-5 text-xl font-black text-foreground sm:text-2xl">お見積りのご依頼を受け付けました</p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          確認メールをお送りしました。{REPLY_LEAD_TIME}に担当者よりご連絡します。
          <br />
          メールが届かない場合は、お手数ですが{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>{' '}
          までご連絡ください。
        </p>
      </div>
    )
  }

  const v = state.values
  const errors: Partial<Record<QuoteField, string>> = { ...state.fieldErrors }
  if (goodsError) errors.goods = goodsError
  const describedBy = (field: QuoteField) => (errors[field] ? `${field}-error` : undefined)

  return (
    <form
      key={state.submittedAt ?? 'initial'}
      action={formAction}
      onSubmit={(e) => {
        if (new FormData(e.currentTarget).getAll('goods').length === 0) {
          e.preventDefault()
          setGoodsError('作りたいグッズを1つ以上選んでください')
          document.getElementById('goods-legend')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          setGoodsError(undefined)
        }
      }}
      className="relative rounded-2xl bg-card p-4 shadow-float ring-1 ring-border sm:p-8"
      aria-describedby="quote-form-note"
    >
      {state.status === 'error' && state.message && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive focus:outline-none"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{state.message}</span>
        </div>
      )}

      <p className="text-xs font-bold tracking-[0.14em] text-primary">STEP 1　ご依頼の内容</p>

      <fieldset className="mt-4" aria-describedby={describedBy('goods')}>
        <legend id="goods-legend" className="text-sm font-bold text-foreground">
          作りたいグッズ（複数選択可）
          <span className="sr-only">（必須）</span>
          <Required />
        </legend>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          {GOODS_OPTIONS.map((o) => (
            <label key={o.value} className={chipClass}>
              <input
                type="checkbox"
                name="goods"
                value={o.value}
                defaultChecked={v?.goods.includes(o.value)}
                onChange={() => setGoodsError(undefined)}
                className="h-4.5 w-4.5 shrink-0 accent-primary"
              />
              {o.label}
            </label>
          ))}
        </div>
        <FieldError id="goods-error" message={errors.goods} />
      </fieldset>

      <fieldset className="mt-7" aria-describedby={describedBy('frequency')}>
        <legend className="text-sm font-bold text-foreground">
          発注頻度の見込み
          <Required />
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FREQUENCY_OPTIONS.map((o) => (
            <label key={o.value} className={chipClass}>
              <input
                type="radio"
                name="frequency"
                value={o.value}
                required
                defaultChecked={v?.frequency === o.value}
                className="h-4.5 w-4.5 shrink-0 accent-primary"
              />
              {o.label}
            </label>
          ))}
        </div>
        <FieldError id="frequency-error" message={errors.frequency} />
      </fieldset>

      <fieldset className="mt-7" aria-describedby={describedBy('quantity')}>
        <legend className="text-sm font-bold text-foreground">
          1回あたりの数量の見込み
          <Required />
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUANTITY_OPTIONS.map((o) => (
            <label key={o.value} className={chipClass}>
              <input
                type="radio"
                name="quantity"
                value={o.value}
                required
                defaultChecked={v?.quantity === o.value}
                className="h-4.5 w-4.5 shrink-0 accent-primary"
              />
              <span className="tabular-nums">{o.label}</span>
            </label>
          ))}
        </div>
        <FieldError id="quantity-error" message={errors.quantity} />
      </fieldset>

      <p className="mt-10 text-xs font-bold tracking-[0.14em] text-primary">STEP 2　ご連絡先</p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="quote-company" className="text-sm font-bold text-foreground">
            会社名・屋号
            <Optional />
          </label>
          <input
            id="quote-company"
            name="company"
            type="text"
            autoComplete="organization"
            maxLength={LIMITS.company}
            defaultValue={v?.company}
            placeholder="株式会社〇〇"
            aria-invalid={!!errors.company}
            aria-describedby={describedBy('company')}
            className={cn(inputClass, 'mt-2 h-12')}
          />
          <FieldError id="company-error" message={errors.company} />
        </div>

        <div>
          <label htmlFor="quote-name" className="text-sm font-bold text-foreground">
            お名前
            <Required />
          </label>
          <input
            id="quote-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            maxLength={LIMITS.name}
            defaultValue={v?.name}
            placeholder="山田 太郎"
            aria-invalid={!!errors.name}
            aria-describedby={describedBy('name')}
            className={cn(inputClass, 'mt-2 h-12')}
          />
          <FieldError id="name-error" message={errors.name} />
        </div>

        <div>
          <label htmlFor="quote-phone" className="text-sm font-bold text-foreground">
            電話番号
            <Optional />
          </label>
          <input
            id="quote-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={LIMITS.phone}
            defaultValue={v?.phone}
            placeholder="045-000-0000"
            aria-invalid={!!errors.phone}
            aria-describedby={describedBy('phone')}
            className={cn(inputClass, 'mt-2 h-12')}
          />
          <FieldError id="phone-error" message={errors.phone} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="quote-email" className="text-sm font-bold text-foreground">
            メールアドレス
            <Required />
          </label>
          <input
            id="quote-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={LIMITS.email}
            defaultValue={v?.email}
            placeholder="you@example.co.jp"
            aria-invalid={!!errors.email}
            aria-describedby={describedBy('email')}
            className={cn(inputClass, 'mt-2 h-12')}
          />
          <FieldError id="email-error" message={errors.email} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="quote-message" className="text-sm font-bold text-foreground">
            ご相談内容
            <Optional />
          </label>
          <textarea
            id="quote-message"
            name="message"
            rows={5}
            maxLength={LIMITS.message}
            defaultValue={v?.message}
            onChange={(e) => setMessageLength(e.target.value.length)}
            placeholder={'例）ガチャ景品用のアクリルキーホルダーを、3ヶ月ごとに3,000個ほど発注しています。\n現在の仕入れ単価は〇〇円です。'}
            aria-invalid={!!errors.message}
            aria-describedby={['message-count', describedBy('message')].filter(Boolean).join(' ')}
            className={cn(inputClass, 'mt-2 resize-y py-3 leading-relaxed')}
          />
          <p id="message-count" className="mt-1.5 text-right text-xs tabular-nums text-muted-foreground">
            {messageLength} / {LIMITS.message}
          </p>
          <FieldError id="message-error" message={errors.message} />
        </div>
      </div>

      {/* ハニーポット：人には見えない入力欄。ボットが入力した送信は破棄する */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          ウェブサイト
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="mt-8 rounded-xl bg-muted p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            name="agree"
            value="yes"
            required
            defaultChecked={v?.agree}
            aria-invalid={!!errors.agree}
            aria-describedby={describedBy('agree')}
            className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-primary"
          />
          <span>
            <a href="#privacy" className="text-primary underline underline-offset-4">
              個人情報の取り扱い
            </a>
            に同意して送信します
          </span>
        </label>
        <FieldError id="agree-error" message={errors.agree} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-brand transition hover:bg-brand-blue-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
            送信しています…
          </>
        ) : (
          <>
            無料で見積もりを依頼する
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </>
        )}
      </button>
      <p id="quote-form-note" className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        送信すると確認メールが自動で届きます。{REPLY_LEAD_TIME}に担当者よりご連絡します。
      </p>
    </form>
  )
}
