'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { Resend } from 'resend'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { escapeHtml } from '@/lib/utils'
import { sendSlackMessage } from '@/lib/slack'
import { CONTACT_EMAIL, COMPANY, REPLY_LEAD_TIME, SITE_NAME, SITE_URL } from '@/lib/site'
import {
  FREQUENCY_OPTIONS,
  GOODS_OPTIONS,
  QUANTITY_OPTIONS,
  labelOf,
  readQuoteForm,
  validateQuote,
  type QuoteField,
  type QuoteValues,
} from '@/lib/quote'

export type QuoteFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Partial<Record<QuoteField, string>>
  /** エラー時にフォームへ入力内容を戻すための値 */
  values?: QuoteValues
  submittedAt?: number
}

const FROM_EMAIL = process.env.FROM_EMAIL ?? 'FAST OEM <noreply@soara-mu.com>'
const TO_EMAIL = process.env.CONTACT_EMAIL ?? CONTACT_EMAIL

// ── レート制限 ────────────────────────────────────────────────────────
// 本番は Upstash（全インスタンス共通）。未設定時はインスタンス内メモリで代替し、
// フォーム自体は止めない（問い合わせを受けられないことの方が損失が大きい）。
// キーには IP・メールアドレスのハッシュを使い、外部に生の個人情報を置かない。
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null

const RATE_RULES = {
  ip: { max: 5, window: '10 m' as const, windowMs: 10 * 60 * 1000 },
  email: { max: 3, window: '10 m' as const, windowMs: 10 * 60 * 1000 },
}

const limiters = redis
  ? {
      ip: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RATE_RULES.ip.max, RATE_RULES.ip.window), prefix: 'quote:ip', analytics: false }),
      email: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RATE_RULES.email.max, RATE_RULES.email.window), prefix: 'quote:email', analytics: false }),
    }
  : null

if (!redis && process.env.NODE_ENV === 'production') {
  console.error('[quote] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN が未設定のため、インスタンス内メモリでレート制限しています')
}

const memoryHits = new Map<string, number[]>()

function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
}

async function isRateLimited(kind: keyof typeof RATE_RULES, raw: string): Promise<boolean> {
  const key = hashKey(raw)
  if (limiters) {
    const { success } = await limiters[kind].limit(key)
    return !success
  }
  const { max, windowMs } = RATE_RULES[kind]
  const now = Date.now()
  const mapKey = `${kind}:${key}`
  const recent = (memoryHits.get(mapKey) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) return true
  recent.push(now)
  memoryHits.set(mapKey, recent)
  return false
}

// ── メール本文 ────────────────────────────────────────────────────────
function summaryRows(data: QuoteValues): [string, string][] {
  return [
    ['作りたいグッズ', data.goods.map((g) => labelOf(GOODS_OPTIONS, g)).join('、')],
    ['発注頻度の見込み', labelOf(FREQUENCY_OPTIONS, data.frequency)],
    ['1回あたりの数量', labelOf(QUANTITY_OPTIONS, data.quantity)],
  ]
}

function buildInternalEmail(data: QuoteValues, receivedAt: string) {
  const rows: [string, string][] = [
    ...summaryRows(data),
    ['会社名・屋号', data.company || '（未記入）'],
    ['お名前', data.name],
    ['メールアドレス', data.email],
    ['電話番号', data.phone || '（未記入）'],
  ]
  const message = data.message || '（未記入）'

  const text = [
    `FAST OEM 定期発注の見積り依頼（${receivedAt}）`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    '── ご相談内容 ──',
    message,
    '',
    `このメールに返信すると ${data.email} 様に届きます。`,
  ].join('\n')

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;color:#14181f;">
<div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e6eaf0;border-radius:12px;overflow:hidden;">
<div style="background:#124e7e;color:#fff;padding:20px 28px;">
<p style="margin:0;font-size:12px;opacity:.8;">${escapeHtml(receivedAt)}</p>
<h1 style="margin:4px 0 0;font-size:18px;">定期発注の見積り依頼</h1>
</div>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0;">
${rows
  .map(
    ([k, v]) =>
      `<tr><th style="text-align:left;padding:10px 28px;color:#5b6675;font-weight:600;width:150px;vertical-align:top;border-bottom:1px solid #eef1f5;">${escapeHtml(k)}</th><td style="padding:10px 28px 10px 0;border-bottom:1px solid #eef1f5;">${escapeHtml(v)}</td></tr>`,
  )
  .join('\n')}
</table>
<div style="margin:16px 28px 24px;padding:16px;background:#f4f6f9;border-radius:8px;">
<p style="margin:0 0 6px;font-size:12px;color:#5b6675;font-weight:600;">ご相談内容</p>
<p style="margin:0;font-size:14px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(message)}</p>
</div>
<p style="margin:0;padding:14px 28px;background:#f9fafb;border-top:1px solid #e6eaf0;font-size:12px;color:#5b6675;">このメールに返信すると ${escapeHtml(data.email)} 様に届きます。</p>
</div></body></html>`

  return { text, html }
}

/** 自動返信。スパムの踏み台にされないよう、本文には選択肢の値（固定の文言）だけを載せる。 */
function buildAutoReply(data: QuoteValues) {
  const rows = summaryRows(data)
  const signature = [
    '────────────────────',
    `${SITE_NAME}（運営：${COMPANY.name}）`,
    COMPANY.address,
    CONTACT_EMAIL,
    SITE_URL,
  ]
  const text = [
    `この度は ${SITE_NAME} にお見積りをご依頼いただき、ありがとうございます。`,
    '以下の内容で受け付けました。',
    `${REPLY_LEAD_TIME}に担当者よりご連絡いたします。`,
    '',
    ...rows.map(([k, v]) => `■ ${k}：${v}`),
    '',
    '現在の仕入れ単価や、既存品の写真・仕様書などがあれば、このメールへの返信でお送りください。より正確なお見積りができます。',
    '',
    '※本メールは自動送信です。お心当たりのない場合は、お手数ですが破棄してください。',
    '',
    ...signature,
  ].join('\n')

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;color:#14181f;">
<div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e6eaf0;border-radius:12px;padding:28px;">
<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1e73be;">${SITE_NAME}</p>
<h1 style="margin:0 0 20px;font-size:19px;">お見積りのご依頼を受け付けました</h1>
<p style="margin:0 0 16px;font-size:14px;line-height:1.8;">この度は ${SITE_NAME} にお見積りをご依頼いただき、ありがとうございます。<br>以下の内容で受け付けました。${REPLY_LEAD_TIME}に担当者よりご連絡いたします。</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;background:#f4f6f9;border-radius:8px;">
${rows.map(([k, v]) => `<tr><th style="text-align:left;padding:10px 16px;color:#5b6675;font-weight:600;width:140px;">${k}</th><td style="padding:10px 16px 10px 0;">${v}</td></tr>`).join('\n')}
</table>
<p style="margin:0 0 16px;font-size:14px;line-height:1.8;">現在の仕入れ単価や、既存品の写真・仕様書などがあれば、このメールへの返信でお送りください。より正確なお見積りができます。</p>
<p style="margin:0 0 24px;font-size:12px;line-height:1.7;color:#5b6675;">※本メールは自動送信です。お心当たりのない場合は、お手数ですが破棄してください。</p>
<p style="margin:0;padding-top:16px;border-top:1px solid #e6eaf0;font-size:12px;line-height:1.8;color:#5b6675;">${SITE_NAME}（運営：${COMPANY.name}）<br>${COMPANY.address}<br><a href="mailto:${CONTACT_EMAIL}" style="color:#1e73be;">${CONTACT_EMAIL}</a><br><a href="${SITE_URL}" style="color:#1e73be;">${SITE_URL}</a></p>
</div></body></html>`

  return { text, html }
}

