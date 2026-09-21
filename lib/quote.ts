/**
 * 定期発注の見積り依頼フォーム — 選択肢の定義と入力チェック。
 * クライアント（フォーム表示）とサーバー（Server Action）の両方から使う純粋関数のみを置く。
 */

export const GOODS_OPTIONS = [
  { value: 'acrylic-keychain', label: 'アクリルキーホルダー' },
  { value: 'can-badge', label: '缶バッジ' },
  { value: 'pin-badge', label: 'ピンバッジ' },
  { value: 'rubber-keychain', label: 'ラバーキーホルダー' },
  { value: 'other', label: 'その他・未定' },
] as const

export const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: '毎月' },
  { value: 'every-2-3-months', label: '2〜3ヶ月に1回' },
  { value: 'semiannual', label: '半年に1回' },
  { value: 'annual', label: '年1回程度' },
  { value: 'undecided', label: '未定' },
] as const

export const QUANTITY_OPTIONS = [
  { value: 'under-300', label: '300個未満' },
  { value: '300-1000', label: '300〜1,000個' },
  { value: '1000-3000', label: '1,000〜3,000個' },
  { value: '3000-10000', label: '3,000〜1万個' },
  { value: 'over-10000', label: '1万個以上' },
  { value: 'undecided', label: '未定' },
] as const

export const LIMITS = {
  company: 100,
  name: 50,
  email: 254,
  phone: 20,
  message: 3000,
} as const

export type QuoteField = 'goods' | 'frequency' | 'quantity' | 'company' | 'name' | 'email' | 'phone' | 'message' | 'agree'

export type QuoteValues = {
  goods: string[]
  frequency: string
  quantity: string
  company: string
  name: string
  email: string
  phone: string
  message: string
  agree: boolean
}

export type QuoteInput = QuoteValues & {
  /** ハニーポット。人間には見えない欄なので、値が入っていればボットとみなす。 */
  website: string
}

export type ValidationResult =
  | { ok: true; data: QuoteValues }
  | { ok: false; fieldErrors: Partial<Record<QuoteField, string>> }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9０-９+()（）\-‐－ー\s]+$/

export function labelOf(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v : ''
}

export function readQuoteForm(formData: FormData): QuoteInput {
  return {
    goods: formData.getAll('goods').map(str),
    frequency: str(formData.get('frequency')),
    quantity: str(formData.get('quantity')),
    company: str(formData.get('company')),
    name: str(formData.get('name')),
    email: str(formData.get('email')),
    phone: str(formData.get('phone')),
    message: str(formData.get('message')),
    agree: str(formData.get('agree')) === 'yes',
    website: str(formData.get('website')),
  }
}

export function validateQuote(input: QuoteInput): ValidationResult {
  const errors: Partial<Record<QuoteField, string>> = {}
  const allowedGoods = new Set<string>(GOODS_OPTIONS.map((o) => o.value))
  const goods = [...new Set(input.goods)].filter((g) => allowedGoods.has(g))
  const frequency = input.frequency.trim()
  const quantity = input.quantity.trim()
  const company = input.company.trim()
  const name = input.name.trim()
  const email = input.email.trim()
  const phone = input.phone.trim()
  const message = input.message.trim()

  if (goods.length === 0) errors.goods = '作りたいグッズを1つ以上選んでください'
  if (!FREQUENCY_OPTIONS.some((o) => o.value === frequency)) errors.frequency = '発注頻度の見込みを選んでください'
  if (!QUANTITY_OPTIONS.some((o) => o.value === quantity)) errors.quantity = '1回あたりの数量を選んでください'
  if (company.length > LIMITS.company) errors.company = `会社名・屋号は${LIMITS.company}文字以内で入力してください`
  if (!name) errors.name = 'お名前を入力してください'
  else if (name.length > LIMITS.name) errors.name = `お名前は${LIMITS.name}文字以内で入力してください`
  if (!email) errors.email = 'メールアドレスを入力してください'
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) errors.email = 'メールアドレスの形式が正しくありません'
  if (phone && (phone.length > LIMITS.phone || !PHONE_RE.test(phone))) errors.phone = '電話番号は数字とハイフンで入力してください'
  if (message.length > LIMITS.message) errors.message = `ご相談内容は${LIMITS.message}文字以内で入力してください`
  if (!input.agree) errors.agree = '個人情報の取り扱いへの同意が必要です'

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors }
  return { ok: true, data: { goods, frequency, quantity, company, name, email, phone, message, agree: true } }
}
