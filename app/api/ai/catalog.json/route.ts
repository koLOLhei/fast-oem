/**
 * GET /api/ai/catalog.json
 * Public, machine-readable product catalog intended for AI agents.
 *
 * Use case: an agent building a quote flow pulls this once, caches it for
 * ~5 minutes, and then calls /api/ai/quote with a chosen slug + options.
 */
import { NextResponse } from 'next/server'
import { getProductsFromDb } from '@/lib/products-db'

export const revalidate = 300

export async function GET() {
  const products = await getProductsFromDb()
  const active = products.filter((p) => p.isActive !== false)

  const payload = {
    schema: 'fast-oem.catalog.v1',
    generatedAt: new Date().toISOString(),
    currency: 'JPY',
    taxIncluded: false,
    site: 'https://fast-oem.soara-mu.jp',
    leadTime: {
      standardBusinessDays: { min: 15, max: 30 },
      expressBusinessDays: { max: 12 },
    },
    shippingRules: {
      description: 'Shipping fee is computed from TOTAL cart quantity (all items summed).',
      tiers: [
        { minQuantity: 1, maxQuantity: 300, fee: 5000 },
        { minQuantity: 301, maxQuantity: 500, fee: 8000 },
        { minQuantity: 501, maxQuantity: 1000, fee: 11000 },
        { minQuantity: 1001, maxQuantity: 2000, fee: 16000 },
        { minQuantity: 2001, maxQuantity: 3000, fee: 18000 },
        { minQuantity: 3001, maxQuantity: 4000, fee: 20000 },
      ],
      aboveMaxRule: 'From 4001+: ¥20,000 base + ¥2,000 per additional 1,000-unit block (ceiling).',
      expressMultiplier: 2,
    },
    products: active.map((p) => ({
      slug: p.slug,
      id: p.id,
      name: p.name,
      shortDescription: p.shortDescription,
      description: p.description,
      category: p.category,
      url: `https://fast-oem.soara-mu.jp/products/${p.slug}`,
      imageUrl: p.imageUrl ? `https://fast-oem.soara-mu.jp${p.imageUrl}` : null,
      minQuantity: p.minQuantity,
      maxQuantity: p.maxQuantity,
      leadTimeDays: p.leadTimeDays ?? 30,
      expressDeliveryAvailable: (p.expressDeliveryFee ?? 0) > 0,
      requiresMold: p.requiresMold ?? false,
      moldFee: p.moldFee ?? 0,
      priceTiers: p.priceTiers.map((t) => ({
        minQuantity: t.minQuantity,
        maxQuantity: t.maxQuantity,
        unitPrice: t.unitPrice,
        discountPercent: t.discountPercent,
      })),
      options: (p.options ?? []).map((opt: { id: string; name?: string; type: string; required?: boolean; parentId?: string; showWhen?: string[]; values: Array<{ id: string; label?: string; priceModifier?: { type: 'add' | 'multiply'; value: number }; requiresMold?: boolean; moldFee?: number }> }) => ({
        id: opt.id,
        name: opt.name,
        type: opt.type,
        required: opt.required !== false,
        parentId: opt.parentId,
        showWhen: opt.showWhen,
        values: (opt.values ?? []).map((v) => ({
          id: v.id,
          label: v.label,
          priceModifier: v.priceModifier,
          requiresMold: v.requiresMold,
          moldFee: v.moldFee,
        })),
      })),
    })),
    docs: {
      quoteEndpoint: 'https://fast-oem.soara-mu.jp/api/ai/quote',
      shippingEndpoint: 'https://fast-oem.soara-mu.jp/api/ai/shipping',
      openapi: 'https://fast-oem.soara-mu.jp/api/openapi.json',
      llmsTxt: 'https://fast-oem.soara-mu.jp/llms.txt',
    },
    notes: [
      'Place the final order through the human checkout UI — AI agents cannot complete Stripe payment autonomously.',
      'unitPrice is applied per product. multiply modifiers compound, add modifiers sum; all adds are applied before multipliers.',
      'moldFee is charged once per design per product; reusable for 1 year after the last reorder.',
    ],
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
      'X-Robots-Tag': 'all',
    },
  })
}
