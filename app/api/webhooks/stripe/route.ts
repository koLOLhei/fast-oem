import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      const supabase = await createClient()

      // Parse metadata
      const metadata = session.metadata
      if (!metadata) {
        console.error('No metadata in session')
        return NextResponse.json({ error: 'No metadata' }, { status: 400 })
      }

      const orderId = metadata.orderId
      const customerEmail = metadata.customerEmail
      const customerName = metadata.customerName
      const shippingAddress = JSON.parse(metadata.shippingAddress)
      const items = JSON.parse(metadata.items)
      const totalAmount = parseInt(metadata.totalAmount || '0', 10)

      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          customer_info: {
            email: customerEmail,
            name: customerName,
            ...shippingAddress,
          },
          total_amount: totalAmount,
          status: 'paid',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (orderError) {
        console.error('Failed to create order:', orderError)
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
      }

      // Create order items
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        mold_fee: item.moldFee || 0,
        mold_order_id: item.moldOrderId || null,
        options: item.options,
        design_image: item.designImage,
        design_file_name: item.designFileName,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Failed to create order items:', itemsError)
        return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
      }

      console.log('Order created successfully:', order.id)
    } catch (error) {
      console.error('Error processing webhook:', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
