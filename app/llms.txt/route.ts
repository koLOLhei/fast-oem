/**
 * /llms.txt — AI（LLM）向けのサイト要約。llmstxt.org の慣習に沿った短い Markdown。
 */
import { BUSINESS_HOURS, COMPANY, FAQS, PRODUCTS, SITE_NAME, SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

export function GET() {
  const body = `# ${SITE_NAME}

> 定期的に発注があるオリジナルグッズに限定した、日本国内向けのOEM製作サービス。年間の発注見込み（頻度×数量）をもとに単価を設計し、単発の発注よりも安い単価で同じ仕様の商品を継続生産する。運営：${COMPANY.name}（${COMPANY.locations}）。

## 概要
- 対象：同じ商品（同一仕様）を継続して発注する法人・個人事業主（目安：年に複数回の発注）
- 対応グッズ：${PRODUCTS.map((p) => p.name).join('、')}（その他は要相談）
- 型代：ピンバッジ・ラバーキーホルダーは初回のみ（継続発注の間は型を保管）。アクリルキーホルダー・缶バッジは型代不要
- 単発・1回限りの注文は受け付けていない
- Webサイトからの直接注文（カート・決済）は停止中。見積もりはフォームで受け付ける
- 納品：日本全国

## 安くなる理由
1. 1回ごとの数量ではなく、年間の発注見込みで単価を設計する
2. 発注時期と数量が事前にわかるため、工場の生産計画に組み込める（急ぎの割増・段取り替えが減る）
3. 金型・印刷データ・仕様書は初回に確定し、2回目以降は再生産するだけ
4. 提携工場と直接取引し、材料もまとめて手配する

## 向いている用途
ガチャガチャ（カプセルトイ）の景品、クレーンゲーム・アミューズメント景品、店頭・ECで継続販売する定番グッズ、継続配布のノベルティ・販促品、キャラクター・IPグッズの定番品、社章・記念品

## よくある質問
${FAQS.map((f) => `- Q: ${f.question}\n  A: ${f.answer}`).join('\n')}

## 依頼・問い合わせ
- お見積もり依頼フォーム：${SITE_URL}/#contact
- 受付時間：${BUSINESS_HOURS}
- 運営会社：${COMPANY.name}／${COMPANY.url}

## 提供を終了したもの
- 旧オンライン注文ページ（/products、/cart、/checkout など）
- AIエージェント向けの注文API・MCPサーバー（/api/ai/*、/api/mcp）
`
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
