import Image from 'next/image'
import type { Product } from '@/lib/site'

/**
 * 商品の写真。写真が未用意の商品は、写真と誤解されないイラストにフォールバックする。
 * 親要素で `relative` と縦横比（aspect-*）を指定して使う。
 */
export function ProductVisual({
  product,
  sizes,
  priority = false,
  decorative = false,
}: {
  product: Product
  sizes: string
  priority?: boolean
  /** すぐ隣に商品名のテキストがあるときは true（代替テキストを空にして二重読み上げを避ける） */
  decorative?: boolean
}) {
  if (product.image) {
    return (
      <Image
        src={product.image}
        alt={decorative ? '' : (product.alt ?? product.name)}
        fill
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        className="object-cover"
      />
    )
  }
  // 台紙に並んだ、つやのあるシールのイラスト。写真の代わりであって実物の見本ではない
  return (
    <div className="flex h-full w-full items-center justify-center bg-secondary text-primary" aria-hidden="true">
      <svg viewBox="0 0 120 120" className="aspect-square h-[68%]">
        <rect x="8" y="8" width="104" height="104" rx="14" fill="#fff" opacity="0.9" />
        <circle cx="36" cy="38" r="16" fill="currentColor" opacity="0.3" />
        <ellipse cx="30" cy="31" rx="5" ry="3.2" fill="#fff" opacity="0.9" transform="rotate(-30 30 31)" />
        <rect x="62" y="22" width="32" height="32" rx="10" fill="var(--brand-amber)" opacity="0.6" />
        <ellipse cx="71" cy="30" rx="5" ry="3.2" fill="#fff" opacity="0.9" transform="rotate(-30 71 30)" />
        <path
          d="M36 99C20 87 18 73 28 69c5-2 8 2 8 5 0-3 3-7 8-5 10 4 8 18-8 30Z"
          fill="var(--brand-amber)"
          opacity="0.5"
        />
        <ellipse cx="28" cy="75" rx="3.6" ry="2.4" fill="#fff" opacity="0.9" transform="rotate(-30 28 75)" />
        <rect x="60" y="64" width="38" height="22" rx="11" fill="currentColor" opacity="0.2" />
        <ellipse cx="69" cy="70" rx="5" ry="2.8" fill="#fff" opacity="0.9" transform="rotate(-20 69 70)" />
        <circle cx="86" cy="99" r="7" fill="currentColor" opacity="0.38" />
        <circle cx="83.5" cy="96.5" r="2" fill="#fff" opacity="0.9" />
      </svg>
    </div>
  )
}
