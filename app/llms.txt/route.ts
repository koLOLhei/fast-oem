/**
 * /llms.txt — machine-friendly site guide for LLM agents.
 * Follows the informal llmstxt.org convention: short markdown document pointing
 * AI agents to the most useful resources + a programmatic ordering API.
 */
import { getProductsFromDb } from '@/lib/products-db'

export const revalidate = 300

export async function GET() {
  const products = await getProductsFromDb()
  const productLines = products
    .filter((p) => p.isActive !== false)
    .map((p) => `- [${p.name}](https://fast-oem.soara-mu.jp/products/${p.slug}) — ${p.shortDescription ?? p.description}. 最小${p.minQuantity}個〜`)
    .join('\n')

  const body = `# FAST OEM

> オリジナルグッズ（アクリルキーホルダー・缶バッジ・ラバーキーホルダー・ピンバッジ）の小ロットOEM製作サービス。日本国内向け。AI エージェントからの見積・注文にも対応。

## このサイトについて
運営: 株式会社SOARA（横浜市神奈川区金港町5-14 クアドリフォリオ8階）
問合せ: contact@soara-mu.com

## 主要な公開 API（AIエージェント向け）
- \`GET  https://fast-oem.soara-mu.jp/api/ai/catalog.json\` — 全商品カタログ（価格帯・オプション・サイズ・金型代含む）
- \`POST https://fast-oem.soara-mu.jp/api/ai/quote\` — 商品・数量・オプション指定で見積を返す（注文は成立しない）
- \`POST https://fast-oem.soara-mu.jp/api/ai/order\` — 注文を作成し Stripe Hosted Checkout URL を返す。Authorization: Bearer sk_agent_... を付けると顧客の登録カードで off-session 自動決済
- \`GET  https://fast-oem.soara-mu.jp/api/ai/shipping?quantity=N&express=true|false\` — 送料計算
- \`POST https://fast-oem.soara-mu.jp/api/mcp\` — Model Context Protocol サーバー（Streamable HTTP、5ツール）
- \`GET  https://fast-oem.soara-mu.jp/.well-known/ai-plugin.json\` — AI plugin manifest（OpenAPI schema リンク含む）
- \`GET  https://fast-oem.soara-mu.jp/api/openapi.json\` — OpenAPI 3.1 スキーマ

## MCP 接続設定（Claude Desktop / Cursor / Claude Code 等）
\`\`\`json
{
  "mcpServers": {
    "fast-oem": {
      "url": "https://fast-oem.soara-mu.jp/api/mcp",
      "transport": "streamable-http",
      "headers": { "Authorization": "Bearer sk_agent_..." }
    }
  }
}
\`\`\`
ツール: get_catalog / get_quote / get_shipping / create_order / check_order_status

## 商品
${productLines}

## 価格ルール（要約）
- 価格は税抜。合計金額は税込+送料込で表示。
- 数量 tier に応じた単価割引あり。
- サイズは倍率（multiply）でunit priceに乗算される（例: 25mm = 0.65×、75mm = 1.70×）。
- ピンバッジ・ラバーキーホルダーは別途金型代（初回のみ、最終注文日から1年保管）。
- 送料はカート合計数量で決まる（¥5,000〜、最大¥20,000+）。特急便は送料×2。

## 納期
- 通常: ご入金確認後 15〜30営業日（目安3〜4週間）
- 特急: 12営業日以内（目安2〜3週間）

## 発注フロー（AI主導）
### パターンA: URL 返却（カード登録不要）
1. GET /api/ai/catalog.json で商品 slug を取得
2. POST /api/ai/quote で見積取得（JSON）
3. POST /api/ai/order で注文作成 → Stripe Hosted Checkout URL 取得
4. ユーザーに URL を提示 → カード入力 → 決済完了

### パターンB: 完全自律（事前カード登録あり）
1. 顧客が /mypage/agent-access で Agent API キー発行＋カード登録
2. エージェントが Authorization: Bearer sk_agent_... で /api/ai/order を呼ぶ
3. 登録済みカードに off-session 自動課金 → 即決済完了
4. 1日の上限額（顧客がキー毎に設定）を超える注文は自動拒否

## 法務・ポリシー
- 特商法: /tokushoho
- 利用規約: /terms
- プライバシー: /privacy
- 配送: /shipping
- FAQ: /faq

## LLM / AIボット向け方針
- 検索用クロール: 歓迎
- 価格・仕様をユーザーに提示する用途: 歓迎
- **自動発注の完了（Stripe決済まで）は人間の最終承認が必須**。エージェントは /api/ai/quote で見積を取得し、カート URL をユーザーに提示してください。

## 最終更新
${new Date().toISOString().split('T')[0]}
`

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-Robots-Tag': 'all',
    },
  })
}
