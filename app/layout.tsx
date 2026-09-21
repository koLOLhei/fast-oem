import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/react'
import { SiteHeader } from '@/components/lp/site-header'
import { SiteFooter } from '@/components/lp/site-footer'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `定期発注でオリジナルグッズを格安OEM製作｜${SITE_NAME}`,
    template: `%s｜${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  authors: [{ name: '株式会社SOARA', url: 'https://soara-mu.jp' }],
  creator: '株式会社SOARA',
  publisher: '株式会社SOARA',
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#1e73be',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:shadow-float"
        >
          本文へスキップ
        </a>
        <div className="flex min-h-screen flex-col">
          <p className="bg-brand-ink px-4 py-2 text-center text-xs leading-relaxed text-white/85">
            Webからの直接注文（カート・決済）は停止中です。現在は定期発注のご相談のみ承っています。
          </p>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
        <Analytics />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-K27ZY9QJDT" strategy="lazyOnload" />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('consent', 'default', {
              analytics_storage: 'granted',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
            });
            gtag('config', 'G-K27ZY9QJDT');
          `}
        </Script>
      </body>
    </html>
  )
}
