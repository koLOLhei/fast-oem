'use server'

import { Resend } from 'resend'
import { formatPrice } from '@/lib/products'

const resend = new Resend(process.env.RESEND_API_KEY)

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  moldFee?: number
  moldOrderId?: string | null
  options: { name: string; value: string }[]
  designFileName?: string
}

interface ShippingAddress {
  lastName: string
  firstName: string
  lastNameKana?: string
  firstNameKana?: string
  postalCode: string
  prefecture: string
  city: string
  address1: string
  address2?: string
  phone: string
  email: string
}

interface OrderNotificationData {
  orderId: string
  orderNumber?: string   // human-readable: FO-XXXX-XXXX
  accessToken: string    // required — must be passed from webhook
  customerEmail: string
  customerName: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  totalPrice: number
  notificationEmail?: string  // factory recipient; falls back to FACTORY_DEFAULT_EMAIL env var
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fast-oem.soara-mu.jp'
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'FAST OEM <noreply@soara-mu.com>'
const FACTORY_DEFAULT_EMAIL = process.env.FACTORY_DEFAULT_EMAIL ?? ''

// Send order notification to the factory (in English)
export async function sendFactoryNotification(data: OrderNotificationData) {
  const { orderId, orderNumber, items, shippingAddress, totalPrice, notificationEmail } = data
  const displayOrderNumber = orderNumber ?? orderId
  const toEmail = notificationEmail || FACTORY_DEFAULT_EMAIL
  if (!toEmail) {
    console.warn(`[sendFactoryNotification] No factory email configured for order ${displayOrderNumber} — skipping`)
    return { success: false }
  }

  const isRepeatOrder = items.some((item) => item.moldOrderId)
  const itemRowsHtml = items.map((item, index) => {
    const repeatNote = item.moldOrderId ? ' <span style="color:#f59e0b;font-weight:bold;">[REPEAT — Reuse existing mold]</span>' : ''
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${index + 1}. ${item.productName}${repeatNote}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${item.quantity} pcs</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">¥${item.unitPrice.toLocaleString()}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:bold;">¥${item.totalPrice.toLocaleString()}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${item.options.map((o) => `${o.name}: ${o.value}`).join(' / ') || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${item.designFileName || 'Not uploaded'}</td>
      </tr>`
  }).join('')

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `[NEW ORDER${isRepeatOrder ? ' / REPEAT' : ''}] ${displayOrderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px;background:#ffffff;">
        <h2 style="color:#1f2937;">🆕 New Order Notification</h2>
        ${isRepeatOrder ? '<div style="padding:10px 16px;background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;margin-bottom:16px;font-size:13px;font-weight:bold;color:#92400e;">★ REPEAT CUSTOMER — Mold Reuse (no new mold required)</div>' : ''}
        <div style="padding:12px 16px;background:#f3f4f6;border-radius:8px;margin-bottom:20px;font-size:13px;">
          <strong>Order Number:</strong> <span style="font-family:monospace;">${displayOrderNumber}</span><br/>
          <strong>Date:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })} JST
        </div>
        <h3 style="font-size:14px;color:#1f2937;margin:20px 0 8px;">Ordered Items</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;font-size:13px;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;">Product</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">Qty</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Unit Price</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Subtotal</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Options</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">Design File</th>
          </tr></thead>
          <tbody>${itemRowsHtml}</tbody>
        </table>
        <p style="text-align:right;font-size:15px;font-weight:bold;margin-top:12px;">Total: ¥${totalPrice.toLocaleString()}</p>
        <h3 style="font-size:14px;color:#1f2937;margin:20px 0 8px;">Ship To</h3>
        <div style="padding:12px 16px;background:#f3f4f6;border-radius:8px;font-size:13px;line-height:1.8;">
          <strong>${shippingAddress.lastName} ${shippingAddress.firstName}</strong><br/>
          〒${shippingAddress.postalCode}<br/>
          ${shippingAddress.prefecture}${shippingAddress.city}${shippingAddress.address1}${shippingAddress.address2 ? ' ' + shippingAddress.address2 : ''}<br/>
          Phone: ${shippingAddress.phone}
        </div>
        <p style="font-size:11px;color:#9ca3af;margin-top:24px;">This is an automated notification from FAST OEM.</p>
      </div>
    `,
  })

  return { success: true }
}

// Send confirmation email to customer with their secret order status link
export async function sendCustomerConfirmation(data: OrderNotificationData) {
  const { orderId, orderNumber, accessToken, customerEmail, customerName, items, shippingAddress, totalPrice } = data

  const displayOrderNumber = orderNumber ?? orderId
  const statusLink = `${SITE_URL}/orders/${orderId}/status?token=${accessToken}`

  const itemRowsHtml = items.map((item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${item.productName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${item.quantity}個</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${item.options.map((o) => `${o.name}: ${o.value}`).join(', ') || 'なし'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:bold;text-align:right;">${formatPrice(item.totalPrice)}</td>
    </tr>`).join('')

  await resend.emails.send({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `【FAST OEM】ご注文ありがとうございます（注文番号: ${displayOrderNumber}）`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
        <h2 style="color:#1f2937;">${customerName} 様</h2>
        <p style="color:#4b5563;line-height:1.7;font-size:14px;">
          この度はFAST OEMをご利用いただき、誠にありがとうございます。<br/>
          以下の内容でご注文を承りました。
        </p>
        <div style="padding:14px 16px;background:#f3f4f6;border-radius:8px;margin-bottom:20px;">
          <p style="margin:0;font-size:12px;color:#6b7280;">注文番号</p>
          <p style="margin:4px 0 0;font-family:monospace;font-weight:bold;font-size:15px;">${displayOrderNumber}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">注文日時</p>
          <p style="margin:4px 0 0;font-size:13px;">${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
        </div>
        <h3 style="font-size:14px;color:#1f2937;margin:20px 0 8px;">ご注文商品</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;font-size:13px;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;">商品名</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">数量</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">オプション</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #e5e7eb;">小計</th>
          </tr></thead>
          <tbody>${itemRowsHtml}</tbody>
        </table>
        <p style="text-align:right;font-size:15px;font-weight:bold;margin-top:8px;">合計: ${formatPrice(totalPrice)}（税込・送料込）</p>
        <h3 style="font-size:14px;color:#1f2937;margin:20px 0 8px;">お届け先</h3>
        <div style="padding:12px 16px;background:#f3f4f6;border-radius:8px;font-size:13px;line-height:1.8;">
          〒${shippingAddress.postalCode}<br/>
          ${shippingAddress.prefecture}${shippingAddress.city}${shippingAddress.address1}${shippingAddress.address2 ? '<br/>' + shippingAddress.address2 : ''}<br/>
          ${shippingAddress.lastName} ${shippingAddress.firstName} 様
        </div>
        <div style="margin:24px 0;padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#1e40af;">📋 注文状況の確認</p>
          <p style="margin:0 0 12px;font-size:13px;color:#4b5563;">以下の専用URLからいつでも注文状況をご確認いただけます。このURLはあなた専用です。</p>
          <a href="${statusLink}" style="display:inline-block;padding:10px 22px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">注文状況を確認する</a>
          <p style="margin:10px 0 0;font-size:11px;color:#6b7280;word-break:break-all;">${statusLink}</p>
        </div>
        <div style="padding:14px 16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;font-weight:bold;color:#166534;">🕐 納期について</p>
          <p style="margin:8px 0 0;font-size:13px;color:#4b5563;">
            ご入金確認後、通常2週間〜1ヶ月程度で発送いたします（商品・数量・オプションにより異なります）。<br/>
            発送時には追跡番号をメールにてお知らせいたします。
          </p>
        </div>
        <p style="font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;">
          ご不明な点は <a href="mailto:contact@soara-mu.com" style="color:#6b7280;">contact@soara-mu.com</a> までお問い合わせください。<br/>
          平日 10:00〜18:00（土日祝除く）※メール対応のみ
        </p>
      </div>
    `,
  })

  return { success: true }
}

// Send shipping notification with tracking number to customer
export async function sendShippingNotification({
  customerEmail,
  customerName,
  orderNumber,
  orderId,
  accessToken,
  trackingNumber,
  productName,
}: {
  customerEmail: string
  customerName: string
  orderNumber: string
  orderId: string
  accessToken: string
  trackingNumber: string
  productName: string
}) {
  const statusLink = `${SITE_URL}/orders/${orderId}/status?token=${accessToken}`

  const content = `
${customerName} 様

いつもFAST OEMをご利用いただき、誠にありがとうございます。
ご注文の商品を発送いたしましたのでお知らせします。

====================================
【注文番号】 ${orderNumber}
【商品名】   ${productName}
====================================

■ 追跡番号
------------------------------------
${trackingNumber}

お荷物の追跡は各配送会社のウェブサイトにてご確認ください。

■ 注文状況の確認
------------------------------------
以下の専用URLから最新の注文状況をご確認いただけます。

${statusLink}

■ お問い合わせ
------------------------------------
ご不明な点がございましたら、下記までお問い合わせください。
メール: contact@soara-mu.com（平日10:00-18:00 ※メール対応のみ）

====================================
FAST OEM
${SITE_URL}
====================================
`

  await resend.emails.send({
    from: 'FAST OEM <noreply@soara-mu.com>',
    to: customerEmail,
    subject: `【FAST OEM】ご注文の商品を発送しました（注文番号: ${orderNumber}）`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1f2937;">${customerName} 様</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          いつもFAST OEMをご利用いただき、誠にありがとうございます。<br/>
          ご注文の商品を発送いたしましたのでお知らせします。
        </p>
        <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">注文番号</p>
          <p style="margin: 4px 0 0; font-family: monospace; font-weight: bold;">${orderNumber}</p>
          <p style="margin: 12px 0 0; font-size: 12px; color: #6b7280;">商品名</p>
          <p style="margin: 4px 0 0; font-weight: bold;">${productName}</p>
        </div>
        <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: bold; color: #1e40af;">📦 追跡番号</p>
          <p style="margin: 0; font-family: monospace; font-size: 18px; font-weight: bold; color: #1e3a8a;">${trackingNumber}</p>
          <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280;">各配送会社のウェブサイトにてご確認ください。</p>
        </div>
        <div style="margin: 20px 0; padding: 16px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: bold; color: #166534;">📋 注文状況の確認</p>
          <a href="${statusLink}" style="display: inline-block; padding: 10px 20px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">
            注文状況を確認する
          </a>
          <p style="margin: 10px 0 0; font-size: 11px; color: #6b7280; word-break: break-all;">${statusLink}</p>
        </div>
        <p style="font-size: 12px; color: #9ca3af;">ご不明な点は <a href="mailto:contact@soara-mu.com">contact@soara-mu.com</a> までご連絡ください。</p>
      </div>
    `,
  })

  return { success: true }
}

// Send "all items shipped" summary email to customer
export async function sendAllShippedNotification({
  customerEmail,
  customerName,
  orderNumber,
  orderId,
  accessToken,
  items,
}: {
  customerEmail: string
  customerName: string
  orderNumber: string
  orderId: string
  accessToken: string
  items: { productName: string; quantity: number; trackingNumber: string }[]
}) {
  const statusLink = `${SITE_URL}/orders/${orderId}/status?token=${accessToken}`

  const itemRowsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-size:13px;">${item.productName}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:center; font-size:13px; white-space:nowrap;">${item.quantity}個</td>
          <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-family:monospace; font-weight:bold; font-size:14px; color:#1e3a8a;">${item.trackingNumber}</td>
        </tr>`
    )
    .join('')

  await resend.emails.send({
    from: 'FAST OEM <noreply@soara-mu.com>',
    to: customerEmail,
    subject: `【FAST OEM】ご注文の全商品を発送しました（注文番号: ${orderNumber}）`,
    html: `
      <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:24px; background:#ffffff;">
        <h2 style="color:#1f2937; margin-bottom:4px;">${customerName} 様</h2>
        <p style="color:#4b5563; line-height:1.7; font-size:14px;">
          いつもFAST OEMをご利用いただき、誠にありがとうございます。<br/>
          ご注文の<strong>全商品の発送が完了</strong>いたしましたのでお知らせします。
        </p>

        <div style="margin:20px 0; padding:14px 16px; background:#f3f4f6; border-radius:8px; font-size:12px; color:#6b7280;">
          注文番号: <strong style="font-family:monospace; color:#1f2937; font-size:13px;">${orderNumber}</strong>
        </div>

        <h3 style="font-size:14px; font-weight:600; color:#1f2937; margin:20px 0 8px;">📦 発送済み商品と追跡番号</h3>
        <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px; text-align:left; font-size:11px; color:#6b7280; font-weight:600; border-bottom:1px solid #e5e7eb;">商品名</th>
              <th style="padding:10px 12px; text-align:center; font-size:11px; color:#6b7280; font-weight:600; border-bottom:1px solid #e5e7eb;">数量</th>
              <th style="padding:10px 12px; text-align:left; font-size:11px; color:#6b7280; font-weight:600; border-bottom:1px solid #e5e7eb;">追跡番号</th>
            </tr>
          </thead>
          <tbody>${itemRowsHtml}</tbody>
        </table>
        <p style="font-size:11px; color:#9ca3af; margin-top:6px;">各配送会社のウェブサイトにて追跡番号を入力するとお荷物の状況を確認できます。</p>

        <div style="margin:24px 0; padding:16px; background:#f0fdf4; border:1px solid #86efac; border-radius:8px;">
          <p style="margin:0 0 10px; font-size:14px; font-weight:bold; color:#166534;">📋 注文状況の確認</p>
          <a href="${statusLink}" style="display:inline-block; padding:10px 22px; background:#16a34a; color:white; text-decoration:none; border-radius:6px; font-size:14px; font-weight:bold;">
            注文状況を確認する
          </a>
          <p style="margin:10px 0 0; font-size:11px; color:#6b7280; word-break:break-all;">${statusLink}</p>
        </div>

        <p style="font-size:12px; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:16px; margin-top:8px;">
          ご不明な点は <a href="mailto:contact@soara-mu.com" style="color:#6b7280;">contact@soara-mu.com</a> までお気軽にご連絡ください。<br/>
          平日 10:00〜18:00 対応（土日祝除く）
        </p>
      </div>
    `,
  })

  return { success: true }
}
