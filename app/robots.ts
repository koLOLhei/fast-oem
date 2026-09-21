import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// 公開しているのはトップページ1枚のみ。検索エンジン・AI検索のクローラーともに許可する。
// 旧API（/api/*）は 410 を返すので、あえてブロックしない（クロールされれば「削除済み」と認識されて索引から外れる）。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
