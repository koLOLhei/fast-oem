/**
 * サイト全体で共有する定数・コンテンツ。
 * FAQ などはページ表示と構造化データ（JSON-LD）の両方で使うため、ここを唯一の定義元にする。
 */

export const SITE_URL = 'https://fast-oem.soara-mu.jp'
export const SITE_NAME = 'FAST OEM'
export const SITE_TAGLINE = '定期発注専用のオリジナルグッズOEM'
export const SITE_LAST_UPDATED = '2026-09-21'

export const CONTACT_EMAIL = 'contact@soara-mu.com'
export const BUSINESS_HOURS = '平日 10:00〜18:00（土日祝・年末年始を除く）'
export const REPLY_LEAD_TIME = '2〜3営業日以内'

export const COMPANY = {
  name: '株式会社SOARA',
  representative: '小川 公平',
  representativeTitle: '代表取締役',
  founded: '2024年10月',
  foundingDate: '2024-10-30',
  postalCode: '221-0056',
  region: '神奈川県',
  locality: '横浜市',
  street: '神奈川区金港町5-14 クアドリフォリオ8階',
  address: '〒221-0056 神奈川県横浜市神奈川区金港町5-14 クアドリフォリオ8階',
  url: 'https://soara-mu.jp',
  business: [
    'オリジナルグッズのOEM製作（FAST OEM）',
    'ガチャガチャ・クレーンゲーム・自販機の設置事業',
  ],
} as const

export type Product = {
  slug: string
  name: string
  image: string
  alt: string
  tag: string
  description: string
  specs: string[]
}

export const PRODUCTS: Product[] = [
  {
    slug: 'acrylic-keychain',
    name: 'アクリルキーホルダー',
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
    image: '/images/rubber-keychain.jpg',
    alt: 'カラフルなPVC素材の立体ラバーキーホルダー',
    tag: '金型は初回のみ',
    description:
      'やわらかいPVC素材で、立体的なデザインを表現できます。キャラクターグッズや景品に人気。金型は継続発注の間は保管します。',
    specs: ['PVC素材・立体成型', 'フルカラー対応', 'ボールチェーンなど金具選択可'],
  },
]

export type Faq = { question: string; answer: string }

export const FAQS: Faq[] = [
  {
    question: 'どのくらい安くなりますか？',
    answer:
      '商品・仕様・数量・発注の頻度によって変わるため、個別にお見積りします。現在の仕入れ単価をお知らせいただければ、比べやすい形でご提案します。',
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
    question: '型代はかかりますか？',
    answer:
      'ピンバッジとラバーキーホルダーは、初回のみ金型代がかかります。継続して発注いただいている間は型を保管するため、2回目以降はかかりません。アクリルキーホルダーと缶バッジは型代不要です。',
  },
  {
    question: '途中で数量を変えたり、発注の時期をずらしたりできますか？',
    answer:
      '数量の増減や発注時期の調整はご相談ください。発注の条件は、お見積りの際に個別に取り決めます。',
  },
  {
    question: '納期はどのくらいですか？',
    answer:
      '初回は仕様や数量によって異なるため、お見積りの際にご案内します。2回目以降は発注スケジュールに合わせて前もって生産を計画するので、必要な時期に合わせて納品しやすくなります。',
  },
  {
    question: '個人でも依頼できますか？',
    answer:
      '継続して発注が見込める場合は、法人・個人事業主を問わずご相談いただけます。',
  },
  {
    question: '以前のように、Webサイトから直接注文できますか？',
    answer:
      'Webサイトからの直接注文（カート・決済）の受付は現在停止しています。定期発注のご相談は、このページのお見積り依頼フォームからお問い合わせください。',
  },
]
