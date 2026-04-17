#!/usr/bin/env node
/**
 * Validate internal links in blog article bodies.
 *
 * Catches the class of bug that shipped to production on 2026-04-17:
 * two articles referenced /blog/goods-budget-guide and
 * /blog/enamel-vs-print-pin-badge, neither of which existed as slugs.
 *
 * Usage: npm run check:links  (or node scripts/check-links.mjs)
 * Exits non-zero when any reference is broken.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const blogPath = resolve(root, 'lib/blog-articles.ts')
const productsPath = resolve(root, 'lib/products.ts')

const blogSrc = readFileSync(blogPath, 'utf8')
const productSrc = readFileSync(productsPath, 'utf8')

const extract = (src, re) => {
  const s = new Set()
  let m
  while ((m = re.exec(src)) !== null) s.add(m[1])
  return s
}

const blogSlugs = extract(blogSrc, /slug:\s*'([a-z0-9-]+)'/g)
const productSlugs = extract(productSrc, /slug:\s*'([a-z0-9-]+)'/g)

// References across blog + product content bodies
const allSrc = blogSrc + '\n' + productSrc
const blogRefs = extract(allSrc, /\(\/blog\/([a-z0-9-]+)\)/g)
const productRefs = extract(allSrc, /\(\/products\/([a-z0-9-]+)\)/g)

const errors = []

for (const ref of blogRefs) {
  if (!blogSlugs.has(ref)) errors.push(`broken blog link: /blog/${ref}`)
}
for (const ref of productRefs) {
  if (!productSlugs.has(ref)) errors.push(`broken product link: /products/${ref}`)
}

// Detect duplicate slugs — they would cause silent shadowing at runtime
const seenBlog = new Set()
const dupBlog = []
for (const m of blogSrc.matchAll(/slug:\s*'([a-z0-9-]+)'/g)) {
  if (seenBlog.has(m[1])) dupBlog.push(m[1])
  else seenBlog.add(m[1])
}
for (const d of dupBlog) errors.push(`duplicate blog slug: ${d}`)

if (errors.length > 0) {
  console.error(`\n❌ check-links: ${errors.length} broken reference(s) found\n`)
  for (const e of errors) console.error('  - ' + e)
  console.error('')
  console.error(`Valid blog slugs (${blogSlugs.size}):`)
  console.error('  ' + [...blogSlugs].sort().join(', '))
  console.error('')
  process.exit(1)
}

console.log(`✅ check-links: all ${blogRefs.size} blog refs and ${productRefs.size} product refs resolve (${blogSlugs.size} blog slugs, ${productSlugs.size} product slugs)`)
