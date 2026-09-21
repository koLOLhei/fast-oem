'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'

/**
 * スマホ用の追従CTA。ヒーローを過ぎたら表示し、フォームが見えている間は隠す。
 */
export function MobileCta() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('hero')
    const contact = document.getElementById('contact')
    if (!hero || !contact || !('IntersectionObserver' in window)) return

    let pastHero = false
    let contactInView = false
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0
        if (entry.target === contact) contactInView = entry.isIntersecting
      }
      setVisible(pastHero && !contactInView)
    })
    observer.observe(hero)
    observer.observe(contact)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 motion-reduce:transition-none md:hidden ${
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
      aria-hidden={!visible}
    >
      <a
        href="#contact"
        tabIndex={visible ? 0 : -1}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-brand"
      >
        無料で見積もりを依頼する
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </a>
    </div>
  )
}
