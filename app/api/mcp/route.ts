/**
 * POST /api/mcp — Streamable HTTP Model Context Protocol server for FAST OEM.
 *
 * Exposes the public AI endpoints as MCP tools so Claude Desktop / Cursor /
 * Claude Code / any other MCP client can discover and invoke them via a single
 * connect URL:
 *
 *   {
 *     "mcpServers": {
 *       "fast-oem": {
 *         "url": "https://fast-oem.soara-mu.jp/api/mcp",
 *         "transport": "streamable-http"
 *       }
 *     }
 *   }
 *
 * Implements a minimal subset of the spec (2025-06-18 wire format):
 *   - initialize
 *   - notifications/initialized (no-op)
 *   - tools/list
 *   - tools/call
 *
 * Response is always a single JSON-RPC object (no SSE stream); tool handlers
 * are fast enough that streaming adds no value.
 */
import { NextRequest, NextResponse } from 'next/server'
import { POST as aiOrderPOST } from '@/app/api/ai/order/route'
import { POST as aiQuotePOST } from '@/app/api/ai/quote/route'
import { GET as aiShippingGET } from '@/app/api/ai/shipping/route'
import { GET as aiCatalogGET } from '@/app/api/ai/catalog.json/route'

export const runtime = 'nodejs'

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_NAME = 'fast-oem'
const SERVER_VERSION = '1.0.0'
const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fast-oem.soara-mu.jp').replace(/\/$/, '')

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: unknown
}

function ok(id: JsonRpcRequest['id'], result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result }, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  })
}

function rpcErr(id: JsonRpcRequest['id'], code: number, message: string, data?: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message, data } }, {
    status: 200, // JSON-RPC errors are still HTTP 200
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  })
}

// ── Tool registry ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'get_catalog',
    description: 'FAST OEMの全商品カタログ（価格帯・オプション・サイズ修飾子・金型代・送料ルール）をJSONで返す。エージェントが最初に呼び、商品slugとオプションIDを把握する用途。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_quote',
    description: '商品slug・数量・オプションで見積を計算。unitPrice, itemsTotal, moldFee, shippingFee, taxAmount, grandTotal, checkoutUrlを返す。',
    inputSchema: {
      type: 'object',
      required: ['productSlug', 'quantity'],
      properties: {
        productSlug: { type: 'string', description: 'get_catalog で取得した slug (例: acrylic-keychain)' },
        quantity: { type: 'integer', minimum: 1 },
        options: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'オプションid → 値id(例: {"size":"50mm","shape":"die-cut"}). 省略時は既定値が自動選択される。',
        },
        express: { type: 'boolean', default: false, description: '特急便 (送料 ×2)' },
      },
    },
  },
  {
    name: 'get_shipping',
    description: 'カート合計数量から送料のみ計算（税込）',
    inputSchema: {
      type: 'object',
      required: ['quantity'],
      properties: {
        quantity: { type: 'integer', minimum: 1 },
        express: { type: 'boolean', default: false },
      },
    },
  },
  {
    name: 'create_order',
    description: '注文を作成し、顧客がカード情報を入力する Stripe Hosted Checkout URL を返す。'
      + ' AIエージェントは返された checkoutUrl をユーザーに提示するだけで注文が成立する。'
      + ' Authorization: Bearer <agent_api_key> で呼ぶと、顧客が事前登録したカードを off-session で自動請求し、決済まで完了する。',
    inputSchema: {
      type: 'object',
      required: ['items', 'shippingAddress'],
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 20,
          items: {
            type: 'object',
            required: ['productSlug', 'quantity'],
            properties: {
              productSlug: { type: 'string' },
              quantity: { type: 'integer', minimum: 1 },
              options: { type: 'object', additionalProperties: { type: 'string' } },
              designImageUrl: { type: 'string', format: 'uri' },
            },
          },
        },
        shippingAddress: {
          type: 'object',
          required: ['lastName', 'firstName', 'postalCode', 'prefecture', 'city', 'address1', 'phone', 'email'],
          properties: {
            lastName: { type: 'string' },
            firstName: { type: 'string' },
            lastNameKana: { type: 'string' },
            firstNameKana: { type: 'string' },
            postalCode: { type: 'string' },
            prefecture: { type: 'string' },
            city: { type: 'string' },
            address1: { type: 'string' },
            address2: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            companyName: { type: 'string' },
            department: { type: 'string' },
            poNumber: { type: 'string' },
          },
        },
        express: { type: 'boolean', default: false },
        agentApiKey: {
          type: 'string',
          description: 'Optional: sk_agent_... — 指定時は off-session でカード自動請求を試みる。',
        },
      },
    },
  },
  {
    name: 'check_order_status',
    description: '注文IDと access_token から現在の状態を返す（顧客向けステータスURL経由）。注文作成後の進捗確認用。',
    inputSchema: {
      type: 'object',
      required: ['orderId'],
      properties: {
        orderId: { type: 'string', description: 'create_order の戻り値 dbOrderId (UUID)' },
        accessToken: { type: 'string' },
      },
    },
  },
] as const

