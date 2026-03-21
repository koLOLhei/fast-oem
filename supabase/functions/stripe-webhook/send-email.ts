import { Resend } from 'npm:resend'
import { sendSlackMessage } from './slack.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
if (!RESEND_API_KEY) {
  console.error('[send-email] FATAL: RESEND_API_KEY is not set — all emails will fail')
}
const resend = new Resend(RESEND_API_KEY as string)

/** Escape user-supplied strings before embedding in HTML to prevent XSS. */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// ---------------------------------------------------------------------------
// Config — driven by environment variables with safe defaults
// ---------------------------------------------------------------------------
function getEmailConfig() {
  return {
    maxRetries:   Number(Deno.env.get('EMAIL_MAX_RETRIES')                ?? '3'),
    baseMsn:      Number(Deno.env.get('EMAIL_BASE_BACKOFF_MS')            ?? '500'),
    capMs:        Number(Deno.env.get('EMAIL_MAX_BACKOFF_MS')             ?? '30000'),
    multiplier:   Number(Deno.env.get('EMAIL_RETRY_MULTIPLIER')           ?? '2'),
    cbThreshold:  Number(Deno.env.get('EMAIL_CIRCUIT_BREAKER_THRESHOLD')  ?? '10'),
    cbOpenMs:     Number(Deno.env.get('EMAIL_CIRCUIT_BREAKER_OPEN_MS')    ?? '300000'),
    quotaWindowMs: Number(Deno.env.get('EMAIL_QUOTA_WINDOW_SEC')          ?? '60') * 1000,
    quotaLimit:   Number(Deno.env.get('EMAIL_QUOTA_LIMIT')                ?? '0'), // 0 = disabled
  }
}

// ---------------------------------------------------------------------------
// In-process metrics (reset per Edge Function invocation)
// ---------------------------------------------------------------------------
const emailMetrics = {
  attempts:                 0,
  successes:                0,
  failures:                 0,
  retries:                  0,
  attachment_fetch_failures: 0,
}

function metricInc(key: keyof typeof emailMetrics) {
  emailMetrics[key]++
}

function logMetrics(traceId: string) {
  console.log(JSON.stringify({ evt: 'email.metrics_snapshot', traceId, ...emailMetrics }))
}

// ---------------------------------------------------------------------------
// Circuit breaker — in-memory (resets on cold start; acceptable for Edge Fn)
// ---------------------------------------------------------------------------
const cb = { failures: 0, openUntil: 0 }

function cbIsOpen(): boolean {
  if (cb.openUntil === 0) return false
  if (Date.now() < cb.openUntil) return true
  // Half-open: cooldown elapsed — reset and allow one attempt through
  cb.failures = 0
  cb.openUntil = 0
  return false
}

function cbRecordFailure(threshold: number, openMs: number) {
  cb.failures++
  if (cb.failures >= threshold) {
    cb.openUntil = Date.now() + openMs
    console.error(JSON.stringify({
      evt: 'email.circuit_breaker.open',
      failures: cb.failures,
      open_until: new Date(cb.openUntil).toISOString(),
    }))
  }
}

// ---------------------------------------------------------------------------
// Quota guard — in-memory best-effort (resets on cold start / per invocation)
// ---------------------------------------------------------------------------
const quota = { count: 0, windowStart: Date.now() }

/**
 * Increments the in-process send counter.
 * Throws if EMAIL_QUOTA_LIMIT is set and the window limit is reached.
 * Resets the window automatically when EMAIL_QUOTA_WINDOW_SEC elapses.
 */
function quotaCheck(windowMs: number, limit: number): void {
  if (limit === 0) return // disabled
  const now = Date.now()
  if (now - quota.windowStart > windowMs) {
    quota.count = 0
    quota.windowStart = now
  }
  quota.count++
  if (quota.count > limit) {
    const windowSec = Math.round(windowMs / 1000)
    throw new Error(`Email quota exceeded: ${quota.count}/${limit} in ${windowSec}s window`)
  }
}

