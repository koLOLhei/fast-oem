import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

// Helper function to format price in Japanese Yen
const formatPrice = (yen: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(yen)

interface EmailData {
    orderId: string
    customerName: string
    customerEmail: string
    orderItems: any[]
    totalPrice: number
}

export async function sendEmails(data: EmailData) {
    try {
        const { orderId, customerName, customerEmail, orderItems, totalPrice } = data

        // Calculate subtotals
        const itemsTotal = orderItems.reduce((sum, item) => sum + (item.total_price || item.unit_price * item.quantity), 0)
        const moldTotal = orderItems.reduce((sum, item) => sum + (item.mold_fee || 0), 0)

        // Format items for factory email (detailed)
        const factoryItemsHtml = orderItems.map((item, i) => {
            const optionsText = item.options && item.options.length > 0
                ? item.options.map((o: any) => `${o.name}: ${o.value}`).join(', ')
                : '-'

            const subtotal = item.total_price || item.unit_price * item.quantity
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
                        <strong>${item.product_name}</strong><br/>
                        <span style="font-size: 12px; color: #666;">オプション: ${optionsText}</span>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        <a href="${item.converted_design_url || item.design_url}" style="color: #2563eb;">デザインDL</a>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity}個</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(item.unit_price)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatPrice(subtotal)}</td>
                </tr>
                ${moldFeeRow}
            `
        }).join('')

        // Format items for customer email (customer-friendly)
        const customerItemsHtml = orderItems.map((item, i) => {
            const optionsText = item.options && item.options.length > 0
                ? item.options.map((o: any) => `${o.name}: ${o.value}`).join(' / ')
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

            return `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        <strong>${item.product_name}</strong><br/>
                        <span style="font-size: 12px; color: #666;">${optionsText}</span><br/>
                        <span style="font-size: 12px; color: #666;">${formatPrice(item.unit_price)} × ${item.quantity}個</span>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity}個</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatPrice(subtotal)}</td>
                </tr>
                ${moldFeeRow}
            `
        }).join('')

        // 1. Send to Factory
        await resend.emails.send({
            from: 'FAST OEM <contact@soara-mu.com>',
            to: 'sales22@kd-craft.cn',
            subject: `【新規注文】${orderId}`,
            html: `
        <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #1f2937;">新規注文通知</h2>
          <p style="font-size: 14px; color: #6b7280;">注文番号: <strong>${orderId}</strong></p>
          <p style="font-size: 14px; color: #6b7280;">顧客: <strong>${customerName}</strong> (${customerEmail})</p>

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
            <tbody>
              ${factoryItemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">商品代:</span>
              <span style="font-weight: bold;">${formatPrice(itemsTotal)}</span>
            </div>
            ${moldTotal > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #c2410c;">型代:</span>
              <span style="font-weight: bold; color: #c2410c;">${formatPrice(moldTotal)}</span>
            </div>
            ` : ''}
            <hr style="margin: 12px 0; border: none; border-top: 1px solid #ddd;" />
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 18px; font-weight: bold;">合計金額（税込）:</span>
              <span style="font-size: 18px; font-weight: bold; color: #2563eb;">${formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>
      `
        })

        // 2. Send to Customer
        await resend.emails.send({
            from: 'FAST OEM <contact@soara-mu.com>',
            to: customerEmail,
            subject: `【FAST OEM】ご注文ありがとうございます（注文番号: ${orderId}）`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">${customerName} 様</h2>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
            この度はFAST OEMをご利用いただき、誠にありがとうございます。<br/>
            以下の内容でご注文を承りました。
          </p>

          <div style="margin: 20px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">注文番号</p>
            <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 13px; color: #1f2937;">${orderId}</p>
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
            </div>
            ` : ''}
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

          <p style="margin-top: 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
            商品の製造状況はマイページからご確認いただけます。<br/>
            商品の到着まで今しばらくお待ちください。
          </p>

          <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
        </div>
      `
        })

        console.log(`Emails sent successfully for order ${orderId}`)
    } catch (error) {
        console.error('Failed to send emails:', error)
    }
}
