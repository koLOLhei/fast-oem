import { Plus } from 'lucide-react'
import type { Faq } from '@/lib/site'
import { Phrase } from './phrase'

/** よくある質問のアコーディオン。トップと商品ページで共通 */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="mx-auto mt-12 max-w-3xl space-y-3">
      {faqs.map((f) => (
        <details key={f.question} className="faq group rounded-2xl bg-card shadow-card ring-1 ring-border">
          <summary className="flex cursor-pointer items-start gap-3 p-5 sm:p-6">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
              Q
            </span>
            <h3 className="flex-1 font-bold leading-relaxed text-foreground">
              <Phrase>{f.question}</Phrase>
            </h3>
            <Plus
              className="mt-1 h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-45 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </summary>
          <div className="flex gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-amber-soft text-xs font-black text-[#7a4f00]">
              A
            </span>
            <p className="flex-1 text-[15px] leading-[1.85] text-muted-foreground">{f.answer}</p>
          </div>
        </details>
      ))}
    </div>
  )
}
