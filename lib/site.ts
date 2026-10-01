/**
 * サイト全体で共有する定数・コンテンツ。
 * FAQ などはページ表示と構造化データ（JSON-LD）の両方で使うため、ここを唯一の定義元にする。
 */

export const SITE_URL = 'https://fast-oem.soara-mu.jp'
export const SITE_NAME = 'FAST OEM'
export const SITE_TAGLINE = '定期発注専用のオリジナルグッズOEM'
export const SITE_LAST_UPDATED = '2026-10-01'

export const CONTACT_EMAIL = 'contact@soara-mu.com'
export const BUSINESS_HOURS = '平日 10:00〜18:00（土日祝・年末年始を除く）'
export const REPLY_LEAD_TIME = '2〜3営業日以内'

/**
 * 運営会社の情報。会社名・URL・ロゴはコーポレートサイト（soara-mu.jp）の構造化データと揃える。
 * 代表者の氏名・住所はこのサイトには載せない（個人情報保護法上も、請求に応じて遅滞なく回答する形で足りる）。
 */
export const COMPANY = {
  name: '株式会社SOARA',
  founded: '2024年10月30日',
  foundingDate: '2024-10-30',
  locations: '東京・横浜',
  url: 'https://soara-mu.jp',
  logo: 'https://soara-mu.jp/images/logo.png',
  business: [
    'オリジナルグッズのOEM製作（FAST OEM）',
    'ガチャガチャ・クレーンゲーム・自販機の設置事業',
  ],
} as const

/**
 * 構造化データの @id。トップと個別ページで同じ実体を指すために共有する。
 * 運営会社はコーポレートサイト（soara-mu.jp）と同じ実体として記述し、FAST OEM はそのブランドとして扱う。
 */
export const ORG_ID = `${COMPANY.url}/#organization`
export const BRAND_ID = `${SITE_URL}/#brand`
export const SERVICE_ID = `${SITE_URL}/#service`
export const WEBSITE_ID = `${SITE_URL}/#website`

export type Product = {
  slug: string
  name: string
  /** 商品写真。未用意の商品は illustration のイラストにフォールバックする */
  image?: string
  alt?: string
  /** 写真が無いときに出すイラストの種類（components/lp/product-visual.tsx） */
  illustration?: 'dome-sticker' | 'sticker' | 'plush' | 'figure' | 'bag'
  /** 同じ商品の別の呼び方。検索経路が分かれるため構造化データ・本文に出す */
  alternateNames?: string[]
  tag: string
  description: string
  specs: string[]
}

