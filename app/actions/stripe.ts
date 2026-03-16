'use server'

import { stripe } from '@/lib/stripe'
import { type CartItem } from '@/lib/cart'
import { type ShippingAddress, generateOrderId } from '@/lib/order'

interface CheckoutSessionData {
  items: CartItem[]
  shippingAddress: ShippingAddress
  totalPrice: number
}

export async function startCheckoutSession(data: CheckoutSessionData) {
  const { items, shippingAddress, totalPrice } = data

  const orderId = generateOrderId()

  // Create line items for Stripe
  const lineItems = items.flatMap((item) => {
    const itemLineItems = [
      {
        price_data: {
          currency: 'jpy',
          product_data: {
            name: item.productName,
            description: item.options.map((o) => `${o.name}: ${o.value}`).join(', ') || undefined,
          },
          unit_amount: item.unitPrice,
        },
        quantity: item.quantity,
      },
    ]

    // Add mold fee as a separate line item if applicable
    if (item.moldFee && item.moldFee > 0) {
      itemLineItems.push({
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `型代 - ${item.productName}`,
            description: item.moldOrderId ? '型の再利用（免除）' : '初回型作成費用',
          },
          unit_amount: item.moldFee,
        },
        quantity: 1,
      })
    }

    return itemLineItems
  })

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    line_items: lineItems,
    mode: 'payment',
    metadata: {
      orderId,
      customerEmail: shippingAddress.email,
      customerName: `${shippingAddress.lastName} ${shippingAddress.firstName}`,
      shippingAddress: JSON.stringify(shippingAddress),
      items: JSON.stringify(
        items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          moldFee: item.moldFee || 0,
          moldOrderId: item.moldOrderId || null,
          options: item.options,
          designFileName: item.designFileName,
          designImage: item.designImage,
        }))
      ),
      totalAmount: totalPrice.toString(),
    },
    customer_email: shippingAddress.email,
  })

  return {
    clientSecret: session.client_secret,
    orderId,
  }
}

export async function getCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return session
}
