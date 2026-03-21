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
import { DecorativeIllustrations, FloatingShapes, DoodleElements } from '@/components/illustrations'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'FAST OEM | アクリルキーホルダー・缶バッジ・ピンバッジのOEM製作',
  description:
    'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作。小ロット10個〜対応、格安・スピード納品。同人グッズ・ノベルティ・推しグッズ製作はFAST OEMへ。',
  keywords: [
    'OEM製作', 'オリジナルグッズ', 'グッズ製作', 'グッズ制作',
    'アクリルキーホルダー', 'アクリルキーホルダー製作',
    '缶バッジ', '缶バッジ製作', 'ピンバッジ', 'ピンバッジ製作',
    'ラバーキーホルダー', 'ビニール袋製作',
    '小ロット', '小ロット製作', '格安', 'スピード納品', '短納期',
    '同人グッズ', '同人グッズ製作', 'ノベルティ', '推しグッズ',
  ],
  openGraph: {
    title: 'FAST OEM | アクリルキーホルダー・缶バッジ・ピンバッジのOEM製作',
    description:
      'アクリルキーホルダー・缶バッジ・ピンバッジのOEM製作。小ロット対応・格安・スピード納品。同人グッズ・ノベルティなら FAST OEM。',
    url: BASE_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'FAST OEM オリジナルグッズ製作' }],
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
    description: '最短5営業日で指定住所へ配送',
    color: 'bg-[#7ed957]',
  },
]

const features = [
  {
    icon: Zap,
    title: '最短5営業日出荷',
    description: 'スピーディーな製造体制',
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
    description: '10個から注文可能',
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

const testimonials = [
  {
    name: '田中様',
    role: '同人サークル',
    content: '仕上がりがとても綺麗で、イベントで大好評でした。リピート決定です！',
    rating: 5,
    color: 'border-[#00c8c8]',
  },
  {
    name: '佐藤様',
    role: '企業ノベルティ担当',
    content: '短納期で高品質。急ぎの案件でも安心してお任せできました。',
    rating: 5,
    color: 'border-[#ffe135]',
  },
  {
    name: '鈴木様',
    role: '個人クリエイター',
    content: '小ロットから注文できるので、試作にぴったり。色の再現性も素晴らしいです。',
    rating: 5,
    color: 'border-[#ff7b54]',
  },
]

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'FAST OEM',
  url: BASE_URL,
  logo: `${BASE_URL}/icon.svg`,
  description: 'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作。小ロット対応・格安・スピード納品。',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '2500',
    bestRating: '5',
    worstRating: '1',
  },
  sameAs: [],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'FAST OEM',
  url: BASE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/products?category={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
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
        text: '商品により異なりますが、アクリルキーホルダー・缶バッジは10個〜、ラバーキーホルダーは30個〜からご注文いただけます。小ロット対応でご注文しやすい価格を実現しています。',
      },
    },
    {
      '@type': 'Question',
      name: 'OEMグッズの納期はどのくらいですか？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '通常2週間〜1ヶ月程度です。特急オプション（約10日）もご用意しております。',
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd, websiteJsonLd, faqJsonLd]) }}
      />
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-[#ffe135] via-[#fff9c4] to-[#ffe135]">
        {/* Decorative Elements */}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur rounded-full text-[#00c8c8] text-sm font-bold mb-6 shadow-lg border-2 border-[#00c8c8]">
                <Sparkles className="h-5 w-5" />
                オリジナルグッズ製作プラットフォーム
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight">
                <span className="inline-block bg-white/70 px-3 py-1 rounded-lg mb-2">あなただけの</span>
                <br />
                <span className="inline-block bg-[#00c8c8] text-white px-4 py-2 rounded-xl shadow-lg transform -rotate-1">
                  オリジナルグッズ
                </span>
                <br />
                <span className="inline-block mt-2">を作りましょう</span>
              </h1>

              <p className="mt-8 text-lg text-foreground/80 max-w-lg leading-relaxed bg-white/60 backdrop-blur p-4 rounded-xl border-2 border-dashed border-foreground/20">
                アクリルキーホルダー、缶バッジ、ピンバッジなど、
                高品質なオリジナルグッズを驚くほど簡単に作成できます。
                <span className="font-bold text-[#ff7b54]">小ロットから大量発注まで対応。</span>
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#ff7b54] hover:bg-[#ff6b3d] text-white h-16 px-10 text-xl font-bold rounded-2xl shadow-xl shadow-[#ff7b54]/30 transition-all hover:shadow-2xl hover:scale-105 border-4 border-white"
                >
                  <Link href="/products">
                    商品を選んで作成開始
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Link>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="mt-10 flex items-center gap-4 bg-white/80 backdrop-blur rounded-xl p-4 shadow-lg inline-flex">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-6 w-6 fill-[#ffe135] text-[#ffe135] drop-shadow-sm"
                    />
                  ))}
                </div>
                <div className="text-sm text-foreground">
                  <span className="font-black text-lg text-[#ff7b54]">4.9</span> / 5.0
                  <span className="mx-2 text-foreground/30">|</span>
                  <span className="font-black text-lg text-[#00c8c8]">2,500+</span>{' '}
                  件のレビュー
                </div>
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
                        alt="アクリルキーホルダー OEM製作"
                        fill
                        priority
                        className="object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-[#ffe135] text-foreground text-xs font-bold px-2 py-1 rounded-lg">
                        人気No.1
                      </div>
                    </div>
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border-4 border-[#7ed957]">
                      <Image
                        src="/images/pin-badge.jpg"
                        alt="ピンバッジ OEM製作"
                        fill
                        priority
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border-4 border-[#ff7b54]">
                      <Image
                        src="/images/can-badge.jpg"
                        alt="缶バッジ OEM製作"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-[#00c8c8]">
                      <Image
                        src="/images/rubber-keychain.jpg"
                        alt="ラバーキーホルダー OEM製作"
                        fill
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

      {/* Features Bar */}
      <section className="bg-white py-12 border-b-4 border-dashed border-[#00c8c8]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                className="relative border-4 border-white bg-white hover:scale-105 transition-transform shadow-xl rounded-3xl overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-2 ${step.color}`} />
                <CardContent className="pt-14 pb-8 px-6 text-center">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
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

      {/* Testimonials Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-[#ffe135]/20 via-white to-[#ff7b54]/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#ffe135] text-foreground px-6 py-2 rounded-full text-sm font-bold mb-4 shadow-lg">
              REVIEWS
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-foreground">
              お客様の声
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              FAST OEMをご利用いただいたお客様からの評価
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.name}
                className={`bg-white border-4 ${testimonial.color} hover:shadow-2xl transition-all hover:-translate-y-2 rounded-3xl`}
              >
                <CardContent className="p-8">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-[#ffe135] text-[#ffe135]"
                      />
                    ))}
                  </div>
                  <p className="text-foreground leading-relaxed mb-6 text-lg font-medium">
                    {`"${testimonial.content}"`}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${testimonial.color.replace('border-', 'bg-')}/20 flex items-center justify-center`}>
                      <span className={`${testimonial.color.replace('border-', 'text-')} font-bold text-lg`}>
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-foreground">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