// ---------------------------------------------------------------------------
// Backoff helpers
// ---------------------------------------------------------------------------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Full-jitter: uniform random in [0, min(cap, base * multiplier^attempt)] */
function fullJitter(base: number, cap: number, multiplier: number, attempt: number): number {
  const ceiling = Math.min(cap, base * Math.pow(multiplier, attempt))
  return Math.floor(Math.random() * ceiling)
}

// ---------------------------------------------------------------------------
// sendWithRetry — exponential backoff + full jitter + 429-aware + circuit breaker
// idempotencyKey: passed as X-Idempotency-Key to Resend to prevent duplicate
//   sends even if the Edge Function retries the HTTP call.  Use a stable key
//   derived from order + recipient so retries are idempotent at the API level.
// ---------------------------------------------------------------------------
async function sendWithRetry(
  payload: Parameters<typeof resend.emails.send>[0],
  traceId: string,
  idempotencyKey?: string,
): Promise<void> {
  const { maxRetries, baseMsn, capMs, multiplier, cbThreshold, cbOpenMs, quotaWindowMs, quotaLimit } = getEmailConfig()

  if (cbIsOpen()) {
    metricInc('failures')
    console.error(JSON.stringify({ evt: 'email.circuit_breaker.rejected', traceId }))
    throw new Error('[circuit-breaker] Circuit is OPEN — email send skipped')
  }

  // Quota guard — throws immediately if window limit is exhausted
  try {
    quotaCheck(quotaWindowMs, quotaLimit)
  } catch (qErr: any) {
    metricInc('failures')
    console.error(JSON.stringify({ evt: 'email.quota.exceeded', traceId, error: qErr.message }))
    throw qErr
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    metricInc('attempts')
    const t0 = Date.now()
    console.log(JSON.stringify({ evt: 'email.send.attempt', traceId, attempt, to: payload.to }))

    try {
      // Pass idempotency key to Resend so duplicate HTTP retries don't double-send
      const sendOptions = idempotencyKey
        ? { headers: { 'Idempotency-Key': idempotencyKey } }
        : undefined
      await resend.emails.send(payload, sendOptions as any)
      const latencyMs = Date.now() - t0
      metricInc('successes')
      cb.failures = Math.max(0, cb.failures - 1) // partial recovery on success
      console.log(JSON.stringify({ evt: 'email.send.success', traceId, attempt, latency_ms: latencyMs }))
      return

    } catch (err: any) {
      const latencyMs = Date.now() - t0
      const status = err?.statusCode ?? err?.status ?? 0
      const isRateLimit = status === 429 || /rate.?limit/i.test(err?.message ?? '')
      metricInc('failures')
      cbRecordFailure(cbThreshold, cbOpenMs)

      console.error(JSON.stringify({
        evt: 'email.send.failure',
        traceId, attempt, latency_ms: latencyMs,
        status, is_rate_limit: isRateLimit,
        error: err?.message,
      }))

      if (attempt === maxRetries) {
        logMetrics(traceId)
        await sendAdminAlert(
          `Email failed after ${maxRetries} attempts [${traceId}]`,
          `to: ${payload.to}\nsubject: ${payload.subject}\nerror: ${err?.message}`,
        ).catch((e: any) => console.error('[sendWithRetry] sendAdminAlert also failed:', e?.message))
        throw err
      }

      metricInc('retries')

      // Respect Retry-After header if the SDK exposes it (takes priority over calculated backoff)
      const retryAfterSec = err?.headers?.['retry-after'] ?? err?.retryAfter
      let waitMs: number
      if (isRateLimit && retryAfterSec) {
        waitMs = Math.min(capMs, Number(retryAfterSec) * 1000)
        console.warn(JSON.stringify({
          evt: 'email.send.retry', traceId, attempt, wait_ms: waitMs,
          is_rate_limit: true, source: 'retry_after_header',
        }))
      } else if (isRateLimit) {
        // 429 without Retry-After → aggressive fixed-multiplier backoff (5×)
        waitMs = Math.min(capMs, baseMsn * Math.pow(multiplier, attempt) * 5)
        console.warn(JSON.stringify({
          evt: 'email.send.retry', traceId, attempt, wait_ms: waitMs,
          is_rate_limit: true, source: 'calculated',
        }))
      } else {
        // Normal error → full-jitter exponential backoff
        waitMs = fullJitter(baseMsn, capMs, multiplier, attempt)
        console.warn(JSON.stringify({
          evt: 'email.send.retry', traceId, attempt, wait_ms: waitMs, is_rate_limit: false,
        }))
      }

      await sleep(waitMs)
    }
  }
}

