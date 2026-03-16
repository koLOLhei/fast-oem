'use server'

import { type CartItem } from '@/lib/cart'
import { type ShippingAddress } from '@/lib/order'
import { formatPrice } from '@/lib/products'

interface OrderNotificationData {
  orderId: string
  items: CartItem[]
  shippingAddress: ShippingAddress
  totalPrice: number
}

// This function sends order notification to the factory
// In production, this would use a service like Resend, SendGrid, or AWS SES
export async function sendFactoryNotification(data: OrderNotificationData) {
  const { orderId, items, shippingAddress, totalPrice } = data

  // Build email content
  const emailContent = buildFactoryEmailContent({
    orderId,
    items,
    shippingAddress,
    totalPrice,
  })

  // For now, log the email content (in production, send actual email)
  console.log('=== FACTORY ORDER NOTIFICATION ===')
  console.log(`To: factory@example.com`)
  console.log(`Subject: 【新規注文】${orderId}`)
  console.log('--- Email Content ---')
  console.log(emailContent)
  console.log('=================================')

  // In production, you would use a service like:
  // - Resend: await resend.emails.send({ ... })
  // - SendGrid: await sgMail.send({ ... })
  // - AWS SES: await ses.sendEmail({ ... })

  // For demonstration, we'll simulate a successful send
  return {
    success: true,
    message: 'Factory notification sent successfully',
  }
}

function buildFactoryEmailContent(data: OrderNotificationData): string {
  const { orderId, items, shippingAddress, totalPrice } = data

  let content = `
====================================
新規注文通知
====================================

【注文番号】 ${orderId}
【注文日時】 ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

------------------------------------
■ 注文商品
------------------------------------
`

  items.forEach((item, index) => {
    content += `
${index + 1}. ${item.productName}
   数量: ${item.quantity}個
   単価: ${formatPrice(item.unitPrice)}
   小計: ${formatPrice(item.totalPrice)}
   オプション: ${item.options.map((o) => `${o.name}: ${o.value}`).join(', ') || 'なし'}
   デザインファイル: ${item.designFileName || '未アップロード'}
`
  })

  content += `
------------------------------------
■ 合計金額
------------------------------------
${formatPrice(totalPrice)}（税込・送料込）

------------------------------------
■ 配送先情報
------------------------------------
お名前: ${shippingAddress.lastName} ${shippingAddress.firstName}
フリガナ: ${shippingAddress.lastNameKana} ${shippingAddress.firstNameKana}
郵便番号: ${shippingAddress.postalCode}
住所: ${shippingAddress.prefecture}${shippingAddress.city}${shippingAddress.address1}${shippingAddress.address2 ? ' ' + shippingAddress.address2 : ''}
電話番号: ${shippingAddress.phone}
メール: ${shippingAddress.email}

------------------------------------
■ デザインデータについて
------------------------------------
デザインデータは別途システムよりダウンロード可能です。
管理画面にログインしてご確認ください。

====================================
※ このメールは自動送信されています。
====================================
`

  return content
}

// Send confirmation email to customer
export async function sendCustomerConfirmation(data: OrderNotificationData) {
  const { orderId, items, shippingAddress, totalPrice } = data

  const emailContent = buildCustomerEmailContent({
    orderId,
    items,
    shippingAddress,
    totalPrice,
  })

  console.log('=== CUSTOMER ORDER CONFIRMATION ===')
  console.log(`To: ${shippingAddress.email}`)
  console.log(`Subject: 【FAST OEM】ご注文ありがとうございます（注文番号: ${orderId}）`)
  console.log('--- Email Content ---')
  console.log(emailContent)
  console.log('====================================')

  return {
    success: true,
    message: 'Customer confirmation sent successfully',
  }
}

function buildCustomerEmailContent(data: OrderNotificationData): string {
  const { orderId, items, shippingAddress, totalPrice } = data

  let content = `
${shippingAddress.lastName} ${shippingAddress.firstName} 様

この度はFAST OEMをご利用いただき、誠にありがとうございます。
以下の内容でご注文を承りました。

====================================
【注文番号】 ${orderId}
【注文日時】 ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
====================================

■ ご注文商品
------------------------------------
`

  items.forEach((item, index) => {
    content += `
${index + 1}. ${item.productName}
   数量: ${item.quantity}個
   オプション: ${item.options.map((o) => `${o.name}: ${o.value}`).join(', ') || 'なし'}
   小計: ${formatPrice(item.totalPrice)}
`
  })

  content += `
------------------------------------
合計金額: ${formatPrice(totalPrice)}（税込・送料込）

■ お届け先
------------------------------------
〒${shippingAddress.postalCode}
${shippingAddress.prefecture}${shippingAddress.city}${shippingAddress.address1}
${shippingAddress.address2 || ''}
${shippingAddress.lastName} ${shippingAddress.firstName} 様
TEL: ${shippingAddress.phone}

■ 納期について
------------------------------------
ご入金確認後、5〜10営業日以内に発送いたします。
発送時には追跡番号をメールにてお知らせいたします。

■ お問い合わせ
------------------------------------
ご不明な点がございましたら、下記までお問い合わせください。
メール: contact@soara-mu.com
電話: 03-1234-5678（平日10:00-18:00）

====================================
FAST OEM
http://fast-oem.soara-mu.jp
====================================
`

  return content
}
