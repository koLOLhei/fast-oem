import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Upload,
  Palette,
  Truck,
  CheckCircle,
  Clock,
  Shield,
  Star,
  Sparkles,
  Package,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProductCard } from '@/components/product-card'
import { getProductsFromDb } from '@/lib/products-db'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'FAST OEM | アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作',
  description:
    'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作。小ロット50個〜対応、格安・スピード納品。同人グッズ・ノベルティ・推しグッズ製作はFAST OEMへ。',
  keywords: [
    'OEM製作', 'オリジナルグッズ', 'グッズ製作', 'グッズ制作',
    'アクリルキーホルダー', 'アクリルキーホルダー製作',
    '缶バッジ', '缶バッジ製作', 'ピンバッジ', 'ピンバッジ製作',
    'ラバーキーホルダー',
    '小ロット', '小ロット製作', '格安', 'スピード納品', '短納期',
    '同人グッズ', '同人グッズ製作', 'ノベルティ', '推しグッズ',
    'グッズ 作りたい', 'グッズ 作る方法', 'オリジナルグッズ 制作',
    'グッズ製作 おすすめ', 'グッズ 注文', 'オーダーメイド グッズ',
  ],
  openGraph: {
    title: 'FAST OEM | アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作',
    description:
      'アクリルキーホルダー・缶バッジ・ピンバッジのOEM製作。小ロット対応・格安・スピード納品。同人グッズ・ノベルティなら FAST OEM。',
    url: BASE_URL,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'FAST OEM オリジナルグッズ製作' }],
  },
  alternates: { canonical: BASE_URL },
}

const steps = [
  {
    icon: Upload,
    title: '画像をアップロード',
    description: 'デザイン画像をドラッグ&ドロップで簡単アップロード',
    color: 'bg-[#00c8c8]',
  },
  {
    icon: Palette,
    title: 'カスタマイズ',
    description: 'サイズ・数量・オプションを自由に選択',
    color: 'bg-[#ffe135]',
  },
  {
    icon: CheckCircle,
    title: '注文・決済',
    description: 'クレジットカードで安全にお支払い',
    color: 'bg-[#ff7b54]',
  },
  {
    icon: Truck,
    title: 'お届け',
    description: '2週間〜1ヶ月程度で指定住所へ配送',
    color: 'bg-[#7ed957]',
  },
]

const features = [
  {
    icon: Clock,
    title: '通常2週間〜1ヶ月出荷',
    description: '安心の製造スケジュール',
    color: 'text-[#00c8c8]',
    bg: 'bg-[#00c8c8]/10',
  },
  {
    icon: Shield,
    title: '高品質保証',
    description: '厳選された提携工場',
    color: 'text-[#ff7b54]',
    bg: 'bg-[#ff7b54]/10',
  },
  {
    icon: Package,
    title: '小ロットOK',
    description: '50個から注文可能',
    color: 'text-[#ffe135]',
    bg: 'bg-[#ffe135]/20',
  },
  {
    icon: Star,
    title: '満足度98%',
    description: '多くのお客様に選ばれています',
    color: 'text-[#7ed957]',
    bg: 'bg-[#7ed957]/10',
  },
]

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  name: 'FAST OEM',
  legalName: '株式会社SOARA',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  image: `${BASE_URL}/opengraph-image.png`,
  description: 'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作。小ロット対応・格安・スピード納品。',
  foundingDate: '2024-10-30',
  founder: {
    '@type': 'Person',
    name: '小川 公平',
    jobTitle: '代表取締役',
    url: `${BASE_URL}/about`,
  },
  numberOfEmployees: {
    '@type': 'QuantitativeValue',
    value: 10,
  },
  email: 'contact@soara-mu.com',
  priceRange: '¥12〜¥300',
  currenciesAccepted: 'JPY',
  paymentAccepted: 'Credit Card',
  openingHours: 'Mo-Fr 10:00-18:00',
  knowsAbout: [
    'OEM製造',
    'アクリルキーホルダー製作',
    '缶バッジ製作',
    'ピンバッジ製作',
    'ラバーキーホルダー製作',
    'オリジナルグッズ企画',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'contact@soara-mu.com',
    contactType: 'customer service',
    availableLanguage: 'Japanese',
    areaServed: 'JP',
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: '横浜市',
    addressRegion: '神奈川県',
    postalCode: '221-0056',
    streetAddress: '神奈川区金港町5-14 クアドリフォリオ8階',
    addressCountry: 'JP',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 35.4657,
    longitude: 139.6281,
  },
  areaServed: {
    '@type': 'Country',
    name: 'Japan',
  },
}

const siteNavigationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SiteNavigationElement',
  name: 'メインナビゲーション',
  hasPart: [
    { '@type': 'WebPage', name: '商品一覧', url: `${BASE_URL}/products` },
    { '@type': 'WebPage', name: 'グッズ製作ガイド', url: `${BASE_URL}/guide` },
    { '@type': 'WebPage', name: 'よくある質問', url: `${BASE_URL}/faq` },
    { '@type': 'WebPage', name: 'お問い合わせ', url: `${BASE_URL}/contact` },
    { '@type': 'WebPage', name: '配送について', url: `${BASE_URL}/shipping` },
    { '@type': 'WebPage', name: '同人グッズ製作', url: `${BASE_URL}/use-cases/doujin` },
    { '@type': 'WebPage', name: '企業ノベルティ製作', url: `${BASE_URL}/use-cases/novelty` },
    { '@type': 'WebPage', name: '推し活グッズ製作', url: `${BASE_URL}/use-cases/oshikatsu` },
    { '@type': 'WebPage', name: '製作事例', url: `${BASE_URL}/cases` },
    { '@type': 'WebPage', name: 'コラム', url: `${BASE_URL}/blog` },
    { '@type': 'WebPage', name: '会社概要', url: `${BASE_URL}/about` },
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'FAST OEM',
  url: BASE_URL,
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'OEMグッズの最低注文数はいくつですか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '商品により異なりますが、アクリルキーホルダー・ピンバッジ・ラバーキーホルダーは50個〜、缶バッジは100個〜からご注文いただけます。小ロット対応でご注文しやすい価格を実現しています。',
      },
    },
    {
      '@type': 'Question',
      name: 'OEMグッズの納期はどのくらいですか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '通常2週間〜1ヶ月程度です。特急オプション（約2週間・送料2倍）もご用意しております。',
      },
    },
    {
      '@type': 'Question',
      name: 'デザインファイルはどの形式に対応していますか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PNG・JPG・SVG・AI・PSDなどの主要形式に対応しています。印刷品質確保のため300dpi以上を推奨します。',
      },
    },
    {
      '@type': 'Question',
      name: '同人グッズ・推しグッズの製作はできますか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'はい、多くの同人サークル・個人クリエイターの方にご利用いただいております。著作権はお客様自身が持つデザインに限ります。',
      },
    },
    {
      '@type': 'Question',
      name: '支払方法は何が使えますか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'クレジットカード（VISA・Mastercard・American Express・JCB）に対応しています。Stripe社の安全な決済システムを使用しております。',
      },
    },
  ],
}