// Helper function to format price in Japanese Yen
const formatPrice = (yen: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(yen)

interface ShippingAddress {
  companyName?: string
  department?: string
  poNumber?: string
  lastName?: string
  firstName?: string
  postalCode?: string
  prefecture?: string
  city?: string
  address1?: string
  address2?: string
  phone?: string
  email?: string
  receiptAddressee?: string
}

interface EmailData {
  orderId: string
  orderNumber: string
  accessToken: string
  customerName: string
  customerEmail: string
  orderItems: any[]
  totalPrice: number
  shippingFee?: number
  shippingAddress?: ShippingAddress
  receiptAddressee?: string
  /** productId → comma-separated email address(es) */
  productEmailMap?: Record<string, string>
}

const SITE_URL = Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://fast-oem.soara-mu.jp'
const DEFAULT_FACTORY_EMAIL = (() => {
  const v = Deno.env.get('FACTORY_DEFAULT_EMAIL')
  if (!v) {
    console.warn(JSON.stringify({ evt: 'config_warning', msg: 'FACTORY_DEFAULT_EMAIL env var is not set — factory notification emails will be skipped for products without an explicit factory email configured' }))
  }
  return v ?? ''
})()

interface CancellationData {
  orderNumber: string
  customerName: string
  customerEmail: string
  orderItems: any[]
  totalPrice: number
  cancelledAt: string
  /** productId → comma-separated email address(es) */
  productEmailMap?: Record<string, string>
}

/** Resolve notification emails for a list of items.
 *  Returns Map<emailKey, items[]> where emailKey is the joined address string. */
function groupItemsByEmail(items: any[], productEmailMap: Record<string, string>): Map<string, any[]> {
  const groups = new Map<string, any[]>()
  for (const item of items) {
    const raw = (productEmailMap[item.product_id] ?? '').trim() || DEFAULT_FACTORY_EMAIL
    const key = raw.split(',').map((e: string) => e.trim()).filter(Boolean).join(',')
    if (!key) {
      console.warn(JSON.stringify({ evt: 'factory_email_missing', product_id: item.product_id, msg: 'No factory email for product — skipping factory notification for this item' }))
      continue
    }
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return groups
}

/** Parse a comma-separated email string into a string or string[] for Resend */
function toAddressees(key: string): string | string[] {
  const arr = key.split(',').map((e) => e.trim()).filter(Boolean)
  return arr.length === 1 ? arr[0] : arr
}

const PDF_FETCH_TIMEOUT_MS = 20_000  // 20 s — design PDFs can be large
// 35 MB per attachment (Resend's per-email hard limit is 40 MB total;
// this leaves headroom for the receipt PDF which is also attached)
const PDF_MAX_BYTES = 35 * 1024 * 1024

/** Fetch a PDF from a public URL and return base64-encoded content.
 *  Returns null if the URL is missing, times out, is too large, or the fetch fails. */
async function fetchPdfAsBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }
    if (!res.ok) {
      metricInc('attachment_fetch_failures')
      console.warn(JSON.stringify({ evt: 'email.attachment_fetch.http_error', status: res.status, url }))
      return null
    }

    // Guard against unexpectedly large responses
    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > PDF_MAX_BYTES) {
      metricInc('attachment_fetch_failures')
      console.warn(JSON.stringify({ evt: 'email.attachment_fetch.too_large', bytes: contentLength, url }))
      return null
    }

    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > PDF_MAX_BYTES) {
      metricInc('attachment_fetch_failures')
      console.warn(JSON.stringify({ evt: 'email.attachment_fetch.too_large', bytes: buffer.byteLength, url }))
      return null
    }

    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  } catch (e: any) {
    metricInc('attachment_fetch_failures')
    if (e?.name === 'AbortError') {
      console.warn(JSON.stringify({ evt: 'email.attachment_fetch.timeout', url }))
    } else {
      console.warn(JSON.stringify({ evt: 'email.attachment_fetch.error', error: e?.message, url }))
    }
    return null
  }
}

