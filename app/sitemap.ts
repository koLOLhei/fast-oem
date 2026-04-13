import { MetadataRoute } from 'next'
import { getProductsFromDb } from '@/lib/products-db'
import { articles } from '@/lib/blog-articles'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静的ページは実際の更新日を使用（now()だとGoogleにlastModifiedが信用されなくなる）
  const siteLastUpdated = new Date('2026-04-13')
  const products = await getProductsFromDb()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: siteLastUpdated,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: siteLastUpdated,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/guide`,
      lastModified: siteLastUpdated,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    // Use-case landing pages (high priority for SEO)
    {
      url: `${BASE_URL}/use-cases/doujin`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/use-cases/novelty`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/use-cases/oshikatsu`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    // Category landing pages
    {
      url: `${BASE_URL}/products/category/keychain`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/products/category/badge`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Blog & Cases
    {
      url: `${BASE_URL}/blog`,
      lastModified: siteLastUpdated,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/cases`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/shipping`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: siteLastUpdated,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/tokushoho`,
      lastModified: siteLastUpdated,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: siteLastUpdated,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: siteLastUpdated,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/products/${product.slug}`,
    lastModified: siteLastUpdated,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const blogPages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }))

  return [...staticPages, ...productPages, ...blogPages]
}
