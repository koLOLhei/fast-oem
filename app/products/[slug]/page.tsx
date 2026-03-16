import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug, PRODUCTS } from '@/lib/products'
import { ProductDetailClient } from './product-detail-client'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return PRODUCTS.map((product) => ({
    slug: product.slug,
  }))
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    return {
      title: '商品が見つかりません',
    }
  }

  return {
    title: product.name,
    description: product.description,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return <ProductDetailClient product={product} />
}
