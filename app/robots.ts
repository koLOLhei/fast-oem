import { MetadataRoute } from 'next'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/factory/', '/api/', '/checkout/', '/cart/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
