import Image from 'next/image'
import { COMPANY, CONTACT_EMAIL, SITE_NAME, SITE_TAGLINE } from '@/lib/site'
import { container } from './styles'

const LINKS = [
  { href: '/#reasons', label: '安くなる理由' },
  { href: '/#compare', label: '単発発注との違い' },
  { href: '/#products', label: '対応グッズ' },
  { href: '/#use-cases', label: '向いている用途' },
  { href: '/#conditions', label: 'ご利用の条件' },
  { href: '/#flow', label: 'ご依頼の流れ' },
  { href: '/#faq', label: 'よくある質問' },
  { href: '/#contact', label: 'お見積り依頼' },
  { href: '/#company', label: '運営会社' },
  { href: '/#privacy', label: '個人情報の取り扱い' },
]

export function SiteFooter() {
  return (
    <footer className="bg-brand-ink pb-24 text-white md:pb-0">
      <div className={`${container} grid gap-10 py-14 md:grid-cols-[1.1fr_1fr]`}>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white">
              <Image src="/icon.png" alt="" width={44} height={44} className="h-full w-full object-contain" />
            </span>
            <span>
              <span className="block text-xl font-extrabold leading-none tracking-tight">{SITE_NAME}</span>
              <span className="mt-1 block text-[11px] font-semibold leading-none text-white/60">{SITE_TAGLINE}</span>
            </span>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/65">
            定期的に発注があるオリジナルグッズに限定し、年間の発注見込みをもとにした単価でOEM製作します。アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーに対応。
          </p>
          <p className="mt-5 text-sm text-white/65">
            運営：
            <a href={COMPANY.url} target="_blank" rel="noopener" className="inline-block py-1 underline decoration-white/30 underline-offset-4 hover:text-white">
              {COMPANY.name}
            </a>
            <br />
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-block py-1 hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <nav aria-label="フッターメニュー">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="inline-block py-0.5 text-white/65 transition-colors hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className={`${container} py-5 text-xs text-white/50`}>
          &copy; {new Date().getFullYear()} {COMPANY.name} / {SITE_NAME}
        </p>
      </div>
    </footer>
  )
}
