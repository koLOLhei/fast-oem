/**
 * /llms-full.txt — full machine-readable product catalog in markdown.
 * Intended for LLM agents that want everything inline (no API follow-up).
 */
import { getProductsFromDb } from '@/lib/products-db'

export const revalidate = 300

interface OptionValue {
  id: string
  label?: string
  priceModifier?: { type: 'add' | 'multiply'; value: number }
  requiresMold?: boolean
  moldFee?: number
}
interface ProductOption {
  id: string
  name?: string
  type: string
  required?: boolean
  parentId?: string
  showWhen?: string[]
  values: OptionValue[]
}

export async function GET() {
  const products = await getProductsFromDb()
  const active = products.filter((p) => p.isActive !== false)

  const lines: string[] = []
  lines.push('# FAST OEM — 商品カタログ全文（AI エージェント向け）')
  lines.push('')
  lines.push(`更新日: ${new Date().toISOString().split('T')[0]}`)
  lines.push('')
  lines.push('価格は税込・円建て。サイズ修飾子は multiply（倍率）、add（加算）のどちらか。')
  lines.push('')

  for (const p of active) {
    lines.push(`## ${p.name}`)
    lines.push('')
    lines.push(`- slug: \`${p.slug}\``)
    lines.push(`- URL: https://fast-oem.soara-mu.jp/products/${p.slug}`)
    lines.push(`- 説明: ${p.shortDescription ?? p.description}`)
    lines.push(`- 最小ロット: ${p.minQuantity}個`)
    lines.push(`- 最大ロット: ${p.maxQuantity}個`)
    if (p.requiresMold) {
      lines.push(`- 金型代: ¥${(p.moldFee ?? 0).toLocaleString('ja-JP')}（初回のみ・最終注文日から1年保管）`)
    } else {
      lines.push('- 金型代: 不要')
    }
    lines.push(`- 通常納期: 15〜30営業日`)
    if ((p.expressDeliveryFee ?? 0) > 0) {
      lines.push(`- 特急対応: あり（送料 ×2）`)
    } else {
      lines.push(`- 特急対応: なし`)
    }
    lines.push('')
    lines.push(`### 価格帯（${p.slug} 基準サイズ）`)
    lines.push('')
    lines.push('| 数量 | 単価(円/個) |')
    lines.push('|---:|---:|')
    for (const t of p.priceTiers) {
      lines.push(`| ${t.minQuantity}〜${t.maxQuantity} | ${t.unitPrice} |`)
    }
    lines.push('')
    lines.push('### オプション')
    lines.push('')
    for (const opt of (p.options as ProductOption[])) {
      if (!opt.values || opt.values.length === 0) continue
      const name = opt.name ?? opt.id
      const required = opt.required === false ? '(任意)' : '(必須)'
      const parent = opt.parentId ? ` ← shape=${(opt.showWhen ?? []).join('/')} の時のみ` : ''
      lines.push(`- **${name}** ${required} [id=${opt.id}]${parent}`)
      for (const v of opt.values) {
        let modifier = ''
        if (v.priceModifier) {
          modifier = v.priceModifier.type === 'multiply'
            ? ` (単価 × ${v.priceModifier.value})`
            : ` (${v.priceModifier.value >= 0 ? '+' : ''}¥${v.priceModifier.value}/個)`
        }
        const moldNote = v.requiresMold ? ` [金型代 ¥${(v.moldFee ?? 0).toLocaleString('ja-JP')}]` : ''
        lines.push(`  - \`${v.id}\`: ${v.label ?? v.id}${modifier}${moldNote}`)
      }
    }
    lines.push('')
  }

  lines.push('## 送料（カート合計数量ベース）')
  lines.push('')
  lines.push('| 合計数量 | 送料(税込) |')
  lines.push('|---:|---:|')
  lines.push('| 1〜300 | ¥5,000 |')
  lines.push('| 301〜500 | ¥8,000 |')
  lines.push('| 501〜1,000 | ¥11,000 |')
  lines.push('| 1,001〜2,000 | ¥16,000 |')
  lines.push('| 2,001〜3,000 | ¥18,000 |')
  lines.push('| 3,001〜4,000 | ¥20,000 |')
  lines.push('| 4,001〜 | ¥20,000 + (超過1,000個ごとに+¥2,000) |')
  lines.push('')
  lines.push('特急便選択時は送料 ×2。')
  lines.push('')
  lines.push('## 見積API 利用例')
  lines.push('')
  lines.push('```bash')
  lines.push('curl -X POST https://fast-oem.soara-mu.jp/api/ai/quote \\')
  lines.push("  -H 'content-type: application/json' \\")
  lines.push(`  -d '{"productSlug":"acrylic-keychain","quantity":500,"options":{"size":"50mm","shape":"die-cut"},"express":false}'`)
  lines.push('```')
  lines.push('')

  const body = lines.join('\n')
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-Robots-Tag': 'all',
    },
  })
}
