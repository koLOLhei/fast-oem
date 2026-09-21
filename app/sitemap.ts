import type { MetadataRoute } from 'next'
import { PRODUCTS, SITE_LAST_UPDATED, SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      // 実際に内容を更新した日を入れる（毎回 now() にすると lastModified が信用されなくなる）
      lastModified: new Date(SITE_LAST_UPDATED),
      changeFrequency: 'monthly',
      priority: 1,
      images: [`${SITE_URL}/opengraph-image.jpg`, ...PRODUCTS.map((p) => `${SITE_URL}${p.image}`)],
    },
  ]
}
