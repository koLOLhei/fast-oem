import type { ReactNode } from 'react'
import { Phrase } from './phrase'

export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  tone = 'default',
}: {
  id: string
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  tone?: 'default' | 'inverse'
}) {
  const inverse = tone === 'inverse'
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className={`text-xs font-bold tracking-[0.2em] ${inverse ? 'text-white/70' : 'text-primary'}`}>{eyebrow}</p>
      <h2
        id={id}
        className={`mt-3 text-[1.7rem] font-black leading-[1.4] tracking-tight sm:text-4xl ${inverse ? 'text-white' : 'text-foreground'}`}
      >
        {typeof title === 'string' ? <Phrase>{title}</Phrase> : title}
      </h2>
      {lead && (
        <p className={`mt-4 text-base leading-relaxed sm:text-lg ${inverse ? 'text-white/80' : 'text-muted-foreground'}`}>
          {typeof lead === 'string' ? <Phrase>{lead}</Phrase> : lead}
        </p>
      )}
    </div>
  )
}