export default async function HomePage() {
  const products = await getProductsFromDb()
  return (
    <div className="bg-background overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd, websiteJsonLd, faqJsonLd, siteNavigationJsonLd]) }}
      />
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-[#fdfbf6] overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#ffe135_0%,transparent_40%),radial-gradient(circle_at_bottom_left,#00c8c8_0%,transparent_30%)] opacity-20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white backdrop-blur rounded-full text-[#00c8c8] text-sm font-bold mb-8 shadow-sm border border-[#00c8c8]/20">
                <Sparkles className="h-4 w-4" />
                オリジナルグッズ製作プラットフォーム
              </div>

              <h1 className="flex flex-col items-start gap-2 text-4xl md:text-5xl lg:text-[3.5rem] font-black text-foreground tracking-tight leading-[1.15]">
                <span className="text-2xl md:text-3xl text-foreground/80 font-bold mb-2">あなただけの</span>
                <span className="inline-block bg-[#00c8c8] text-white px-5 py-2.5 rounded-2xl shadow-lg transform -rotate-2">
                  オリジナルグッズ
                </span>
                <span className="mt-3">をカンタンに作成</span>
              </h1>

              <p className="mt-8 text-base md:text-lg text-foreground/80 max-w-lg leading-loose bg-white/80 backdrop-blur p-6 rounded-2xl shadow-sm border border-foreground/5">
                アクリルキーホルダー、缶バッジ、ピンバッジなど、
                高品質な同人グッズ・ノベルティを最短ルートでお届けします。
                <span className="block mt-2 font-bold text-[#ff7b54]">小ロットから大量発注まで、柔軟に対応。</span>
              </p>

              <div className="mt-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#ff7b54] hover:bg-[#ff6b3d] text-white h-16 px-10 text-lg font-bold rounded-full shadow-lg shadow-[#ff7b54]/20 transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  <Link href="/products">
                    商品を選んで作成開始
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Hero Image Grid */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[#00c8c8] rounded-[3rem] transform rotate-3 scale-95" />
                <div className="absolute inset-0 bg-white rounded-[3rem] transform -rotate-2" />

                <div className="relative grid grid-cols-2 gap-4 p-6 bg-white/90 rounded-[2.5rem] border-4 border-foreground/10 shadow-2xl">
                  <div className="space-y-4">
                    <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-[#ffe135]">
                      <Image
                        src="/images/acrylic-keychain.jpg"
                        alt="アクリルキーホルダー OEM製作 - 透明アクリル素材にフルカラー印刷、小ロット50個から対応"
                        fill
                        priority
                        sizes="(max-width: 1024px) 0px, 25vw"
                        className="object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-[#ffe135] text-foreground text-xs font-bold px-2 py-1 rounded-lg">
                        人気No.1
                      </div>
                    </div>
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border-4 border-[#7ed957]">
                      <Image
                        src="/images/pin-badge.jpg"
                        alt="ピンバッジ OEM製作 - 金属エナメル仕上げ、企業ノベルティに人気"
                        fill
                        priority
                        sizes="(max-width: 1024px) 0px, 25vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border-4 border-[#ff7b54]">
                      <Image
                        src="/images/can-badge.jpg"
                        alt="缶バッジ OEM製作 - フルカラー印刷、同人イベント・推し活に最適"
                        fill
                        priority
                        sizes="(max-width: 1024px) 0px, 25vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-[#00c8c8]">
                      <Image
                        src="/images/rubber-keychain.jpg"
                        alt="ラバーキーホルダー OEM製作 - PVC素材で立体デザイン対応、キャラクターグッズに最適"
                        fill
                        priority
                        sizes="(max-width: 1024px) 0px, 25vw"
                        className="object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-[#00c8c8] text-white text-xs font-bold px-2 py-1 rounded-lg">
                        NEW
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Social Proof Banner */}
      <section className="bg-foreground text-background py-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-center gap-8 md:gap-16 text-center">
          <div>
            <p className="text-2xl font-black">50,000+</p>
            <p className="text-xs opacity-70">累計製作個数</p>
          </div>
          <div>
            <p className="text-2xl font-black">98%</p>
            <p className="text-xs opacity-70">顧客満足度</p>
          </div>
          <div>
            <p className="text-2xl font-black">500+</p>
            <p className="text-xs opacity-70">取引実績</p>
          </div>
          <div>
            <p className="text-2xl font-black">50個〜</p>
            <p className="text-xs opacity-70">小ロット対応</p>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="bg-white py-12 border-b-4 border-dashed border-[#00c8c8]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-white to-secondary/30 border-2 border-foreground/5 hover:border-primary/30 transition-all hover:shadow-lg">
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center flex-shrink-0 shadow-inner`}>
                  <feature.icon className={`h-7 w-7 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white via-[#e0f7fa]/30 to-[#00c8c8]/10 relative">

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#00c8c8] text-white px-6 py-2 rounded-full text-sm font-bold mb-4 shadow-lg">
              PRODUCTS
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-foreground">
              商品ラインナップ
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              豊富な商品から、あなたの目的に合ったグッズをお選びください
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button
              asChild
              size="lg"
              className="bg-foreground hover:bg-foreground/90 text-background h-14 px-10 rounded-2xl font-bold text-lg shadow-xl"
            >
              <Link href="/products">
                すべての商品を見る
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="py-20 md:py-28 bg-[#00c8c8] relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 border-8 border-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-60 h-60 border-8 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-white rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-white text-[#00c8c8] px-6 py-2 rounded-full text-sm font-bold mb-4 shadow-lg">
              HOW IT WORKS
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white">
              かんたん4ステップで完成
            </h2>
            <p className="mt-4 text-lg text-white/80">
              シンプルな操作で、あなただけのオリジナルグッズが完成します
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <Card
                key={step.title}
                className="relative border-4 border-white bg-white hover:scale-105 transition-transform shadow-xl rounded-3xl"
              >
                <div className={`absolute top-0 left-0 right-0 h-2 ${step.color} rounded-t-[1.25rem] z-0`} />
                <CardContent className="pt-14 pb-8 px-6 text-center">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                    <div className={`w-12 h-12 rounded-full ${step.color} text-white font-black text-xl flex items-center justify-center shadow-lg border-4 border-white`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className={`w-20 h-20 rounded-3xl ${step.color}/20 flex items-center justify-center mx-auto mb-5`}>
                    <step.icon className={`h-10 w-10 ${step.color.replace('bg-', 'text-')}`} />
                  </div>
                  <h3 className="font-bold text-foreground text-xl mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>



      {/* Use Case Links */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block bg-[#ffe135] text-foreground px-6 py-2 rounded-full text-sm font-bold mb-4 shadow-lg">
              USE CASES
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              用途に合わせて選べる
            </h2>
            <p className="mt-4 text-muted-foreground">
              あなたの目的に合ったグッズ製作の方法をご案内します
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/use-cases/doujin" className="group block p-8 bg-gradient-to-br from-[#ff7b54]/5 to-[#ff7b54]/10 rounded-3xl border-2 border-[#ff7b54]/20 hover:border-[#ff7b54]/50 transition-all hover:-translate-y-1 hover:shadow-lg">
              <h3 className="text-xl font-black text-foreground group-hover:text-[#ff7b54] transition-colors">同人グッズ製作</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">コミケ・即売会の頒布物に。小ロット50個〜対応で個人クリエイターも安心。</p>
              <span className="inline-flex items-center text-sm font-bold text-[#ff7b54] mt-4">
                詳しく見る <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link href="/use-cases/novelty" className="group block p-8 bg-gradient-to-br from-[#00c8c8]/5 to-[#00c8c8]/10 rounded-3xl border-2 border-[#00c8c8]/20 hover:border-[#00c8c8]/50 transition-all hover:-translate-y-1 hover:shadow-lg">
              <h3 className="text-xl font-black text-foreground group-hover:text-[#00c8c8] transition-colors">企業ノベルティ製作</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">展示会・キャンペーン向け。領収書・インボイス対応で法人も安心。</p>
              <span className="inline-flex items-center text-sm font-bold text-[#00c8c8] mt-4">
                詳しく見る <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link href="/use-cases/oshikatsu" className="group block p-8 bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-3xl border-2 border-pink-200 hover:border-pink-400 transition-all hover:-translate-y-1 hover:shadow-lg">
              <h3 className="text-xl font-black text-foreground group-hover:text-pink-500 transition-colors">推し活グッズ製作</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">推しの写真やイラストでオリジナルグッズ。ライブ・イベントの応援グッズに。</p>
              <span className="inline-flex items-center text-sm font-bold text-pink-500 mt-4">
                詳しく見る <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* SEO Content Block */}
      <section className="py-16 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">グッズ製作をもっと詳しく</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              初めてのグッズ制作でも安心。ガイド・事例・コラムで情報をチェック。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/guide"
              className="group block p-6 bg-white rounded-2xl border-2 border-[#00c8c8]/20 hover:border-[#00c8c8]/50 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-lg font-bold text-foreground group-hover:text-[#00c8c8] transition-colors">製作ガイド</h3>
              <p className="text-sm text-muted-foreground mt-2">デザインのコツから費用の目安まで、完全ガイド。</p>
              <span className="inline-flex items-center text-sm font-bold text-[#00c8c8] mt-3">
                詳しく見る <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link
              href="/cases"
              className="group block p-6 bg-white rounded-2xl border-2 border-[#ff7b54]/20 hover:border-[#ff7b54]/50 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-lg font-bold text-foreground group-hover:text-[#ff7b54] transition-colors">製作事例</h3>
              <p className="text-sm text-muted-foreground mt-2">同人・企業・推し活など、実際のお客様の製作事例を紹介。</p>
              <span className="inline-flex items-center text-sm font-bold text-[#ff7b54] mt-3">
                事例を見る <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link
              href="/blog"
              className="group block p-6 bg-white rounded-2xl border-2 border-[#7ed957]/20 hover:border-[#7ed957]/50 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-lg font-bold text-foreground group-hover:text-[#7ed957] transition-colors">コラム</h3>
              <p className="text-sm text-muted-foreground mt-2">グッズ製作のノウハウやトレンド情報をお届け。</p>
              <span className="inline-flex items-center text-sm font-bold text-[#7ed957] mt-3">
                記事を読む <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-[#ff7b54] relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-4 bg-[#ffe135]" />
          <div className="absolute bottom-0 left-0 w-full h-4 bg-[#00c8c8]" />
          <div className="absolute top-20 -left-20 w-80 h-80 bg-white/10 rounded-full" />
          <div className="absolute bottom-10 -right-10 w-60 h-60 bg-white/10 rounded-full" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
            今すぐオリジナルグッズを
            <br />
            作成しましょう
          </h2>
          <p className="mt-6 text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            会員登録なしでもご注文いただけます。
            まずはお好きな商品を選んでデザインをアップロードしてみてください。
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 bg-white hover:bg-white/90 text-[#ff7b54] h-16 px-12 text-xl font-black rounded-2xl shadow-2xl transition-all hover:scale-105 border-4 border-[#ffe135]"
          >
            <Link href="/products">
              商品を選ぶ
              <ArrowRight className="ml-2 h-6 w-6" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
