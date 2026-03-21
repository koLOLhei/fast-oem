import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLEANUP_SECRET = Deno.env.get('CLEANUP_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RETENTION_DAYS = 90

Deno.serve(async (req) => {
  // Auth check
  const auth = req.headers.get('Authorization')
  if (CLEANUP_SECRET && auth !== `Bearer ${CLEANUP_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: oldOrders, error } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['shipped', 'completed', 'cancelled', 'refunded'])
      .lt('created_at', cutoff)

    if (error) throw error

    let deletedFiles = 0
    let deletedOrders = 0

    for (const order of oldOrders ?? []) {
      const prefix = `${order.id}/`
      const { data: files } = await supabase.storage
        .from('designs')
        .list(order.id, { limit: 100 })

      if (files && files.length > 0) {
        const paths = files.map((f) => `${order.id}/${f.name}`)
        const { error: delError } = await supabase.storage.from('designs').remove(paths)
        if (!delError) {
          deletedFiles += paths.length
          deletedOrders++
        }
      }
    }

    return Response.json({ ok: true, deletedOrders, deletedFiles, cutoff })
  } catch (err: any) {
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
})
