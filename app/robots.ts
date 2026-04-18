import { MetadataRoute } from 'next'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

// Disallow private / transactional paths, but keep public AI endpoints open.
const COMMON_DISALLOW = [
  '/admin/',
  '/factory/',
  '/api/admin/',
  '/api/webhooks/',
  '/api/cron/',
  '/api/receipts/',
  '/api/invoices/',
  '/api/orders/',
  '/checkout/',
  '/cart/',
  '/login/',
  '/signup/',
  '/mypage/',
  '/reset-password/',
  '/orders/',
  '/auth/',
]

// Public AI-agent endpoints + llms.txt must be explicitly allowed.
const AI_ALLOW = ['/api/ai/', '/api/mcp', '/api/openapi.json', '/llms.txt', '/llms-full.txt', '/.well-known/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Default: allow the site, block transactional/admin surfaces.
        userAgent: '*',
        allow: ['/', ...AI_ALLOW],
        disallow: COMMON_DISALLOW,
      },
      // Explicit AI bot rules — identical to *, but listed so their crawl is
      // traceable in server logs and owners know the site welcomes them.
      { userAgent: 'GPTBot', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'ChatGPT-User', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'OAI-SearchBot', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'ClaudeBot', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'Claude-Web', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'Claude-User', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'anthropic-ai', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'PerplexityBot', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'CCBot', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'Google-Extended', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'GoogleOther', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'Applebot-Extended', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'Meta-ExternalAgent', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
      { userAgent: 'Bytespider', allow: ['/', ...AI_ALLOW], disallow: COMMON_DISALLOW },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