/** Slack の制御文字（<!channel> などのメンションやリンク）を無効化する */
function slackEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function oneLine(s: string): string {
  return s.replace(/[\r\n\t]+/g, ' ').trim()
}

// ── Server Action ─────────────────────────────────────────────────────
export async function submitQuoteRequest(_prev: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const input = readQuoteForm(formData)
  const submittedAt = Date.now()
  const { website, ...values } = input

  // ハニーポットに値がある = ボット。成功したように見せて何も送らない。
  if (website.trim()) {
    console.warn('[quote] honeypot triggered — submission dropped')
    return { status: 'success', submittedAt }
  }

  const result = validateQuote(input)
  if (!result.ok) {
    return {
      status: 'error',
      message: '入力内容をご確認ください。',
      fieldErrors: result.fieldErrors,
      values,
      submittedAt,
    }
  }
  const data = result.data

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  const limited =
    (await isRateLimited('ip', ip).catch(() => false)) ||
    (await isRateLimited('email', data.email.toLowerCase()).catch(() => false))
  if (limited) {
    return {
      status: 'error',
      message: '短時間に何度も送信されています。しばらく時間をおいてから、もう一度お試しください。',
      values,
      submittedAt,
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[quote] RESEND_API_KEY is not set')
    return {
      status: 'error',
      message: `送信できませんでした。お手数ですが ${CONTACT_EMAIL} まで直接ご連絡ください。`,
      values,
      submittedAt,
    }
  }

  const resend = new Resend(apiKey)
  const receivedAt = new Date(submittedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  const who = oneLine(data.company ? `${data.company} ${data.name}` : data.name)
  const internal = buildInternalEmail(data, receivedAt)

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: data.email,
      subject: `【FAST OEM】定期発注の見積り依頼：${who}様`,
      text: internal.text,
      html: internal.html,
    })
    if (error) throw new Error(error.message)
  } catch (e) {
    console.error('[quote] failed to send internal email:', e instanceof Error ? e.message : e)
    return {
      status: 'error',
      message: `送信に失敗しました。時間をおいて再度お試しいただくか、${CONTACT_EMAIL} まで直接ご連絡ください。`,
      values,
      submittedAt,
    }
  }

  // 社内通知と自動返信は届かなくても受付自体は成立しているので、失敗してもエラーにしない。
  const reply = buildAutoReply(data)
  const summary = summaryRows(data).map(([k, v]) => `${k}: ${v}`)
  await Promise.allSettled([
    sendSlackMessage(
      [
        ':inbox_tray: *定期発注の見積り依頼が届きました*',
        `依頼者: ${slackEscape(who)}`,
        ...summary,
        `詳細は ${TO_EMAIL} 宛てのメールを確認してください。`,
      ].join('\n'),
    ),
    resend.emails
      .send({
        from: FROM_EMAIL,
        to: data.email,
        replyTo: TO_EMAIL,
        subject: '【FAST OEM】お見積りのご依頼を受け付けました',
        text: reply.text,
        html: reply.html,
      })
      .then(({ error }) => {
        if (error) console.error('[quote] auto-reply failed:', error.message)
      }),
  ])

  return { status: 'success', submittedAt }
}
