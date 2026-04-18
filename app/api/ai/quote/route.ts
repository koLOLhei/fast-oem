/**
 * POST /api/ai/quote
 *
 * Returns a price quote for a given product + quantity + options.
 * No order is created; no payment info required. Designed to be called by
 * AI agents building a quote flow for their users.
 *
 * Request body (JSON):
 *   {
 *     "productSlug": "acrylic-keychain",
 *     "quantity": 500,
 *     "options": { "size": "50mm", "shape": "die-cut" },
 *     "express": false
 *   }
 *
 * Response:
 *   {
 *     "product": { ... },
 *     "quantity": 500,
 *     "unitPrice": 120,
 *     "itemsTotal": 60000,
 *     "moldFee": 0,
 *     "shippingFee": 8000,
 *     "subtotal": 68000,
 *     "taxRate": 0.1,
 *     "taxAmount": 6800,
 *     "grandTotal": 74800,
 *     "checkoutUrl": "https://fast-oem.soara-mu.jp/products/acrylic-keychain?quantity=500&...",
 *     "leadTimeDays": { "min": 15, "max": 30 },
 *     "notes": [...]
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getProductBySlugFromDb } from '@/lib/products-db'
import {
  calculateUnitPrice,
  calculateTotalPrice,
  calculateMoldFee,
  calculateShippingModifier,
  checkComplexityRestriction,
} from '@/lib/products'
import { calculateShippingByQuantity, calculateExpressShipping } from '@/lib/shipping'

/** Mirror of option-selector's isOptionVisible, inlined so the server route
 *  doesn't import from the client component. */
function isOptionVisible(
  option: { parentId?: string; showWhen?: string[] },
  selectedOptions: Record<string, string>,
): boolean {
  if (!option.parentId) return true
  const parentValue = selectedOptions[option.parentId]
  if (!parentValue) return false
  if (!option.showWhen || option.showWhen.length === 0) return true
  return option.showWhen.includes(parentValue)
}

const TAX_RATE = 0.1

interface QuoteRequest {
  productSlug?: unknown
  quantity?: unknown
  options?: unknown
  express?: unknown
}

function err(message: string, code = 400) {
  return NextResponse.json(
    { error: message, schema: 'fast-oem.quote.error.v1' },
    { status: code, headers: { 'Access-Control-Allow-Origin': '*' } },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function POST(req: NextRequest) {
  let body: QuoteRequest
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body.')
  }

  const slug = typeof body.productSlug === 'string' ? body.productSlug : null
  if (!slug) return err('productSlug (string) is required.')

  const product = await getProductBySlugFromDb(slug)
  if (!product || product.isActive === false) return err(`Unknown product slug: ${slug}`, 404)

  const quantity = Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity <= 0) return err('quantity must be a positive integer.')
  if (quantity < product.minQuantity) return err(`Minimum quantity for ${product.name} is ${product.minQuantity}.`)
  if (quantity > product.maxQuantity) return err(`Maximum quantity for ${product.name} is ${product.maxQuantity}.`)

  // Build selectedOptions map from provided options.
  // Values can be either an ID ("50mm") or a human label ("50mm"). calculateUnitPrice accepts both.
  const rawOptions = (body.options && typeof body.options === 'object') ? body.options as Record<string, unknown> : {}
  const selectedOptions: Record<string, string> = {}
  const unknownOptions: string[] = []

  for (const [k, v] of Object.entries(rawOptions)) {
    if (typeof v !== 'string') continue
    const opt = product.options.find((o) => o.id === k)
    if (!opt) {
      unknownOptions.push(k)
      continue
    }
    selectedOptions[k] = v
  }

  // Auto-fill required options with their first value if omitted (agent convenience).
  const filledDefaults: Record<string, string> = {}
  for (const opt of product.options) {
    if (selectedOptions[opt.id]) continue
    if (opt.required === false) continue
    if (opt.type === 'checkbox' || opt.type === 'number' || opt.type === 'color') continue
    // Only fill when option is visible given current selections.
    if (!isOptionVisible(opt, selectedOptions)) continue
    if (opt.values.length > 0) {
      selectedOptions[opt.id] = opt.values[0].id
      filledDefaults[opt.id] = opt.values[0].id
    }
  }

  // Strip options that become hidden after auto-fill.
  for (const key of Object.keys(selectedOptions)) {
    const opt = product.options.find((o) => o.id === key)
    if (!opt) continue
    if (!isOptionVisible(opt, selectedOptions)) {
      delete selectedOptions[key]
    }
  }

  // Complexity restriction (e.g. "no die-cut for very complex designs on small sizes")
  const complexityBlock = checkComplexityRestriction(product, selectedOptions)
  if (complexityBlock) {
    return NextResponse.json({
      schema: 'fast-oem.quote.blocked.v1',
      error: 'BLOCKED_BY_COMPLEXITY_RULE',
      message: complexityBlock,
    }, { status: 409, headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  // Price calculations (same logic as the browser product page).
  const unitPrice = calculateUnitPrice(product, quantity, selectedOptions)
  const itemsTotal = calculateTotalPrice(product, quantity, selectedOptions)
  const moldInfo = calculateMoldFee(product, selectedOptions, quantity)
  const moldFee = moldInfo.requiresMold ? moldInfo.moldFee : 0
  const shippingModifier = calculateShippingModifier(product, selectedOptions)

  const expressRequested = body.express === true
  const expressAvailable = (product.expressDeliveryFee ?? 0) > 0
  const express = expressRequested && expressAvailable

  // Shipping is tiered by total cart quantity. For a single-item quote, we
  // treat the requested quantity as the total.
  const baseShipping = calculateShippingByQuantity(quantity)
  const shippingFee = (express ? calculateExpressShipping(baseShipping) : baseShipping) + shippingModifier

  const subtotal = itemsTotal + moldFee + shippingFee
  const taxAmount = Math.round(subtotal * TAX_RATE)
  const grandTotal = subtotal + taxAmount

  const checkoutUrl = new URL(`https://fast-oem.soara-mu.jp/products/${product.slug}`)
  checkoutUrl.searchParams.set('quantity', String(quantity))
  for (const [k, v] of Object.entries(selectedOptions)) {
    checkoutUrl.searchParams.set(`opt.${k}`, v)
  }
  if (express) checkoutUrl.searchParams.set('express', '1')

  return NextResponse.json({
    schema: 'fast-oem.quote.v1',
    product: {
      slug: product.slug,
      name: product.name,
      url: `https://fast-oem.soara-mu.jp/products/${product.slug}`,
    },
    quantity,
    selectedOptions,
    autoFilledDefaults: Object.keys(filledDefaults).length > 0 ? filledDefaults : undefined,
    ignoredUnknownOptions: unknownOptions.length > 0 ? unknownOptions : undefined,
    unitPrice,
    itemsTotal,
    moldFee,
    shippingFee,
    baseShipping,
    shippingModifier,
    express,
    expressRequestedButUnavailable: expressRequested && !expressAvailable ? true : undefined,
    subtotal,
    taxRate: TAX_RATE,
    taxAmount,
    grandTotal,
    currency: 'JPY',
    leadTimeDays: express ? { max: 12 } : { min: 15, max: 30 },
    checkoutUrl: checkoutUrl.toString(),
    notes: [
      'Final payment must be completed by a human through the web checkout UI.',
      'The quote assumes this product is the only cart line; adding other items changes the shipping tier.',
      moldFee > 0 ? `Mold fee ¥${moldFee.toLocaleString('ja-JP')} charged once; reusable for 1 year from last reorder.` : undefined,
    ].filter(Boolean),
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Robots-Tag': 'all',
    },
  })
}
