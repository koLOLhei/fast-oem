import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */

// Content-Security-Policy directives.
// - 'self' allows same-origin resources
// - Supabase: storage, auth, realtime, REST API
// - Stripe: JS SDK and iframe for secure card input
// - Sentry: error reporting
// - Upstash: Redis (server-side only; listed in connect-src for completeness)
// - fonts.googleapis.com / fonts.gstatic.com: Google Fonts
const supabaseHost = 'https://utwvalzykfxdeuwnebne.supabase.co'
const CSP = [
  "default-src 'self'",
  // Scripts: self + Stripe (fraud detection) + Google Analytics/GTM + Next.js inline scripts
  "script-src 'self' https://js.stripe.com https://www.googletagmanager.com 'unsafe-inline'",
  // Styles: self + Google Fonts + inline (Tailwind/CSS-in-JS)
  "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
  // Fonts: self + Google Fonts CDN
  `font-src 'self' https://fonts.gstatic.com data:`,
  // Images: self + Supabase public storage + data URIs (design preview)
  `img-src 'self' ${supabaseHost} data: blob:`,
  // Frames: self (admin preview iframe) + Stripe checkout iframe
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  // Fetch/XHR: Supabase, Stripe, Sentry, Upstash
  `connect-src 'self' ${supabaseHost} wss://utwvalzykfxdeuwnebne.supabase.co https://api.stripe.com https://*.sentry.io https://grand-muskox-79579.upstash.io https://www.google-analytics.com https://www.googletagmanager.com https://*.analytics.google.com`,
  // Workers: none (blob: for potential future use)
  "worker-src 'none'",
  // Objects/embeds: none
  "object-src 'none'",
  // Upgrade insecure requests in production
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: CSP,
  },
]

const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utwvalzykfxdeuwnebne.supabase.co',
      },
    ],
  },
  // Ensure the Japanese font used by PDF generation (receipts/invoices) is always
  // included in the build output. Without this, the font would be missing in
  // serverless/edge deployments that strip non-JS assets from public/.
  outputFileTracingIncludes: {
    '/api/receipts/[id]': ['./public/fonts/NotoSansJP-Regular.ttf'],
    '/api/invoices/[id]': ['./public/fonts/NotoSansJP-Regular.ttf'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Product pages use ISR (revalidate = 60). Let the CDN cache for 60s
      // with stale-while-revalidate so pages are fast AND fresh.
      // Previously this was no-store which defeated ISR entirely.
      {
        source: '/products/:slug*',
        headers: [
          { key: 'CDN-Cache-Control', value: 's-maxage=60, stale-while-revalidate=300' },
          { key: 'Vercel-CDN-Cache-Control', value: 's-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ]
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
