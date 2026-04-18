/**
 * GET /api/openapi.json — OpenAPI 3.1 schema describing the public AI API.
 * Used by agent frameworks and /.well-known/ai-plugin.json to discover tools.
 */
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'FAST OEM Public AI API',
      version: '1.0.0',
      description: 'Machine-readable catalog + quote API for the FAST OEM custom merchandise site. Designed for LLM agents. Payment completion still requires a human checkout.',
      contact: { email: 'contact@soara-mu.com' },
    },
    servers: [{ url: 'https://fast-oem.soara-mu.jp' }],
    paths: {
      '/api/ai/catalog.json': {
        get: {
          operationId: 'getCatalog',
          summary: 'Get full product catalog (prices, options, shipping rules).',
          responses: {
            '200': {
              description: 'Machine-readable product catalog.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Catalog' } } },
            },
          },
        },
      },
      '/api/ai/quote': {
        post: {
          operationId: 'postQuote',
          summary: 'Compute a price quote for a specific product + quantity + options.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productSlug', 'quantity'],
                  properties: {
                    productSlug: { type: 'string', description: 'Slug from /api/ai/catalog.json (e.g. "acrylic-keychain").' },
                    quantity: { type: 'integer', minimum: 1 },
                    options: {
                      type: 'object',
                      additionalProperties: { type: 'string' },
                      description: 'Map of option id → value id or label. Missing required options are auto-filled with defaults.',
                    },
                    express: { type: 'boolean', default: false },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Quote computed.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Quote' } } },
            },
            '400': { description: 'Invalid input.' },
            '404': { description: 'Unknown productSlug.' },
            '409': { description: 'Configuration is blocked by a complexity rule.' },
          },
        },
      },
      '/api/ai/shipping': {
        get: {
          operationId: 'getShipping',
          summary: 'Compute shipping fee from total cart quantity.',
          parameters: [
            { name: 'quantity', in: 'query', required: true, schema: { type: 'integer', minimum: 1 } },
            { name: 'express', in: 'query', required: false, schema: { type: 'boolean', default: false } },
          ],
          responses: {
            '200': {
              description: 'Shipping fee.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Shipping' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Catalog: {
          type: 'object',
          properties: {
            schema: { type: 'string' },
            generatedAt: { type: 'string', format: 'date-time' },
            currency: { type: 'string', enum: ['JPY'] },
            products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
          },
        },
        Product: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            name: { type: 'string' },
            minQuantity: { type: 'integer' },
            maxQuantity: { type: 'integer' },
            requiresMold: { type: 'boolean' },
            moldFee: { type: 'integer' },
            priceTiers: { type: 'array', items: { $ref: '#/components/schemas/PriceTier' } },
            options: { type: 'array' },
          },
        },
        PriceTier: {
          type: 'object',
          properties: {
            minQuantity: { type: 'integer' },
            maxQuantity: { type: 'integer' },
            unitPrice: { type: 'integer' },
            discountPercent: { type: 'integer' },
          },
        },
        Quote: {
          type: 'object',
          properties: {
            schema: { type: 'string' },
            product: { type: 'object' },
            quantity: { type: 'integer' },
            selectedOptions: { type: 'object', additionalProperties: { type: 'string' } },
            unitPrice: { type: 'integer' },
            itemsTotal: { type: 'integer' },
            moldFee: { type: 'integer' },
            shippingFee: { type: 'integer' },
            subtotal: { type: 'integer' },
            taxAmount: { type: 'integer' },
            grandTotal: { type: 'integer' },
            currency: { type: 'string' },
            checkoutUrl: { type: 'string', format: 'uri' },
          },
        },
        Shipping: {
          type: 'object',
          properties: {
            schema: { type: 'string' },
            quantity: { type: 'integer' },
            express: { type: 'boolean' },
            fee: { type: 'integer' },
            currency: { type: 'string' },
          },
        },
      },
    },
  }

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
