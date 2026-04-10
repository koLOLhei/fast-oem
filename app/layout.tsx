import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/components/cart-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getProductsFromDb } from '@/lib/products-db'
import './globals.css'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
})

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'FAST OEM | 小ロットOEMグッズ製作・オリジナルグッズ作成',
    template: '%s | FAST OEM',
  },
  description:
    'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダー・ビニール袋のOEM製作。小ロット対応・格安・スピード納品。同人グッズ・ノベルティ・推しグッズの製作なら FAST OEM。',
  keywords: [
    'OEM', 'OEM製造', 'OEM製作', 'グッズ制作', 'グッズ製作', 'グッズ製造',
    'オリジナルグッズ', 'オリジナル商品', 'オリジナルグッズ製作',
    'アクリルキーホルダー', 'アクリルキーホルダー製作', 'アクリルキーホルダー作成',
    '缶バッジ', '缶バッジ製作', '缶バッジ作成', '缶バッジ小ロット',
    'ピンバッジ', 'ピンバッジ製作', 'ピンバッジ作成',
    'ラバーキーホルダー', 'ラバーキーホルダー製作', 'ゴムキーホルダー',
    'ビニール袋', 'ビニール袋製作', 'ビニール袋オリジナル',
    'ノベルティ', 'ノベルティ製作', 'ノベルティグッズ',
    '同人グッズ', '同人グッズ製作', '推しグッズ',
    '小ロット', '小ロット製作', '小ロット注文', '格安', 'スピード納品', '短納期',
    'キーホルダー製作', 'バッジ製作',
  ],
  authors: [{ name: 'FAST OEM', url: BASE_URL }],
  creator: 'FAST OEM',
  publisher: 'FAST OEM',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: BASE_URL,
    siteName: 'FAST OEM',
    title: 'FAST OEM | 小ロットOEMグッズ製作・オリジナルグッズ作成',
    description:
      'アクリルキーホルダー・缶バッジ・ピンバッジのOEM製作。小ロット対応・格安・スピード納品。同人グッズ・ノベルティの製作なら FAST OEM。',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'FAST OEM オリジナルグッズ製作' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAST OEM | オリジナルグッズ製作',
    description: 'アクリルキーホルダー・缶バッジ・ピンバッジのOEM製作。小ロット対応・格安・スピード納品。',
    images: ['/opengraph-image.png'],
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      'ja': BASE_URL,
      'x-default': BASE_URL,
    },
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const products = await getProductsFromDb()
  const productNav = products.map((p) => ({ slug: p.slug, name: p.name }))

  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://utwvalzykfxdeuwnebne.supabase.co" />
        <link rel="dns-prefetch" href="https://utwvalzykfxdeuwnebne.supabase.co" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer products={productNav} />
          </div>
        </CartProvider>
        <Analytics />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-K27ZY9QJDT"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
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
