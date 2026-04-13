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

/**
 * Generate breadcrumb JSON-LD.
 * @param items — breadcrumb items. The last item should not have href.
 * @param currentPath — canonical path for the current (last) page, e.g. '/about'.
 *                       If provided, the last item gets an `item` URL (recommended by Google).
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[], currentPath?: string) {
  const allItems = [{ name: 'トップ', href: '/' }, ...items]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, i) => {
      const isLast = i === allItems.length - 1
      const url = item.href
        ? `${BASE_URL}${item.href}`
        : isLast && currentPath
          ? `${BASE_URL}${currentPath}`
          : undefined
      return {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        ...(url ? { item: url } : {}),
      }
    }),
  }
}
