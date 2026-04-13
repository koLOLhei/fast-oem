'use server'

import { Resend } from 'resend'
import { escapeHtml } from '@/lib/utils'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'FAST OEM <noreply@soara-mu.com>'
const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? 'contact@soara-mu.com'

/** Simple in-memory rate limit (per-process). */
const submissions = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 3 // max 3 submissions per window

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const key = email.toLowerCase().trim()
  const history = (submissions.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (history.length >= RATE_LIMIT_MAX) return true
  history.push(now)
  submissions.set(key, history)
  return false
}

const CATEGORIES = [
  '注文・見積もりについて',
  'デザインデータについて',
  '納期・配送について',
  'その他のお問い合わせ',
] as const

interface ContactFormData {
  name: string
  email: string
  category: string
  orderNumber?: string
  message: string
}

export async function submitContactForm(data: ContactFormData): Promise<{ success: boolean; error?: string }> {
  // ── Validation ──────────────────────────────────────────────────────
  const { name, email, category, orderNumber, message } = data

  if (!name?.trim() || name.trim().length > 100) {
    return { success: false, error: 'お名前を入力してください（100文字以内）' }
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { success: false, error: '有効なメールアドレスを入力してください' }
  }
  if (!CATEGORIES.includes(category as typeof CATEGORIES[number])) {
    return { success: false, error: 'お問い合わせ種類を選択してください' }
  }
  if (orderNumber && orderNumber.trim().length > 30) {
    return { success: false, error: '注文番号は30文字以内で入力してください' }
  }
  if (!message?.trim() || message.trim().length < 10) {
    return { success: false, error: 'お問い合わせ内容を10文字以上で入力してください' }
  }
  if (message.trim().length > 5000) {
    return { success: false, error: 'お問い合わせ内容は5000文字以内で入力してください' }
  }

  // ── Rate limit ──────────────────────────────────────────────────────
  if (isRateLimited(email)) {
    return { success: false, error: '短時間に複数回送信されています。しばらく経ってから再度お試しください。' }
  }

  // ── Build email ─────────────────────────────────────────────────────
  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const trimmedOrder = orderNumber?.trim() || '（なし）'
  const trimmedMessage = message.trim()
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

  const subject = `【FAST OEM お問い合わせ】${category} - ${trimmedName}様`

  const textBody = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '  FAST OEM お問い合わせフォーム',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `受信日時: ${now}`,
    '',
    `お名前: ${trimmedName}`,
    `メールアドレス: ${trimmedEmail}`,
    `お問い合わせ種類: ${category}`,
    `注文番号: ${trimmedOrder}`,
    '',
    '── お問い合わせ内容 ──────────────────',
    '',
    trimmedMessage,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `このメールは ${trimmedEmail} 様がFAST OEMのお問い合わせフォームから送信しました。`,
    `返信先: ${trimmedEmail}`,
  ].join('\n')

  const htmlBody = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
    <div style="background:linear-gradient(135deg,#00c8c8,#0099a0);padding:24px 32px;color:#fff;">
      <h1 style="margin:0;font-size:18px;font-weight:bold;">FAST OEM お問い合わせ</h1>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.8;">${escapeHtml(now)}</p>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#888;width:130px;">お名前</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(trimmedName)}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">メールアドレス</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(trimmedEmail)}" style="color:#00c8c8;">${escapeHtml(trimmedEmail)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#888;">お問い合わせ種類</td><td style="padding:8px 0;">${escapeHtml(category)}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">注文番号</td><td style="padding:8px 0;">${escapeHtml(trimmedOrder)}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-size:12px;color:#888;font-weight:600;">お問い合わせ内容</p>
        <p style="margin:0;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(trimmedMessage)}</p>
      </div>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#888;">
      このメールは <strong>${escapeHtml(trimmedEmail)}</strong> 様がFAST OEMのお問い合わせフォームから送信しました。<br/>
      直接返信すると送信者に届きます。
    </div>
  </div>
</body>
</html>`

  // ── Send ─────────────────────────────────────────────────────────────
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: CONTACT_EMAIL,
      replyTo: trimmedEmail,
      subject,
      text: textBody,
      html: htmlBody,
    })

    if (error) {
      console.error('[contact-form] Resend error:', error)
      return { success: false, error: '送信に失敗しました。しばらく経ってから再度お試しください。' }
    }

    return { success: true }
  } catch (e: any) {
    console.error('[contact-form] Unexpected error:', e?.message)
    return { success: false, error: '送信に失敗しました。しばらく経ってから再度お試しください。' }
  }
}
