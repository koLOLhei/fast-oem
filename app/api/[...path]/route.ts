/**
 * 旧API（注文・見積り・MCP・Stripe webhook など）はすべて提供を終了した。
 * AIエージェントや外部サービスが理由を判別できるよう、404 ではなく 410 Gone を JSON で返す。
 */

function gone() {
  return Response.json(
    {
      error: 'gone',
      message:
        'FAST OEM のオンライン注文・API は提供を終了しました。定期発注のご相談は https://fast-oem.soara-mu.jp/#contact からお問い合わせください。',
    },
    { status: 410, headers: { 'Cache-Control': 'public, max-age=3600' } },
  )
}

export const GET = gone
export const HEAD = gone
export const POST = gone
export const PUT = gone
export const PATCH = gone
export const DELETE = gone
export const OPTIONS = gone
