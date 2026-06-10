/**
 * Helpers for emitting schema.org JSON-LD safely.
 *
 * Two problems these solve:
 *
 * 1. Top-level arrays. Emitting `JSON.stringify([nodeA, nodeB])` produces a
 *    JSON-LD array, which has no `@context` property. Structured-data
 *    consumers (browser extensions, crawlers, Safari's scanner) commonly do
 *    `JSON.parse(script.textContent)["@context"].toLowerCase()` and crash with
 *    `undefined is not an object (evaluating '...["@context"].toLowerCase')`.
 *    Wrapping multiple nodes in a single `@graph` object guarantees the
 *    top-level always exposes `@context`. This is also Google's recommended
 *    way to express multiple entities on one page.
 *
 * 2. `</script>` breakout. JSON.stringify does not escape `<`, so a value
 *    containing `</script>` (e.g. a user-supplied product name) would close the
 *    tag early and allow script injection when used with
 *    dangerouslySetInnerHTML. Escaping `<` as `<` neutralizes this.
 */

export type JsonLdNode = Record<string, unknown>

/**
 * Normalize one or more schema.org nodes into a single top-level object.
 * A single node is returned as-is (it already carries its own `@context`).
 * Multiple nodes are combined under one `@context` + `@graph`.
 */
export function buildJsonLd(input: JsonLdNode | JsonLdNode[]): JsonLdNode {
  const nodes = (Array.isArray(input) ? input : [input]).filter(Boolean)
  if (nodes.length === 1) return nodes[0]
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map(({ ['@context']: _context, ...rest }) => rest),
  }
}

/**
 * Serialize JSON-LD for embedding inside a <script type="application/ld+json">
 * tag. Normalizes via buildJsonLd and escapes `<` to prevent `</script>`
 * breakout.
 */
export function serializeJsonLd(input: JsonLdNode | JsonLdNode[]): string {
  return JSON.stringify(buildJsonLd(input)).replace(/</g, '\\u003c')
}