// ── Tool implementations ────────────────────────────────────────────────────
// Invoke the AI route handlers IN-PROCESS rather than fetching the public URL.
// A self-fetch to ${BASE}/api/ai/* would re-enter the Vercel edge and run
// middleware again; because the inner request carries the platform egress IP
// (not the agent's), the shared /api/ai rate-limit bucket would collapse all
// MCP traffic onto one key and 429 the agent channel under modest load.
// Calling the handler directly avoids the second middleware pass entirely while
// keeping /api/ai rate-limited for genuinely external callers.
function normalizeRes(res: Response) {
  return res.text().then((text) => {
    const contentType = res.headers.get('content-type') ?? ''
    if (!res.ok) return { ok: false as const, status: res.status, body: text, contentType }
    if (contentType.includes('json')) {
      try { return { ok: true as const, status: res.status, json: JSON.parse(text) } }
      catch { return { ok: false as const, status: res.status, body: text, contentType } }
    }
    return { ok: true as const, status: res.status, json: text as unknown }
  })
}

async function callHandler(
  handler: (req: NextRequest) => Promise<Response> | Response,
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) {
  const req = new NextRequest(url, init)
  return normalizeRes(await handler(req))
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  authHeader?: string | null,
): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  try {
    if (name === 'get_catalog') {
      const r = await callHandler(aiCatalogGET, `${BASE}/api/ai/catalog.json`)
      return {
        content: [{ type: 'text', text: JSON.stringify(r.ok ? r.json : { error: r.body }, null, 2) }],
        isError: !r.ok,
      }
    }
    if (name === 'get_quote') {
      const r = await callHandler(aiQuotePOST, `${BASE}/api/ai/quote`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(args),
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(r.ok ? r.json : { error: r.body }, null, 2) }],
        isError: !r.ok,
      }
    }
    if (name === 'get_shipping') {
      const q = new URLSearchParams({
        quantity: String(args.quantity),
        express: args.express ? 'true' : 'false',
      })
      const r = await callHandler(aiShippingGET, `${BASE}/api/ai/shipping?${q.toString()}`)
      return {
        content: [{ type: 'text', text: JSON.stringify(r.ok ? r.json : { error: r.body }, null, 2) }],
        isError: !r.ok,
      }
    }
    if (name === 'create_order') {
      // Agent key can arrive either in the MCP Authorization header (preferred)
      // or inline inside the tool args for clients that can't forward headers.
      const inlineKey = typeof args.agentApiKey === 'string' ? args.agentApiKey : null
      const bodyArgs = { ...args }
      delete (bodyArgs as Record<string, unknown>).agentApiKey
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (authHeader) headers.authorization = authHeader
      else if (inlineKey) headers.authorization = `Bearer ${inlineKey}`

      const r = await callHandler(aiOrderPOST, `${BASE}/api/ai/order`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyArgs),
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(r.ok ? r.json : { error: r.body, status: r.status }, null, 2) }],
        isError: !r.ok,
      }
    }
    if (name === 'check_order_status') {
      const orderId = String(args.orderId)
      const token = typeof args.accessToken === 'string' ? args.accessToken : ''
      const url = `${BASE}/orders/${encodeURIComponent(orderId)}/status${token ? `?token=${encodeURIComponent(token)}` : ''}`
      // HEAD request to check if the status page is reachable without scraping HTML.
      const res = await fetch(url, { method: 'GET' })
      return {
        content: [{ type: 'text', text: JSON.stringify({ statusUrl: url, httpStatus: res.status, note: 'このURLをブラウザで開くと注文ステータスの詳細が見られます。' }, null, 2) }],
      }
    }
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  } catch (e) {
    return {
      content: [{ type: 'text', text: `Tool execution failed: ${e instanceof Error ? e.message : String(e)}` }],
      isError: true,
    }
  }
}

