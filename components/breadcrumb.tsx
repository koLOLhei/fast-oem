import Link from 'next/link'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export interface BreadcrumbItem {
  name: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
      aria-label="パンくずリスト"
    >
      <Link href="/" className="hover:text-foreground transition-colors">
        トップ
      </Link>
      {items.map((item, i) => (
        <span key={i} className="contents">
          <span>/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.name}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  const allItems = [{ name: 'トップ', href: '/' }, ...items]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: `${BASE_URL}${item.href}` } : {}),
    })),
  }
}
