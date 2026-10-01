import Image from 'next/image'
import type { ReactNode } from 'react'
import type { Product } from '@/lib/site'

// イラスト用の色（ブランドの青・アンバーを白で薄めたもの）
const BLUE_L = '#cfe1f3'
const BLUE_M = '#9ac0e2'
const BLUE_D = '#629dd2'
const AMBER_L = '#fbd99f'
const AMBER_M = '#f8c56a'
const AMBER_D = '#f5a623'
const INK = '#2a3340'
const LINE = '#d5dde8'

/** 写真が無い商品に出すイラスト。120×120 の白い台紙の上に描く */
const ILLUSTRATIONS: Record<NonNullable<Product['illustration']>, ReactNode> = {
  // 台紙に並んだ、つやのあるシール
  'dome-sticker': (
    <>
      <circle cx="36" cy="38" r="16" fill={BLUE_M} />
      <ellipse cx="30" cy="31" rx="5" ry="3.2" fill="#fff" opacity="0.9" transform="rotate(-30 30 31)" />
      <rect x="62" y="22" width="32" height="32" rx="10" fill={AMBER_M} />
      <ellipse cx="71" cy="30" rx="5" ry="3.2" fill="#fff" opacity="0.9" transform="rotate(-30 71 30)" />
      <path d="M36 99C20 87 18 73 28 69c5-2 8 2 8 5 0-3 3-7 8-5 10 4 8 18-8 30Z" fill={AMBER_L} />
      <ellipse cx="28" cy="75" rx="3.6" ry="2.4" fill="#fff" opacity="0.9" transform="rotate(-30 28 75)" />
      <rect x="60" y="64" width="38" height="22" rx="11" fill={BLUE_L} />
      <ellipse cx="69" cy="70" rx="5" ry="2.8" fill="#fff" opacity="0.9" transform="rotate(-20 69 70)" />
      <circle cx="86" cy="99" r="7" fill={BLUE_D} />
      <circle cx="83.5" cy="96.5" r="2" fill="#fff" opacity="0.9" />
    </>
  ),
  // 白フチのついた平らなステッカー。1枚は角がめくれている
  sticker: (
    <>
      <circle cx="40" cy="40" r="19" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <circle cx="40" cy="40" r="14.5" fill={BLUE_M} />
      <path d="M40 31l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9Z" fill="#fff" />
      <rect x="64" y="22" width="34" height="34" rx="9" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <rect x="68.5" y="26.5" width="25" height="25" rx="6" fill={AMBER_M} />
      <path d="M81 46c-6-4.4-7.5-8-5-10 1.8-1.4 4-.6 5 1.2 1-1.8 3.2-2.6 5-1.2 2.5 2 1 5.6-5 10Z" fill="#fff" />
      <path d="M30 66h60a8 8 0 0 1 8 8v10L84 98H30a8 8 0 0 1-8-8V74a8 8 0 0 1 8-8Z" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <path d="M33 70.5h54a6.5 6.5 0 0 1 6.5 6.5v5.6L81.6 93.5H33a6.5 6.5 0 0 1-6.5-6.5V77a6.5 6.5 0 0 1 6.5-6.5Z" fill={BLUE_L} />
      <path d="M98 84 84 98v-8a6 6 0 0 1 6-6Z" fill={BLUE_M} />
      <rect x="34" y="77" width="30" height="4" rx="2" fill={BLUE_D} />
      <rect x="34" y="85" width="20" height="4" rx="2" fill={BLUE_M} />
    </>
  ),
  // くまのぬいぐるみ
  plush: (
    <>
      <circle cx="38" cy="38" r="13" fill={AMBER_M} />
      <circle cx="82" cy="38" r="13" fill={AMBER_M} />
      <circle cx="38" cy="38" r="6.5" fill={AMBER_L} />
      <circle cx="82" cy="38" r="6.5" fill={AMBER_L} />
      <circle cx="60" cy="63" r="31" fill={AMBER_M} />
      <circle cx="41" cy="71" r="4.5" fill="#f4a39b" opacity="0.6" />
      <circle cx="79" cy="71" r="4.5" fill="#f4a39b" opacity="0.6" />
      <ellipse cx="60" cy="74" rx="13" ry="10" fill="#fff" opacity="0.92" />
      <circle cx="48" cy="59" r="3.2" fill={INK} />
      <circle cx="72" cy="59" r="3.2" fill={INK} />
      <ellipse cx="60" cy="70" rx="4" ry="2.8" fill={INK} />
      <path
        d="M60 73v3.5m0 0c-1.6 2.6-5 2.6-6.4.4m6.4-.4c1.6 2.6 5 2.6 6.4.4"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  // 台座に立つ、頭の大きなフィギュア
  figure: (
    <>
      <ellipse cx="60" cy="101" rx="27" ry="6" fill={BLUE_L} />
      <ellipse cx="41" cy="77" rx="5.5" ry="10" fill={BLUE_M} />
      <ellipse cx="79" cy="77" rx="5.5" ry="10" fill={BLUE_M} />
      <rect x="45" y="64" width="30" height="35" rx="11" fill={BLUE_D} />
      <circle cx="60" cy="44" r="23" fill={AMBER_L} />
      <path d="M37 44a23 23 0 0 1 46 0c-6-7-14-10-23-10s-17 3-23 10Z" fill={AMBER_D} />
      <circle cx="52" cy="48" r="2.8" fill={INK} />
      <circle cx="68" cy="48" r="2.8" fill={INK} />
      <path d="M55 56c2.5 2.6 7.5 2.6 10 0" stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </>
  ),
  // 持ち手つきのレジ袋。中央に店のマーク
  bag: (
    <>
      <path
        d="M36 20H48V31Q48 37 54 37H66Q72 37 72 31V20H84V41Q84 45 90 47V94Q90 102 82 102H38Q30 102 30 94V47Q36 45 36 41Z"
        fill={BLUE_L}
      />
      <circle cx="60" cy="68" r="13" fill="#fff" opacity="0.92" />
      <circle cx="60" cy="68" r="6" fill={AMBER_M} />
      <rect x="44" y="88" width="32" height="4" rx="2" fill={BLUE_M} />
    </>
  ),
}

/**
 * 商品の写真。写真が未用意の商品は、写真と誤解されないイラストにフォールバックする。
 * 親要素で `relative` と大きさ（縦横比など）を指定して使う。
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
  // 写真の代わりのイラスト。実物の見本ではないので、読み上げの対象にしない
  return (
    <div className="flex h-full w-full items-center justify-center bg-secondary" aria-hidden="true">
      <svg viewBox="0 0 120 120" className="h-[72%] w-[72%]">
        <rect x="8" y="8" width="104" height="104" rx="14" fill="#fff" opacity="0.9" />
        {ILLUSTRATIONS[product.illustration ?? 'dome-sticker']}
      </svg>
    </div>
  )
}
