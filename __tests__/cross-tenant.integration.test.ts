/**
 * C-3: Cross-Tenant E2E Tests
 *
 * Verifies RLS tenant isolation:
 *   - Factory A CANNOT see/update Factory B's order items (and vice versa)
 *   - Factory A can ONLY see orders containing their items
 *   - Admin/super_admin CAN see everything
 *   - Factory users CANNOT access admin_alerts or other admin-only tables
 *
 * Requires real Supabase DB. Skipped if env vars are missing.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { isIntegrationEnabled, setupTestContext, type TestContext } from './helpers/supabase-test'

const skip = !isIntegrationEnabled()

describe.skipIf(skip)('Cross-Tenant RLS Isolation', { timeout: 15_000 }, () => {
  let ctx: TestContext

  beforeAll(async () => {
    ctx = await setupTestContext()
  }, 30_000)

  afterAll(async () => {
    await ctx?.cleanup()
  }, 15_000)

  // ═══════════════════════════════════════════════════════════════════════
  // ORDER ITEMS: Factory Isolation
  // ═══════════════════════════════════════════════════════════════════════

  describe('order_items: factory isolation', () => {
    it('Factory A can see their own items', async () => {
      const { data, error } = await ctx.factoryAClient
        .from('order_items')
        .select('id')
        .eq('id', ctx.orderItemAId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data![0].id).toBe(ctx.orderItemAId)
    })

    it('Factory A CANNOT see Factory B items', async () => {
      const { data, error } = await ctx.factoryAClient
        .from('order_items')
        .select('id')
        .eq('id', ctx.orderItemBId)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('Factory B can see their own items', async () => {
      const { data, error } = await ctx.factoryBClient
        .from('order_items')
        .select('id')
        .eq('id', ctx.orderItemBId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data![0].id).toBe(ctx.orderItemBId)
    })

    it('Factory B CANNOT see Factory A items', async () => {
      const { data, error } = await ctx.factoryBClient
        .from('order_items')
        .select('id')
        .eq('id', ctx.orderItemAId)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('Factory A CANNOT update Factory B items', async () => {
      const { data } = await ctx.factoryAClient
        .from('order_items')
        .update({ status: 'manufacturing' })
        .eq('id', ctx.orderItemBId)
        .select('id')

      // RLS blocks the update — 0 rows affected
      expect(data).toHaveLength(0)
    })

    it('Factory A CAN update their own items', async () => {
      const { data, error } = await ctx.factoryAClient
        .from('order_items')
        .update({ status: 'manufacturing' })
        .eq('id', ctx.orderItemAId)
        .select('id')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)

      // Reset status for other tests
      await ctx.service
        .from('order_items')
        .update({ status: 'assigned' })
        .eq('id', ctx.orderItemAId)
    })

    it('Factory A CANNOT insert items for Factory B', async () => {
      const { error } = await ctx.factoryAClient
        .from('order_items')
        .insert({
          order_id: ctx.orderBId,
          product_id: 'attack-product',
          product_name: 'Attack Item',
          quantity: 1,
          unit_price: 1,
          factory_id: ctx.factoryBId,
          status: 'assigned',
        })

      // RLS should block the insert (no INSERT policy for factory role)
      expect(error).not.toBeNull()
    })

    it('Factory A CANNOT delete items', async () => {
      // RLS silently filters — DELETE returns no error but affects 0 rows
      await ctx.factoryAClient
        .from('order_items')
        .delete()
        .eq('id', ctx.orderItemAId)

      // Verify the item still exists (service bypasses RLS)
      const { data } = await ctx.service
        .from('order_items')
        .select('id')
        .eq('id', ctx.orderItemAId)

      expect(data).toHaveLength(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // ORDERS: Factory can only see orders with their items
  // ═══════════════════════════════════════════════════════════════════════

  describe('orders: factory scoped visibility', () => {
    it('Factory A can see orders containing their items', async () => {
      const { data, error } = await ctx.factoryAClient
        .from('orders')
        .select('id')
        .eq('id', ctx.orderAId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('Factory A CANNOT see orders belonging only to Factory B', async () => {
      const { data, error } = await ctx.factoryAClient
        .from('orders')
        .select('id')
        .eq('id', ctx.orderBId)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('Factory B can see orders containing their items', async () => {
      const { data, error } = await ctx.factoryBClient
        .from('orders')
        .select('id')
        .eq('id', ctx.orderBId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('Factory B CANNOT see orders belonging only to Factory A', async () => {
      const { data, error } = await ctx.factoryBClient
        .from('orders')
        .select('id')
        .eq('id', ctx.orderAId)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('Factory A CANNOT update any order', async () => {
      const { data } = await ctx.factoryAClient
        .from('orders')
        .update({ admin_notes: 'hacked' })
        .eq('id', ctx.orderAId)
        .select('id')

      // No UPDATE policy for factory role on orders
      expect(data).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // FACTORIES: Factory can only see their own
  // ═══════════════════════════════════════════════════════════════════════

  describe('factories: self-visibility only', () => {
    it('Factory A can see their own factory', async () => {
      const { data, error } = await ctx.factoryAClient
        .from('factories')
        .select('id')
        .eq('id', ctx.factoryAId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('Factory A CANNOT see Factory B', async () => {
      const { data, error } = await ctx.factoryAClient
        .from('factories')
        .select('id')
        .eq('id', ctx.factoryBId)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN: Full access
  // ═══════════════════════════════════════════════════════════════════════

  describe('admin: full cross-tenant access', () => {
    it('Admin can see all order items', async () => {
      const { data, error } = await ctx.adminClient
        .from('order_items')
        .select('id')
        .in('id', [ctx.orderItemAId, ctx.orderItemBId])

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
    })

    it('Admin can see all orders', async () => {
      const { data, error } = await ctx.adminClient
        .from('orders')
        .select('id')
        .in('id', [ctx.orderAId, ctx.orderBId])

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
    })

    it('Admin can see all factories', async () => {
      const { data, error } = await ctx.adminClient
        .from('factories')
        .select('id')
        .in('id', [ctx.factoryAId, ctx.factoryBId])

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
    })

    it('Admin can update any order item', async () => {
      const { data, error } = await ctx.adminClient
        .from('order_items')
        .update({ status: 'manufacturing' })
        .eq('id', ctx.orderItemBId)
        .select('id')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)

      // Reset
      await ctx.service
        .from('order_items')
        .update({ status: 'assigned' })
        .eq('id', ctx.orderItemBId)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // SUPER_ADMIN: Same access as admin
  // ═══════════════════════════════════════════════════════════════════════

  describe('super_admin: full access (same as admin)', () => {
    it('Super admin can see all order items', async () => {
      const { data, error } = await ctx.superAdminClient
        .from('order_items')
        .select('id')
        .in('id', [ctx.orderItemAId, ctx.orderItemBId])

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
    })

    it('Super admin can see all orders', async () => {
      const { data, error } = await ctx.superAdminClient
        .from('orders')
        .select('id')
        .in('id', [ctx.orderAId, ctx.orderBId])

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN-ONLY TABLES: factory must not access
  // ═══════════════════════════════════════════════════════════════════════

  describe('admin-only tables: factory blocked', () => {
    it('Factory CANNOT read admin_alerts', async () => {
      const { data, error } = await ctx.factoryAClient
        .from('admin_alerts')
        .select('id')

      // Either error or empty results (depending on RLS behavior)
      if (error) {
        expect(error).toBeTruthy()
      } else {
        expect(data).toHaveLength(0)
      }
    })

    it('Factory CANNOT read profiles (other than self)', async () => {
      // Factory A tries to read all profiles — should only get their own
      const { data, error } = await ctx.factoryAClient
        .from('profiles')
        .select('id')

      expect(error).toBeNull()
      // profiles has "Users can view own profile" + admin policies
      // Factory should see at most their own profile
      const ids = (data ?? []).map((r: { id: string }) => r.id)
      expect(ids).not.toContain(ctx.adminUserId)
      expect(ids).not.toContain(ctx.superAdminUserId)
    })

    it('Factory CANNOT modify site_settings', async () => {
      const { data } = await ctx.factoryAClient
        .from('site_settings')
        .update({ value: 'hacked' })
        .eq('key', 'some_key')
        .select('key')

      expect(data).toHaveLength(0)
    })
  })
})
