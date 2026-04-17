import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Users, Building2, Heart } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '用途別グッズ製作ガイド｜同人・ノベルティ・推し活',
  description:
    '同人グッズ・企業ノベルティ・推し活グッズなど、用途別のオリジナルグッズ製作ガイド。FAST OEMなら小ロット50個（缶バッジは100個）から対応（缶バッジは100個〜）、最短約2週間で納品。',
  openGraph: {
    title: '用途別グッズ製作ガイド | FAST OEM',
    description: '同人・ノベルティ・推し活など、用途に合わせたグッズ製作をご案内。',
    url: `${BASE_URL}/use-cases`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: `${BASE_URL}/use-cases` },
}

const useCases = [
  {
    href: '/use-cases/doujin',
    icon: Users,
    title: '同人グッズ製作',
    description: 'コミケ・即売会の頒布物に。小ロット50個〜対応（缶バッジは100個〜）で個人クリエイターも安心。アクリルキーホルダー・缶バッジが人気です。',
    color: 'border-[#ff7b54]/30 hover:border-[#ff7b54]',
    iconBg: 'bg-[#ff7b54]/10 text-[#ff7b54]',
    cta: 'text-[#ff7b54]',
  },
  {
    href: '/use-cases/novelty',
    icon: Building2,
    title: '企業ノベルティ製作',
    description: '展示会・キャンペーン・社内イベント向け。領収書・インボイス対応で法人も安心。ピンバッジ・アクリルキーホルダーが人気です。',
    color: 'border-[#00c8c8]/30 hover:border-[#00c8c8]',
    iconBg: 'bg-[#00c8c8]/10 text-[#00c8c8]',
    cta: 'text-[#00c8c8]',
  },
  {
    href: '/use-cases/oshikatsu',
    icon: Heart,
    title: '推し活グッズ製作',
    description: '推しの写真やイラストでオリジナルグッズを製作。ライブ・イベントの応援グッズ、痛バッグ用の缶バッジなどに。',
    color: 'border-pink-200 hover:border-pink-400',
    iconBg: 'bg-pink-100 text-pink-600',
    cta: 'text-pink-500',
  },
]

export default function UseCasesPage() {
  const bcJsonLd = breadcrumbJsonLd([{ name: '用途別ガイド' }], '/use-cases')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bcJsonLd) }}
      />
      <div className="py-12 md:py-16 bg-background min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ name: '用途別ガイド' }]} />

          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-black text-foreground">
              用途別グッズ製作ガイド
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              あなたの目的に合ったグッズ製作の方法をご案内します。
            </p>
          </div>

          <div className="space-y-6">
            {useCases.map((uc) => (
              <Link
                key={uc.href}
                href={uc.href}
                className={`group block p-6 md:p-8 bg-card rounded-2xl border-2 ${uc.color} transition-all hover:-translate-y-1 hover:shadow-lg`}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-14 h-14 rounded-2xl ${uc.iconBg} flex items-center justify-center shrink-0`}>
                    <uc.icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-foreground">{uc.title}</h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{uc.description}</p>
                    <span className={`inline-flex items-center text-sm font-bold ${uc.cta} mt-3`}>
                      詳しく見る <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              どの用途にもぴったりのグッズが見つかります
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 rounded-xl font-bold transition-colors"
            >
              商品一覧を見る <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