export async function sendCancellationNotification(data: CancellationData): Promise<void> {
  const { orderNumber, customerName, customerEmail, orderItems, totalPrice, cancelledAt, productEmailMap = {} } = data

  const buildCancelHtml = (items: any[]) => {
    const rows = items.map((item, i) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(item.product_name)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      </tr>
    `).join('')

    return `
      <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background-color: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
          <h2 style="color: #dc2626; margin: 0 0 8px 0;">⚠ ORDER CANCELLED</h2>
          <p style="margin: 0; color: #7f1d1d;">
            The following order has been cancelled (session expired without payment).
            If you have already started production, please stop and contact us immediately.
          </p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <th style="text-align: left; padding: 8px 12px; background: #f3f4f6; border: 1px solid #ddd; width: 40%;">Order Number</th>
            <td style="padding: 8px 12px; border: 1px solid #ddd; font-family: monospace; font-weight: bold;">${escapeHtml(orderNumber)}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px 12px; background: #f3f4f6; border: 1px solid #ddd;">Customer</th>
            <td style="padding: 8px 12px; border: 1px solid #ddd;">${escapeHtml(customerName)} (${escapeHtml(customerEmail)})</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px 12px; background: #f3f4f6; border: 1px solid #ddd;">Cancelled At</th>
            <td style="padding: 8px 12px; border: 1px solid #ddd;">${cancelledAt}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px 12px; background: #f3f4f6; border: 1px solid #ddd;">Total Amount</th>
            <td style="padding: 8px 12px; border: 1px solid #ddd;">${formatPrice(totalPrice)}</td>
          </tr>
        </table>
        <h3 style="color: #374151;">Ordered Items (CANCELLED — do NOT produce)</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #fee2e2;">
              <th style="padding: 8px; border: 1px solid #ddd;">#</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Product</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Qty</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
          This is an automated cancellation notice from FAST OEM.
        </p>
      </div>
    `
  }

  const groups = groupItemsByEmail(orderItems, productEmailMap)
  for (const [emailKey, groupItems] of groups) {
    await sendWithRetry({
      from: 'FAST OEM <noreply@soara-mu.com>',
      to: toAddressees(emailKey),
      subject: `[ORDER CANCELLED] ${orderNumber}`,
      html: buildCancelHtml(groupItems),
    }, `CANCEL-${orderNumber}`, `cancel-${orderNumber}-${emailKey.split('@')[0]}`)
  }
}

/** Send a brief alert to the site administrator (e.g. background processing failure).
 *  Never throws — both Slack and email are best-effort. */
export async function sendAdminAlert(subject: string, body: string): Promise<void> {
  // 1. Slack — catch so Slack outage never prevents the email fallback below
  try {
    await sendSlackMessage(`🚨 *[FAST OEM ALERT] ${subject}*\n${body}`)
  } catch (slackErr: any) {
    console.error(JSON.stringify({
      evt: 'admin_alert.slack_failed',
      subject,
      error: slackErr?.message,
    }))
  }

  // 2. Email via Resend — always attempted regardless of Slack result
  const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? 'contact@soara-mu.com'
  try {
    await resend.emails.send({
      from: 'FAST OEM System <noreply@soara-mu.com>',
      to: adminEmail,
      subject: `[FAST OEM ALERT] ${subject}`,
      html: `<div style="font-family:monospace;white-space:pre-wrap;padding:16px;">${escapeHtml(body)}</div>`,
    })
  } catch (e: any) {
    console.error(JSON.stringify({ evt: 'admin_alert.email_failed', subject, error: e?.message }))
  }
}

export async function sendEmails(data: EmailData) {
  // Define traceId outside try so it's accessible in the catch block
  const traceId = data.orderNumber || data.orderId
  try {
    const { orderId, orderNumber, accessToken, customerName, customerEmail, orderItems, totalPrice, shippingFee = 0, shippingAddress, receiptAddressee, productEmailMap = {} } = data
    const statusUrl = `${SITE_URL}/orders/${orderId}/status?token=${accessToken}`
    const displayOrderNumber = orderNumber || orderId

    // Calculate subtotals
    const itemsTotal   = orderItems.reduce((sum, item) => sum + (item.total_price || item.unit_price * item.quantity), 0)
    const moldTotal    = orderItems.reduce((sum, item) => sum + (item.mold_fee || 0), 0)
    const expressTotal = orderItems.reduce((sum, item) => sum + (item.express_delivery_fee || 0), 0)

    // Format items for factory email (detailed)
    const factoryItemsHtml = orderItems.map((item, i) => {
      const optionsText = item.options && item.options.length > 0
        ? item.options.map((o: any) => `${escapeHtml(o.name)}: ${escapeHtml(o.value)}`).join(', ')
        : '-'

      const subtotal = item.total_price || item.unit_price * item.quantity
      const expressRow = item.express_delivery ? `
                <tr style="background-color: #fff7ed;">
                    <td style="padding: 8px; border: 1px solid #ddd;"></td>
                    <td colspan="4" style="padding: 8px; border: 1px solid #ddd; color: #ea580c; font-weight: bold;">
                        ⚡ EXPRESS DELIVERY REQUESTED — Target: within 10 days
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #ea580c; font-weight: bold;">${item.express_delivery_fee > 0 ? formatPrice(item.express_delivery_fee) : '—'}</td>
                </tr>
            ` : ''
      const moldFeeRow = item.mold_fee && item.mold_fee > 0 ? `
                <tr style="background-color: #fff7ed;">
                    <td style="padding: 8px; border: 1px solid #ddd;"></td>
                    <td colspan="2" style="padding: 8px; border: 1px solid #ddd; color: #c2410c;">
                        型代（初回のみ）${item.mold_order_id ? ' - 再利用' : ''}
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">1</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(item.mold_fee)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #c2410c; font-weight: bold;">${formatPrice(item.mold_fee)}</td>
                </tr>
            ` : ''

      return `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i + 1}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        <strong>${escapeHtml(item.product_name)}</strong><br/>
                        <span style="font-size: 12px; color: #666;">オプション: ${optionsText}</span>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        ${(item.converted_design_url || item.design_url)
                          ? `<a href="${escapeHtml(item.converted_design_url || item.design_url)}" style="color: #2563eb;">デザインDL</a>`
                          : '<span style="color:#9ca3af;">—</span>'}
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity}個</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(item.unit_price)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatPrice(subtotal)}</td>
                </tr>
                ${expressRow}
                ${moldFeeRow}
            `
    }).join('')

    // Format items for customer email (customer-friendly)
    const customerItemsHtml = orderItems.map((item, i) => {
      const optionsText = item.options && item.options.length > 0
        ? item.options.map((o: any) => `${escapeHtml(o.name)}: ${escapeHtml(o.value)}`).join(' / ')
        : '-'

      const subtotal = item.total_price || item.unit_price * item.quantity
      const moldFeeRow = item.mold_fee && item.mold_fee > 0 ? `
                <tr style="background-color: #fff7ed;">
                    <td style="padding: 8px; border: 1px solid #ddd; padding-left: 24px; color: #c2410c;">
                        型代（初回のみ）${item.mold_order_id ? ' - 再利用' : ''}
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">1</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #c2410c; font-weight: bold;">${formatPrice(item.mold_fee)}</td>
                </tr>
            ` : ''
      const expressRow = item.express_delivery && item.express_delivery_fee > 0 ? `
                <tr style="background-color: #fff7ed;">
                    <td style="padding: 8px; border: 1px solid #ddd; padding-left: 24px; color: #ea580c;">
                        ⚡ 特急料金
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">1</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #ea580c; font-weight: bold;">${formatPrice(item.express_delivery_fee)}</td>
                </tr>
            ` : ''

      return `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        <strong>${escapeHtml(item.product_name)}</strong><br/>
                        <span style="font-size: 12px; color: #666;">${optionsText}</span><br/>
                        <span style="font-size: 12px; color: #666;">${formatPrice(item.unit_price)} × ${item.quantity}個</span>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity}個</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatPrice(subtotal)}</td>
                </tr>
                ${moldFeeRow}${expressRow}
            `
    }).join('')

    const hasExpress = orderItems.some((i) => i.express_delivery)

    // 1. Send to Factory — one email per unique notification address (per-product setting)
    const factoryGroups = groupItemsByEmail(orderItems, productEmailMap)
    for (const [emailKey, groupItems] of factoryGroups) {
      const groupHasExpress = groupItems.some((i: any) => i.express_delivery)
      const groupItemsTotal  = groupItems.reduce((sum: number, item: any) => sum + (item.total_price || item.unit_price * item.quantity), 0)
      const groupMoldTotal   = groupItems.reduce((sum: number, item: any) => sum + (item.mold_fee || 0), 0)
      const groupExpressTotal = groupItems.reduce((sum: number, item: any) => sum + (item.express_delivery_fee || 0), 0)
      // Shipping fee is order-level; apportion to this group if it's the only group, otherwise show in full
      const isOnlyGroup = factoryGroups.size === 1

      const groupFactoryItemsHtml = groupItems.map((item: any, i: number) => {
        const optionsText = item.options && item.options.length > 0
          ? item.options.map((o: any) => `${escapeHtml(o.name)}: ${escapeHtml(o.value)}`).join(', ')
          : '-'
        const subtotal = item.total_price || item.unit_price * item.quantity
        const expressRow = item.express_delivery ? `
          <tr style="background-color: #fff7ed;">
            <td style="padding: 8px; border: 1px solid #ddd;"></td>
            <td colspan="4" style="padding: 8px; border: 1px solid #ddd; color: #ea580c; font-weight: bold;">
              ⚡ EXPRESS DELIVERY REQUESTED — Target: within 10 days
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #ea580c; font-weight: bold;">${item.express_delivery_fee > 0 ? formatPrice(item.express_delivery_fee) : '—'}</td>
          </tr>` : ''
        const moldFeeRow = item.mold_fee && item.mold_fee > 0 ? `
          <tr style="background-color: #fff7ed;">
            <td style="padding: 8px; border: 1px solid #ddd;"></td>
            <td colspan="2" style="padding: 8px; border: 1px solid #ddd; color: #c2410c;">
              型代（初回のみ）${item.mold_order_id ? ' - 再利用' : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">1</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(item.mold_fee)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #c2410c; font-weight: bold;">${formatPrice(item.mold_fee)}</td>
          </tr>` : ''
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <strong>${escapeHtml(item.product_name)}</strong><br/>
              <span style="font-size: 12px; color: #666;">オプション: ${optionsText}</span>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${(item.converted_design_url || item.design_url)
                ? `<a href="${escapeHtml(item.converted_design_url || item.design_url)}" style="color: #2563eb;">デザインDL</a>`
                : '<span style="color:#9ca3af;">—</span>'}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity}個</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(item.unit_price)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatPrice(subtotal)}</td>
          </tr>
          ${expressRow}${moldFeeRow}`
      }).join('')

      // Attach delivery PDFs for items in this group
      const pdfAttachments: { filename: string; content: string; contentType: string }[] = []
      for (const item of groupItems) {
        if (item.delivery_pdf_url) {
          const b64 = await fetchPdfAsBase64(item.delivery_pdf_url)
          if (b64) {
            const safeName = (item.product_name || 'item').replace(/[^a-zA-Z0-9_-]/g, '_')
            pdfAttachments.push({ filename: `delivery_${safeName}.pdf`, content: b64, contentType: 'application/pdf' })
          }
        }
      }

      await sendWithRetry({
        from: 'FAST OEM <noreply@soara-mu.com>',
        to: toAddressees(emailKey),
        subject: `[NEW ORDER${groupHasExpress ? ' ⚡EXPRESS' : ''}] ${displayOrderNumber}`,
        ...(pdfAttachments.length > 0 ? { attachments: pdfAttachments } : {}),
        html: `
          <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #1f2937;">新規注文通知</h2>
            <p style="font-size: 14px; color: #6b7280;">注文番号: <strong>${escapeHtml(displayOrderNumber)}</strong></p>
            ${shippingAddress?.poNumber ? `<p style="font-size: 14px; color: #1e40af; font-weight: bold;">発注番号（PO）: ${escapeHtml(shippingAddress.poNumber)}</p>` : ''}
            ${shippingAddress?.companyName ? `<p style="font-size: 14px; color: #6b7280;">会社: <strong>${escapeHtml(shippingAddress.companyName)}${shippingAddress.department ? ' ' + escapeHtml(shippingAddress.department) : ''}</strong></p>` : ''}
            <p style="font-size: 14px; color: #6b7280;">顧客: <strong>${escapeHtml(customerName)}</strong> (${escapeHtml(customerEmail)})</p>
            <h3 style="margin-top: 24px; color: #1f2937;">注文内容</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">#</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">商品名・オプション</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">デザイン</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">数量</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">単価</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">小計</th>
                </tr>
              </thead>
              <tbody>${groupFactoryItemsHtml}</tbody>
            </table>
            <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">商品代:</span>
                <span style="font-weight: bold;">${formatPrice(groupItemsTotal)}</span>
              </div>
              ${groupMoldTotal > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #c2410c;">型代:</span>
                <span style="font-weight: bold; color: #c2410c;">${formatPrice(groupMoldTotal)}</span>
              </div>` : ''}
              ${groupExpressTotal > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #ea580c;">⚡ 特急料金:</span>
                <span style="font-weight: bold; color: #ea580c;">${formatPrice(groupExpressTotal)}</span>
              </div>` : ''}
              ${isOnlyGroup && shippingFee > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #3b82f6;">送料（離島・遠隔地）:</span>
                <span style="font-weight: bold; color: #3b82f6;">${formatPrice(shippingFee)}</span>
              </div>` : ''}
              <hr style="margin: 12px 0; border: none; border-top: 1px solid #ddd;" />
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 18px; font-weight: bold;">合計金額（税込）:</span>
                <span style="font-size: 18px; font-weight: bold; color: #2563eb;">${formatPrice(totalPrice)}</span>
              </div>
            </div>

            ${shippingAddress ? `
            <div style="margin-top: 32px; padding: 16px; background-color: #eff6ff; border: 2px solid #bfdbfe; border-radius: 8px;">
              <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">📦 Ship To / 配送先</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                ${shippingAddress.companyName ? `
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap; width: 120px;">会社名 / Company</td>
                  <td style="padding: 6px 0; font-weight: bold;">${escapeHtml(shippingAddress.companyName)}${shippingAddress.department ? ' ' + escapeHtml(shippingAddress.department) : ''}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6b7280; white-space: nowrap; width: 120px;">氏名 / Name</td>
                  <td style="padding: 6px 0; font-weight: bold;">${escapeHtml((shippingAddress.lastName ?? '') + ' ' + (shippingAddress.firstName ?? ''))}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6b7280;">郵便番号 / Postal</td>
                  <td style="padding: 6px 0;">〒${escapeHtml(shippingAddress.postalCode ?? '')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6b7280;">住所 / Address</td>
                  <td style="padding: 6px 0;">
                    ${escapeHtml((shippingAddress.prefecture ?? '') + (shippingAddress.city ?? '') + (shippingAddress.address1 ?? ''))}
                    ${shippingAddress.address2 ? '<br>' + escapeHtml(shippingAddress.address2) : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6b7280;">電話番号 / Phone</td>
                  <td style="padding: 6px 0;">${escapeHtml(shippingAddress.phone ?? '—')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px 6px 0; color: #6b7280;">メール / Email</td>
                  <td style="padding: 6px 0;">${escapeHtml(shippingAddress.email ?? customerEmail)}</td>
                </tr>
              </table>
            </div>
            ` : ''}
          </div>
        `,
      }, `${traceId}-factory-${emailKey.split('@')[0]}`, `factory-${traceId}-${emailKey.split('@')[0]}`)
    }

    // 2. Send to Customer (with receipt PDF attached)
    // Use the explicit receiptAddressee if provided, otherwise fall back to customer name
    const effectiveAddressee = receiptAddressee?.trim() || shippingAddress?.receiptAddressee?.trim() || customerName
    const receiptPdfUrl = `${SITE_URL}/api/receipts/${orderId}?token=${encodeURIComponent(accessToken)}&addressee=${encodeURIComponent(effectiveAddressee)}`
    const receiptBase64 = await fetchPdfAsBase64(receiptPdfUrl)
    const receiptFilename = `receipt-${displayOrderNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`

    await sendWithRetry({
      from: 'FAST OEM <noreply@soara-mu.com>',
      to: customerEmail,
      subject: `【FAST OEM】ご注文ありがとうございます（注文番号: ${displayOrderNumber}）`,
      ...(receiptBase64 ? { attachments: [{ filename: receiptFilename, content: receiptBase64, contentType: 'application/pdf' }] } : {}),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">${escapeHtml(customerName)} 様</h2>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
            この度はFAST OEMをご利用いただき、誠にありがとうございます。<br/>
            以下の内容でご注文を承りました。
          </p>

          <div style="margin: 20px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">注文番号</p>
            <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 13px; color: #1f2937;">${escapeHtml(displayOrderNumber)}</p>
          </div>

          <h3 style="margin-top: 24px; color: #1f2937; font-size: 16px;">ご注文内容</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 14px;">商品</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 14px;">数量</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 14px;">小計</th>
              </tr>
            </thead>
            <tbody>
              ${customerItemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span style="color: #6b7280;">商品代:</span>
              <span>${formatPrice(itemsTotal)}</span>
            </div>
            ${moldTotal > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span style="color: #c2410c;">型代（初回のみ）:</span>
              <span style="color: #c2410c;">${formatPrice(moldTotal)}</span>
            </div>` : ''}
            ${expressTotal > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span style="color: #ea580c;">⚡ 特急料金:</span>
              <span style="color: #ea580c;">${formatPrice(expressTotal)}</span>
            </div>` : ''}
            ${shippingFee > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span style="color: #3b82f6;">送料（離島・遠隔地）:</span>
              <span style="color: #3b82f6;">${formatPrice(shippingFee)}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span style="color: #6b7280;">小計（税抜）:</span>
              <span>${formatPrice(Math.round(totalPrice / 1.1))}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
              <span style="color: #6b7280;">消費税（10%）:</span>
              <span>${formatPrice(totalPrice - Math.round(totalPrice / 1.1))}</span>
            </div>
            <hr style="margin: 12px 0; border: none; border-top: 2px solid #ddd;" />
            <div style="display: flex; justify-content: space-between; font-size: 16px;">
              <span style="font-weight: bold;">合計金額（税込）:</span>
              <span style="font-weight: bold; color: #2563eb;">${formatPrice(totalPrice)}</span>
            </div>
          </div>

          <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #1e40af;">📦 注文状況の確認</p>
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #1e3a8a; line-height: 1.6;">
              以下の専用URLからいつでも注文状況・発送状況をご確認いただけます。<br/>
              <strong>このURLはあなた専用です。他の方と共有しないようにご注意ください。</strong>
            </p>
            <a href="${statusUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">
              注文状況を確認する
            </a>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #6b7280; word-break: break-all;">${statusUrl}</p>
          </div>
          <p style="margin-top: 16px; font-size: 14px; color: #4b5563; line-height: 1.6;">
            発送時には追跡番号をメールにてお知らせいたします。<br/>
            商品の到着まで今しばらくお待ちください。
          </p>

          ${receiptBase64 ? `
          <div style="margin-top: 20px; padding: 12px 16px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: #166534;">
              📎 <strong>領収書（PDF）</strong>をこのメールに添付しております。<br/>
              <span style="font-size: 12px;">別の宛名で発行し直す場合は、注文状況ページより再発行いただけます。</span>
            </p>
          </div>` : ''}
          <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
        </div>
      `
    }, `${traceId}-customer`, `customer-confirm-${traceId}`)

    console.log(`[${traceId}] All emails sent successfully`)
    logMetrics(traceId)
  } catch (error: any) {
    console.error(`[${traceId}] Failed to send emails: ${error.message}`)
    throw error
  }
}
