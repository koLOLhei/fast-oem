import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
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
]

const nextConfig = {
  images: {
    unoptimized: true,
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
