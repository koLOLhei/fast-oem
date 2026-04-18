/**
 * GET /api/ai/shipping?quantity=N&express=true|false
 * Stateless shipping fee calculator for AI agents.
 */
import { NextRequest, NextResponse } from 'next/server'
import { calculateShippingByQuantity, calculateExpressShipping } from '@/lib/shipping'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}

export async function GET(req: NextRequest) {
  const qty = Number(req.nextUrl.searchParams.get('quantity') ?? 0)
  const express = req.nextUrl.searchParams.get('express') === 'true'

  if (!Number.isInteger(qty) || qty <= 0) {
    return NextResponse.json(
      { error: 'quantity must be a positive integer query parameter.' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  const baseFee = calculateShippingByQuantity(qty)
  const fee = express ? calculateExpressShipping(baseFee) : baseFee

  return NextResponse.json({
    schema: 'fast-oem.shipping.v1',
    quantity: qty,
    express,
    baseFee,
    fee,
    currency: 'JPY',
    taxIncluded: true,
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
