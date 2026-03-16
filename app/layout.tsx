import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/components/cart-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import './globals.css'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
})

export const metadata: Metadata = {
  title: {
    default: 'FAST OEM | オリジナルグッズを簡単作成',
    template: '%s | FAST OEM',
  },
  description:
    'アクリルキーホルダー、缶バッジ、ピンバッジなど、オリジナルグッズを簡単・スピーディーに作成。高品質な製品を低価格でお届けします。',
  keywords: [
    'オリジナルグッズ',
    'アクリルキーホルダー',
    '缶バッジ',
    'ピンバッジ',
    'ラバーキーホルダー',
    'ノベルティ',
    'OEM',
  ],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </CartProvider>
        <Analytics />
      </body>
    </html>
  )
}
