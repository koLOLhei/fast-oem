import Image from 'next/image'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site'
import { container } from './styles'

const NAV = [
  { href: '/#reasons', label: '安くなる理由' },
  { href: '/#products', label: '対応グッズ' },
  { href: '/#conditions', label: 'ご利用条件' },
  { href: '/#faq', label: 'よくある質問' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className={`${container} flex h-16 items-center justify-between gap-4`}>
        <a href="/" className="group flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-border">
            <Image src="/icon.png" alt="" width={40} height={40} className="h-full w-full object-contain" />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-extrabold leading-none tracking-tight text-foreground">{SITE_NAME}</span>
            <span className="mt-1 whitespace-nowrap text-[11px] font-bold leading-none tracking-wide text-primary">
              <span className="sm:hidden">定期発注専用OEM</span>
              <span className="hidden sm:inline">{SITE_TAGLINE}</span>
            </span>
          </span>
        </a>

        <nav aria-label="ページ内メニュー" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="flex h-10 items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-foreground/75 transition-colors hover:bg-secondary hover:text-primary"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a
          href="/#contact"
          className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-brand transition-colors hover:bg-brand-blue-dark sm:px-5"
        >
          <span className="sm:hidden">無料見積もり</span>
          <span className="hidden sm:inline">見積もり依頼（無料）</span>
        </a>
      </div>
    </header>
  )
}
