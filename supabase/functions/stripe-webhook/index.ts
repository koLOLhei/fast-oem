import 'server-only'
import Stripe from 'stripe'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processImage } from './process-image.ts'
import { sendEmails } from './send-email.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req: Request) => {
  const signature = req.headers.get('Stripe-Signature')
  if (!signature) {
    return new Response('Stripe signature missing', { status: 400 })
  }

  try {
    const body = await req.text()

    let event
    try {
      event = await stripe.webhooks.signature.verifyAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') as string,
        cryptoProvider
      )
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any

      const {
        orderId,
        customerEmail,
        customerName,
        shippingAddress,
        items: rawItems,
      } = session.metadata ?? {}

      if (!orderId) throw new Error('No orderId in session metadata')

      const parsedItems = rawItems ? JSON.parse(rawItems) : []
      const parsedAddress = shippingAddress ? JSON.parse(shippingAddress) : {}

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') as string,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
      )

      // Upsert Order to avoid duplicates if webhook fires twice
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .upsert(
          {
            stripe_session_id: session.id,
            customer_info: { name: customerName, email: customerEmail },
            shipping_address: parsedAddress,
            total_price: session.amount_total,
            status: 'paid',
          },
          { onConflict: 'stripe_session_id' }
        )
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = []
      for (const item of parsedItems) {
        let convertedUrl = null
        if (item.designImage) {
          convertedUrl = await processImage(supabase, item.designImage, orderId, item.productId)
        }

        orderItems.push({
          order_id: orderData.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice || 0,
          total_price: item.totalPrice || 0,
          mold_fee: item.moldFee || 0,
          mold_order_id: item.moldOrderId || null,
          options: item.options ?? [],
          design_file_name: item.designFileName,
          design_url: item.designImage,
          converted_design_url: convertedUrl,
          status: 'unassigned',
        })
      }

      // Avoid re-inserting items if order already existed
      const { count } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderData.id)

      if ((count ?? 0) === 0) {
        const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
        if (itemsError) throw itemsError
      }

      await sendEmails({
        orderId,
        customerName,
        customerEmail,
        orderItems,
        totalPrice: session.amount_total,
      })
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(`Edge Function Error: ${err.message}`)
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
})
