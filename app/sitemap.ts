import type { MetadataRoute } from 'next'
import { PRODUCT_PAGES } from '@/lib/product-pages'
import { PRODUCTS, SITE_LAST_UPDATED, SITE_URL, productPath } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  // 実際に内容を更新した日を入れる（毎回 now() にすると lastModified が信用されなくなる）
  const lastModified = new Date(SITE_LAST_UPDATED)
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
      images: [
        `${SITE_URL}/opengraph-image.jpg`,
        ...PRODUCTS.filter((p) => p.image).map((p) => `${SITE_URL}${p.image}`),
      ],
    },
    ...PRODUCTS.filter((p) => PRODUCT_PAGES[p.slug]).map((p) => ({
      url: `${SITE_URL}${productPath(p.slug)}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      ...(p.image ? { images: [`${SITE_URL}${p.image}`] } : {}),
    })),
  ]
}
