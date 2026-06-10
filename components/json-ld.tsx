import { serializeJsonLd, type JsonLdNode } from '@/lib/structured-data'

/**
 * Render schema.org structured data as a JSON-LD <script> tag.
 *
 * Accepts a single node or an array of nodes. Arrays are wrapped in a single
 * `@graph` object so the emitted JSON always has a top-level `@context` (see
 * lib/structured-data.ts for why). Values are `<`-escaped to be XSS-safe.
 */
export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