export const PRODUCTS: Product[] = [
  {
    slug: 'acrylic-keychain',
    name: 'アクリルキーホルダー',
    alternateNames: ['アクキー'],
    image: '/images/acrylic-keychain.jpg',
    alt: 'キャラクターを印刷した型抜きのアクリルキーホルダー',
    tag: '型代不要',
    description:
      '透明アクリルにフルカラー印刷。デザインに沿った型抜きもでき、型代はかかりません。ガチャ景品や物販の定番アイテムです。',
    specs: ['UV印刷（片面・両面）', '型抜き・定形どちらも対応', 'ボールチェーンなど金具選択可'],
  },
  {
    slug: 'can-badge',
    name: '缶バッジ',
    alternateNames: ['缶バッチ'],
    image: '/images/can-badge.jpg',
    alt: 'さまざまなデザインを印刷した丸型の缶バッジと裏面の安全ピン',
    tag: '大量生産向き',
    description:
      '25mm〜75mmの丸型に対応。数量が増えるほど単価を下げやすく、ノベルティや景品の大量配布に向いています。',
    specs: ['25 / 32 / 44 / 55 / 75mm', '安全ピン仕様', '型代不要'],
  },
  {
    slug: 'pin-badge',
    name: 'ピンバッジ',
    alternateNames: ['ピンズ', 'ピンバッチ'],
    image: '/images/pin-badge.jpg',
    alt: 'ゴールドとシルバーのメタルピンバッジを裏面から撮影した様子',
    tag: '金型は初回のみ',
    description:
      '金属製で高級感のある仕上がり。社章・記念品・ブランドグッズに。金型は初回に製作し、継続発注の間は保管します。',
    specs: ['メタル素材・エナメル加工', 'バタフライクラッチ', '個別袋入り'],
  },
  {
    slug: 'rubber-keychain',
    name: 'ラバーキーホルダー',
    alternateNames: ['ラバキー', 'PVCキーホルダー'],
    image: '/images/rubber-keychain.jpg',
    alt: 'カラフルなPVC素材の立体ラバーキーホルダー',
    tag: '金型は初回のみ',
    description:
      'やわらかいPVC素材で、立体的なデザインを表現できます。キャラクターグッズや景品に人気。金型は継続発注の間は保管します。',
    specs: ['PVC素材・立体成型', 'フルカラー対応', 'ボールチェーンなど金具選択可'],
  },
  {
    slug: 'epoxy-sticker',
    name: 'ぷくぷくシール',
    alternateNames: ['ぷっくりシール', 'ドロップシール', 'エポキシシール', 'レジンシール', '盛り上がりシール'],
    illustration: 'dome-sticker',
    tag: '厚盛り仕上げ',
    description:
      '印刷したシールの表面に透明な樹脂を盛り、ぷっくりと立体的に仕上げたシールです。ぷっくりシール・ドロップシール・エポキシシールとも呼ばれ、いずれも同じものを指します。',
    specs: ['フルカラー印刷', '透明樹脂で厚みのある仕上がり', 'サイズ・台紙の形はご相談'],
  },
  {
    slug: 'sticker',
    name: 'ステッカー',
    alternateNames: ['シール', 'ダイカットステッカー', 'フレークシール'],
    illustration: 'sticker',
    tag: 'フルカラー印刷',
    description:
      'フルカラーで印刷し、絵柄に沿った形にカットするオリジナルステッカーです。1枚ずつ切り離したもの、台紙に並べたシートタイプ、小さなフレークシールもご相談ください。',
    specs: ['フルカラー印刷', '絵柄に沿ったカットに対応', 'シート・フレークなど形は相談'],
  },
  {
    slug: 'plush-toy',
    name: 'ぬいぐるみ',
    alternateNames: ['ぬい', 'マスコット', 'ぬいぐるみキーホルダー'],
    illustration: 'plush',
    tag: '型紙から製作',
    description:
      'デザイン画から型紙を起こして作る、オリジナルのぬいぐるみです。手のひらサイズのマスコットやキーホルダー付きもご相談ください。クレーンゲームやガチャの景品、物販の定番に。',
    specs: ['デザイン画から型紙を製作', 'サンプルで仕上がりを確認', 'マスコット・キーホルダー付きも相談可'],
  },
  {
    slug: 'mini-figure',
    name: 'ミニフィギュア',
    alternateNames: ['フィギュア', 'ミニチュア'],
    illustration: 'figure',
    tag: '原型から製作',
    description:
      'キャラクターやモチーフを立体にした、手のひらサイズのフィギュアです。原型を作り、金型で成形して彩色します。ガチャガチャ（カプセルトイ）の景品など、シリーズで作り続ける商品に。',
    specs: ['デザイン画から原型を製作', '金型で成形・彩色', 'カプセルに入るサイズも相談可'],
  },
  {
    slug: 'plastic-bag',
    name: 'レジ袋',
    alternateNames: ['ポリ袋', 'ビニール袋'],
    illustration: 'bag',
    tag: '店名・ロゴ入り',
    description:
      '店名やロゴを印刷した、オリジナルのレジ袋です。毎日使う消耗品なので、決まった時期にまとめて作る定期発注に向いています。バイオマス素材を配合した袋もご相談ください。',
    specs: ['店名・ロゴ・絵柄を印刷', 'サイズ・厚み・持ち手の形は相談', 'バイオマス素材の配合も相談可'],
  },
]

/** 商品ごとの個別ページ。旧ECサイトの商品URL（/products/<slug>）と同じ形にしてある */
export function productPath(slug: string): string {
  return `/products/${slug}`
}

export function findProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug)
}

/** トップページに出すお知らせ。新しいものを上に書く */
export type News = { date: string; text: string; href?: string }

