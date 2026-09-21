import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// 公開しているのはトップページ1枚のみ。検索エンジン・AI検索のクローラーともに許可する。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
