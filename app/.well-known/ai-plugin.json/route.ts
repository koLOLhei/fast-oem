/**
 * GET /.well-known/ai-plugin.json — ChatGPT-plugin-style manifest.
 * Even though the ChatGPT plugin store is retired, many agent frameworks
 * (LangChain, Dify, etc.) still probe this well-known path for metadata.
 */
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  return NextResponse.json({
    schema_version: 'v1',
    name_for_human: 'FAST OEM',
    name_for_model: 'fast_oem',
    description_for_human: 'オリジナルグッズ（アクリルキーホルダー・缶バッジ・ラバーキーホルダー・ピンバッジ）の見積を取得できます。',
    description_for_model: 'Lookup product catalog and compute price quotes for Japanese OEM custom merchandise: acrylic keychains, can-badges, rubber keychains, pin-badges. Use getCatalog to list products/options, then postQuote with a slug + quantity + options. Payment completion requires a human via the checkoutUrl returned in the quote — never attempt Stripe payment directly.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: 'https://fast-oem.soara-mu.jp/api/openapi.json',
      has_user_authentication: false,
    },
    logo_url: 'https://fast-oem.soara-mu.jp/icon.png',
    contact_email: 'contact@soara-mu.com',
    legal_info_url: 'https://fast-oem.soara-mu.jp/terms',
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