// ── HTTP handlers ──────────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization, mcp-session-id',
      'Access-Control-Expose-Headers': 'mcp-session-id',
      'Access-Control-Max-Age': '86400',
    },
  })
}

/** GET is accepted so clients can probe / discover the endpoint. */
export async function GET() {
  return NextResponse.json({
    server: SERVER_NAME,
    version: SERVER_VERSION,
    transport: 'streamable-http',
    protocolVersion: PROTOCOL_VERSION,
    description: 'FAST OEM MCP server — product catalog, quote, order, shipping tools for AI agents.',
    howToConnect: {
      claudeDesktop: {
        config: `{"mcpServers":{"fast-oem":{"url":"${BASE}/api/mcp","transport":"streamable-http"}}}`,
      },
    },
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  }, {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' },
  })
}

export async function POST(req: NextRequest) {
  let payload: JsonRpcRequest | JsonRpcRequest[]
  try {
    payload = await req.json()
  } catch {
    return rpcErr(null, -32700, 'Parse error')
  }

  // Batched requests — process sequentially and return array.
  if (Array.isArray(payload)) {
    const results = await Promise.all(payload.map((p) => handleOne(p, req)))
    return NextResponse.json(results.filter((r) => r !== null), {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
    })
  }

  const resp = await handleOne(payload, req)
  if (resp === null) {
    // Notification — no response body per JSON-RPC spec.
    return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  return NextResponse.json(resp, {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  })
}

async function handleOne(rpc: JsonRpcRequest, req: NextRequest): Promise<object | null> {
  const id = rpc?.id ?? null
  if (rpc?.jsonrpc !== '2.0' || typeof rpc?.method !== 'string') {
    return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } }
  }

  const method = rpc.method
  const params = (rpc.params && typeof rpc.params === 'object') ? rpc.params as Record<string, unknown> : {}

  // Notifications (no response).
  if (method.startsWith('notifications/')) return null

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
          description: 'FAST OEM public catalog/quote/order tools for AI agents.',
        },
        instructions: [
          '1. Call `get_catalog` to learn which products, options, and sizes exist.',
          '2. Use `get_quote` to show a price to the user.',
          '3. When the user confirms, call `create_order` with their shippingAddress. It returns a Stripe Hosted Checkout URL the user opens to pay.',
          '4. If the user has set up an Agent API Key + saved card at /mypage/agent-access, pass Authorization: Bearer sk_agent_... and `create_order` will charge automatically (no URL needed).',
        ].join('\n'),
      },
    }
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
  }

  if (method === 'tools/call') {
    const name = typeof params.name === 'string' ? params.name : ''
    const args = (params.arguments && typeof params.arguments === 'object') ? params.arguments as Record<string, unknown> : {}
    const tool = TOOLS.find((t) => t.name === name)
    if (!tool) {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } }
    }
    const authHeader = req.headers.get('authorization')
    const result = await runTool(name, args, authHeader)
    return { jsonrpc: '2.0', id, result }
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} }
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }
}
