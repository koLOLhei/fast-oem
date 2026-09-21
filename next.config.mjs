import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */

// Content-Security-Policy。
// 公開しているのは静的なLP1枚と見積りフォーム（Server Action = 同一オリジンへのPOST）のみ。
// 外部に通信するのは Google Analytics だけ。
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "frame-src 'none'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: CSP },
]

// 旧EC版のページ。内容が近いLP内のセクションへ、なければトップへ恒久リダイレクトする。
// （/admin・/factory など非公開だったURLは対象にせず 404 のまま）
const LEGACY_PAGES = [
  ['/products/:path*', '/#products'],
  ['/use-cases/:path*', '/#use-cases'],
  ['/guide', '/#flow'],
  ['/faq', '/#faq'],
  ['/contact', '/#contact'],
  ['/about', '/#company'],
  ['/privacy', '/#privacy'],
  ['/blog/:path*', '/'],
  ['/cases', '/'],
  ['/shipping', '/'],
  ['/terms', '/'],
  ['/tokushoho', '/'],
  ['/cart', '/'],
  ['/checkout/:path*', '/'],
  ['/login', '/'],
  ['/signup', '/'],
  ['/reset-password/:path*', '/'],
  ['/mypage/:path*', '/'],
  ['/orders/:path*', '/'],
  ['/auth/:path*', '/'],
  ['/llms-full.txt', '/llms.txt'],
]

const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // CSS（gzip 約9KB）をHTMLに埋め込み、表示をブロックする追加リクエストをなくす
    inlineCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async redirects() {
    return [
      // vercel.app の本番エイリアスは独自ドメインへ寄せる（重複コンテンツ回避）
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'fast-oem.vercel.app' }],
        destination: 'https://fast-oem.soara-mu.jp/:path*',
        permanent: true,
      },
      ...LEGACY_PAGES.map(([source, destination]) => ({ source, destination, permanent: true })),
    ]
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
})