export const NEWS: News[] = [
  {
    date: '2026-10-01',
    text: '対応グッズに「ぬいぐるみ」「ミニフィギュア」「ステッカー」「レジ袋」を追加しました。',
    href: '/#products',
  },
  {
    date: '2026-10-01',
    text: '対応グッズに「ぷくぷくシール（ぷっくりシール・ドロップシール）」を追加しました。',
    href: productPath('epoxy-sticker'),
  },
]

export type Faq = { question: string; answer: string }

export const FAQS: Faq[] = [
  {
    question: 'どのくらい安くなりますか？',
    answer:
      '商品・仕様・数量・発注の頻度によって変わるため、個別にお見積もりします。現在の仕入れ単価をお知らせいただければ、比べやすい形でご提案します。',
  },
  {
    question: '「定期的な発注」とは、どのくらいの頻度からですか？',
    answer:
      '同じ商品の発注が年に複数回見込めることが目安です。毎月、2〜3ヶ月ごと、シーズンごとなど、頻度と数量の組み合わせに合わせて単価を設計します。',
  },
  {
    question: '1回だけの注文はできますか？',
    answer:
      '申し訳ありませんが、単発・1回限りのご注文は現在お受けしていません。継続して発注が見込める商品のみを対象としています。',
  },
  {
    question: '毎回デザイン（絵柄）を変えても対象になりますか？',
    answer:
      'サイズ・素材・形状などの仕様が同じであれば、絵柄の変更はご相談いただけます。形状が変わる場合は、型代などが別途かかることがあります。',
  },
  {
    question: '最低ロットはありますか？',
    answer:
      '商品や仕様によって異なります。1回あたりの数量と発注の頻度をあわせてご相談ください。',
  },
  {
    question: 'ここに載っていないグッズも作れますか？',
    answer:
      'はい、掲載している商品以外も製作できます。継続した発注が見込める場合は、作りたいものをお見積もり依頼フォームからお知らせください。',
  },
  {
    question: 'キャラクターや他社のデザインを使ったグッズは作れますか？',
    answer:
      'お客様ご自身のデザイン、または権利者から許諾を得ているデザインに限ります。他社の商品やキャラクターを無断で使ったもの、模したものは製作できません。',
  },
  {
    question: 'ぷくぷくシール・ぷっくりシール・ドロップシールの違いは何ですか？',
    answer:
      '呼び方が違うだけで、どれも同じものを指します。印刷したシールの表面に透明な樹脂を盛り、ぷっくりと立体的に仕上げたシールです。エポキシシール・レジンシール・盛り上がりシールと呼ばれることもあります。どの呼び方でご相談いただいても、同じ製作に対応します。',
  },
  {
    question: 'シールも定期発注の対象になりますか？',
    answer:
      '対象です。同じ仕様でくり返し発注が見込める場合は、ぷくぷくシール（ドロップシール）も定期発注価格でお見積もりします。1回あたりの数量と発注の頻度をあわせてご相談ください。',
  },
  {
    question: '型代はかかりますか？',
    answer:
      'ピンバッジ・ラバーキーホルダー・ミニフィギュアは、初回のみ金型代がかかります。継続して発注いただいている間は型を保管するため、2回目以降はかかりません。アクリルキーホルダーと缶バッジは型代不要です。そのほかの商品は仕様によって異なるため、お見積もりの際にご案内します。',
  },
  {
    question: '途中で数量を変えたり、発注の時期をずらしたりできますか？',
    answer:
      '数量の増減や発注時期の調整はご相談ください。発注の条件は、お見積もりの際に個別に取り決めます。',
  },
  {
    question: '納期はどのくらいですか？',
    answer:
      '初回は仕様や数量によって異なるため、お見積もりの際にご案内します。2回目以降は発注スケジュールに合わせて前もって生産を計画するので、必要な時期に合わせて納品しやすくなります。',
  },
  {
    question: '個人でも依頼できますか？',
    answer:
      '継続して発注が見込める場合は、法人・個人事業主を問わずご相談いただけます。',
  },
  {
    question: '以前のように、Webサイトから直接注文できますか？',
    answer:
      'Webサイトからの直接注文（カート・決済）の受付は現在停止しています。定期発注のご相談は、このページのお見積もり依頼フォームからお問い合わせください。',
  },
]
