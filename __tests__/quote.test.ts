import { describe, expect, it } from 'vitest'
import { readQuoteForm, validateQuote, type QuoteInput } from '@/lib/quote'

const valid: QuoteInput = {
  goods: ['acrylic-keychain', 'can-badge'],
  frequency: 'every-2-3-months',
  quantity: '1000-3000',
  company: '株式会社テスト',
  name: '山田 太郎',
  email: 'taro@example.co.jp',
  phone: '045-000-0000',
  message: '3ヶ月ごとに3,000個ほど発注しています。',
  agree: true,
  website: '',
}

describe('validateQuote', () => {
  it('正しい入力を受け付け、前後の空白を取り除く', () => {
    const result = validateQuote({ ...valid, name: '  山田 太郎  ', email: ' taro@example.co.jp ' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('山田 太郎')
      expect(result.data.email).toBe('taro@example.co.jp')
    }
  })

  it('任意項目（会社名・電話・相談内容）は空でもよい', () => {
    expect(validateQuote({ ...valid, company: '', phone: '', message: '' }).ok).toBe(true)
  })

  it('必須項目が欠けているとフィールドごとのエラーを返す', () => {
    const result = validateQuote({ ...valid, goods: [], frequency: '', quantity: '', name: ' ', email: '', agree: false })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual(['agree', 'email', 'frequency', 'goods', 'name', 'quantity'])
    }
  })

  it('選択肢にない値は受け付けない', () => {
    const result = validateQuote({ ...valid, goods: ['<script>'], frequency: 'weekly', quantity: '999' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors.goods).toBeDefined()
      expect(result.fieldErrors.frequency).toBeDefined()
      expect(result.fieldErrors.quantity).toBeDefined()
    }
  })

  it('グッズの重複と不正値を取り除く', () => {
    const result = validateQuote({ ...valid, goods: ['pin-badge', 'pin-badge', 'unknown'] })
    expect(result.ok && result.data.goods).toEqual(['pin-badge'])
  })

  it('メールアドレス・電話番号の形式と文字数上限をチェックする', () => {
    const bad = validateQuote({ ...valid, email: 'not-an-email', phone: 'call me', message: 'あ'.repeat(3001) })
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.fieldErrors.email).toBeDefined()
      expect(bad.fieldErrors.phone).toBeDefined()
      expect(bad.fieldErrors.message).toBeDefined()
    }
    expect(validateQuote({ ...valid, phone: '０４５ー０００ー００００' }).ok).toBe(true)
  })
})

describe('readQuoteForm', () => {
  it('FormData から値を読み取る（複数選択・同意・ハニーポット）', () => {
    const fd = new FormData()
    fd.append('goods', 'can-badge')
    fd.append('goods', 'pin-badge')
    fd.append('frequency', 'monthly')
    fd.append('quantity', 'over-10000')
    fd.append('name', '山田')
    fd.append('email', 'a@b.jp')
    fd.append('agree', 'yes')
    fd.append('website', 'http://spam.example')
    const input = readQuoteForm(fd)
    expect(input.goods).toEqual(['can-badge', 'pin-badge'])
    expect(input.agree).toBe(true)
    expect(input.company).toBe('')
    expect(input.website).toBe('http://spam.example')
  })
})
