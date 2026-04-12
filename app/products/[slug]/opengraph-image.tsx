import { ImageResponse } from 'next/og'
import { getProductBySlugFromDb } from '@/lib/products-db'

export const runtime = 'edge'
export const alt = 'FAST OEM 商品画像'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlugFromDb(slug)

  const name = product?.name ?? '商品が見つかりません'
  const desc = product?.shortDescription ?? ''
  const minPrice = product?.priceTiers?.length
    ? Math.min(...product.priceTiers.map((t) => t.unitPrice))
    : null
  const features = product?.features?.slice(0, 4) ?? []

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left: text content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            paddingRight: '40px',
          }}
        >
          {/* Top: brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                borderRadius: '12px',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              F
            </div>
            <span style={{ color: '#94a3b8', fontSize: '24px', fontWeight: 600 }}>FAST OEM</span>
          </div>

          {/* Middle: product name + description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 800,
                color: '#f8fafc',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              {name}
            </div>
            {desc && (
              <div style={{ fontSize: '24px', color: '#94a3b8', lineHeight: 1.5 }}>
                {desc}
              </div>
            )}
          </div>

          {/* Bottom: price + features */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '32px' }}>
            {minPrice !== null && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '20px', color: '#94a3b8' }}>¥</span>
                <span
                  style={{
                    fontSize: '48px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {minPrice.toLocaleString()}
                </span>
                <span style={{ fontSize: '20px', color: '#94a3b8' }}>〜/個</span>
              </div>
            )}
            {features.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {features.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '14px',
                      color: '#67e8f9',
                    }}
                  >
                    {f}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: product image */}
        {product?.imageUrl && (
          <div
            style={{
              width: '380px',
              height: '380px',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '2px solid rgba(148, 163, 184, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              background: '#1e293b',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl.startsWith('/') ? `https://fast-oem.soara-mu.jp${product.imageUrl}` : product.imageUrl}
              alt={name}
              width={380}
              height={380}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
