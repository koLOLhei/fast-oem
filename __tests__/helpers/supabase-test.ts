/**
 * Integration test helpers for Supabase RLS testing.
 *
 * Creates real auth users, factories, orders, and items in the test DB,
 * then provides authenticated SupabaseClients for each role.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Tests using these helpers are skipped if env vars are missing.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const TEST_PREFIX = '__test_rls_'

export interface TestContext {
  service: SupabaseClient
  factoryAClient: SupabaseClient
  factoryBClient: SupabaseClient
  adminClient: SupabaseClient
  superAdminClient: SupabaseClient
  // User IDs (for assertions that need auth.uid())
  adminUserId: string
  superAdminUserId: string
  factoryAId: string
  factoryBId: string
  orderAId: string
  orderBId: string
  orderItemAId: string
  orderItemBId: string
  alertId: string
  // For idempotency test
  idempotencyOrderId: string
  cleanup: () => Promise<void>
}

export function isIntegrationEnabled(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function setupTestContext(): Promise<TestContext> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const service = createClient(url, serviceKey)
  const uid = crypto.randomUUID().slice(0, 8)

  // ── 1. Create factories ──────────────────────────────────────────────
  const [{ data: factoryA }, { data: factoryB }] = await Promise.all([
    service
      .from('factories')
      .insert({
        name: `${TEST_PREFIX}factory_a_${uid}`,
        contact_email: `factory-a-${uid}@test.invalid`,
        is_active: true,
      })
      .select()
      .single(),
    service
      .from('factories')
      .insert({
        name: `${TEST_PREFIX}factory_b_${uid}`,
        contact_email: `factory-b-${uid}@test.invalid`,
        is_active: true,
      })
      .select()
      .single(),
  ])
  if (!factoryA || !factoryB) throw new Error('Failed to create test factories')

  // ── 2. Create auth users ─────────────────────────────────────────────
  const emails = {
    factoryA: `${TEST_PREFIX}fa-${uid}@test.invalid`,
    factoryB: `${TEST_PREFIX}fb-${uid}@test.invalid`,
    admin: `${TEST_PREFIX}admin-${uid}@test.invalid`,
    superAdmin: `${TEST_PREFIX}sa-${uid}@test.invalid`,
  }
  const pw = `P@ss!${uid}x9Kz`

  const [userA, userB, userAdmin, userSA] = await Promise.all(
    Object.values(emails).map((email) =>
      service.auth.admin.createUser({ email, password: pw, email_confirm: true })
    )
  )

  const users = [userA, userB, userAdmin, userSA]
  if (users.some((u) => !u.data.user)) {
    throw new Error(`Failed to create test users: ${users.map((u) => u.error?.message).join(', ')}`)
  }

  const userIds = {
    factoryA: userA.data.user!.id,
    factoryB: userB.data.user!.id,
    admin: userAdmin.data.user!.id,
    superAdmin: userSA.data.user!.id,
  }

  // ── 3. Create profiles ───────────────────────────────────────────────
  await service.from('profiles').upsert([
    { id: userIds.factoryA, role: 'factory', factory_id: factoryA.id, email: emails.factoryA, is_active: true },
    { id: userIds.factoryB, role: 'factory', factory_id: factoryB.id, email: emails.factoryB, is_active: true },
    { id: userIds.admin, role: 'admin', email: emails.admin, is_active: true },
    { id: userIds.superAdmin, role: 'super_admin', email: emails.superAdmin, is_active: true },
  ])

  // ── 4. Create orders ─────────────────────────────────────────────────
  const orderBase = {
    customer_info: { name: 'Test Customer', email: `cust-${uid}@test.invalid` },
    shipping_address: {
      lastName: 'Test', firstName: 'Customer',
      postalCode: '100-0001', prefecture: '東京都', city: '千代田区',
      address1: 'テスト1-1', address2: '',
    },
  }

  // Order A: has items for factory A only
  const { data: orderA } = await service
    .from('orders')
    .insert({
      ...orderBase,
      stripe_session_id: `${TEST_PREFIX}cs_a_${uid}`,
      order_number: `${TEST_PREFIX}FO-A-${uid}`,
      total_price: 5000,
      status: 'paid',
    })
    .select()
    .single()

  // Order B: has items for factory B only
  const { data: orderB } = await service
    .from('orders')
    .insert({
      ...orderBase,
      stripe_session_id: `${TEST_PREFIX}cs_b_${uid}`,
      order_number: `${TEST_PREFIX}FO-B-${uid}`,
      total_price: 5000,
      status: 'paid',
    })
    .select()
    .single()

  // Order for idempotency test (pending, no email sent yet)
  const { data: idempOrder } = await service
    .from('orders')
    .insert({
      ...orderBase,
      stripe_session_id: `${TEST_PREFIX}cs_idem_${uid}`,
      order_number: `${TEST_PREFIX}FO-IDEM-${uid}`,
      total_price: 10000,
      status: 'paid',
      confirmation_email_sent_at: null,
    })
    .select()
    .single()

  if (!orderA || !orderB || !idempOrder) throw new Error('Failed to create test orders')

  // ── 5. Create order items ────────────────────────────────────────────
  const [{ data: itemA }, { data: itemB }] = await Promise.all([
    service
      .from('order_items')
      .insert({
        order_id: orderA.id,
        product_id: `${TEST_PREFIX}prod-a-${uid}`,
        product_name: `${TEST_PREFIX}Item A`,
        quantity: 1,
        unit_price: 5000,
        factory_id: factoryA.id,
        status: 'assigned',
      })
      .select()
      .single(),
    service
      .from('order_items')
      .insert({
        order_id: orderB.id,
        product_id: `${TEST_PREFIX}prod-b-${uid}`,
        product_name: `${TEST_PREFIX}Item B`,
        quantity: 1,
        unit_price: 5000,
        factory_id: factoryB.id,
        status: 'assigned',
      })
      .select()
      .single(),
  ])
  if (!itemA || !itemB) throw new Error('Failed to create test order items')

  // ── 6. Create admin alert ────────────────────────────────────────────
  const { data: alert } = await service
    .from('admin_alerts')
    .insert({
      subject: `${TEST_PREFIX}Alert ${uid}`,
      body: 'RLS integration test alert',
      source: 'test',
    })
    .select()
    .single()

  // ── 7. Create authenticated clients ──────────────────────────────────
  async function signIn(email: string): Promise<SupabaseClient> {
    const client = createClient(url, anonKey)
    const { error } = await client.auth.signInWithPassword({ email, password: pw })
    if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
    return client
  }

  const [factoryAClient, factoryBClient, adminClient, superAdminClient] = await Promise.all([
    signIn(emails.factoryA),
    signIn(emails.factoryB),
    signIn(emails.admin),
    signIn(emails.superAdmin),
  ])

  // ── 8. Cleanup function ──────────────────────────────────────────────
  const cleanup = async () => {
    // Delete in FK order
    await service.from('order_items').delete().in('order_id', [orderA.id, orderB.id, idempOrder.id])
    await service.from('orders').delete().in('id', [orderA.id, orderB.id, idempOrder.id])
    if (alert) await service.from('admin_alerts').delete().eq('id', alert.id)

    // Delete profiles → auth users → factories
    const allUserIds = Object.values(userIds)
    await service.from('profiles').delete().in('id', allUserIds)
    await Promise.all(allUserIds.map((id) => service.auth.admin.deleteUser(id)))
    await service.from('factories').delete().in('id', [factoryA.id, factoryB.id])
  }

  return {
    service,
    factoryAClient,
    factoryBClient,
    adminClient,
    superAdminClient,
    adminUserId: userIds.admin,
    superAdminUserId: userIds.superAdmin,
    factoryAId: factoryA.id,
    factoryBId: factoryB.id,
    orderAId: orderA.id,
    orderBId: orderB.id,
    orderItemAId: itemA.id,
    orderItemBId: itemB.id,
    alertId: alert?.id ?? '',
    idempotencyOrderId: idempOrder.id,
    cleanup,
  }
}
