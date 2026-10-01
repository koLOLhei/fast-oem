import { Check, Clock } from 'lucide-react'
import { BUSINESS_HOURS, REPLY_LEAD_TIME } from '@/lib/site'
import { Phrase } from './phrase'
import { QuoteForm } from './quote-form'
import { container } from './styles'

const DEFAULT_TIPS = [
  '現在の仕入れ単価（比較のため）',
  '既存品の写真や仕様（サイズ・素材など）',
  '初回の希望納期と、その後の発注予定',
]

/**
 * お見積もり依頼フォームのセクション。トップと商品ページで共通。
 * 商品ページでは、その商品をあらかじめ選んだ状態にし、どのページから来た依頼かも一緒に送る。
 */
export function ContactSection({
  title = '定期発注のお見積もり依頼',
  tips = DEFAULT_TIPS,
  defaultGoods,
  source,
  privacyHref = '#privacy',
}: {
  title?: string
  tips?: string[]
  /** あらかじめ選んでおく「作りたいグッズ」 */
  defaultGoods?: string[]
  /** 依頼が送られたページのパス。社内通知メールに載せる */
  source?: string
  privacyHref?: string
}) {
  return (
    <section id="contact" aria-labelledby="contact-title" className="relative overflow-hidden bg-brand-blue-deep py-20 text-white sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-dotgrid opacity-15" aria-hidden="true" />
      <div className={`${container} relative grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14`}>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-white/70">
            CONTACT
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-black tracking-normal text-accent-foreground">
              見積もり無料
            </span>
          </p>
          <h2 id="contact-title" className="mt-3 text-[1.7rem] font-black leading-[1.4] tracking-tight sm:text-4xl">
            <Phrase>{title}</Phrase>
          </h2>
          <p className="mt-5 text-base leading-[1.9] text-white/85">
            作りたいグッズと、発注の頻度・数量の見込みを教えてください。{REPLY_LEAD_TIME}に担当者からご連絡します。
          </p>

          <div className="mt-8 rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 sm:p-6">
            <p className="font-bold">
              <Phrase>お見積もりが早く・正確になる情報</Phrase>
            </p>
            <ul className="mt-3 space-y-2">
              {tips.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={3} aria-hidden="true" />
                  <Phrase>{t}</Phrase>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-white/65">
              写真や資料は、送信後に届く確認メールへの返信でお送りください。
            </p>
          </div>

          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="flex items-center gap-2 text-white/75">
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                受付時間
              </dt>
              <dd className="mt-1 pl-6 font-bold">
                <Phrase>{BUSINESS_HOURS}</Phrase>
              </dd>
            </div>
          </dl>
        </div>

        <div className="text-foreground">
          <QuoteForm defaultGoods={defaultGoods} source={source} privacyHref={privacyHref} />
        </div>
      </div>
    </section>
  )
}
