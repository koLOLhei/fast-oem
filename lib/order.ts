import { type CartItem } from './cart'

export interface ShippingAddress {
  companyName?: string      // 会社名（法人の場合）
  department?: string       // 部署名（任意）
  poNumber?: string         // 発注番号（Purchase Order Number）
  lastName: string
  firstName: string
  lastNameKana: string
  firstNameKana: string
  postalCode: string
  prefecture: string
  city: string
  address1: string
  address2?: string
  phone: string
  email: string
  receiptAddressee?: string // 領収書の宛名（任意）— blank means use recipient name
}

export interface OrderData {
  id: string
  items: CartItem[]
  shippingAddress: ShippingAddress
  totalPrice: number
  createdAt: string
  status: 'pending' | 'paid' | 'processing' | 'partially_shipped' | 'shipped' | 'completed' | 'cancelled' | 'refunded'
}

export function generateOrderId(): string {
  // Cryptographically random 12-char alphanumeric (no timestamp, no sequential info)
  // Excludes visually ambiguous characters: 0/O, 1/I/L
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return `FO-${chars.slice(0, 6)}-${chars.slice(6)}`
}

export const PREFECTURES = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
]
