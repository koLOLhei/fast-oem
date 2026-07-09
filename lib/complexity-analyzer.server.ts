/**
 * Server-side complexity analyzer — mirrors lib/complexity-analyzer.ts (client)
 * so mold-fee pricing can be validated on the server without trusting the
 * browser's self-reported grade.
 *
 * Uses `sharp` to decode + resize, then runs the same 200×200 Sobel + alpha
 * transition scoring as the client. Thresholds are identical.
 */
import 'server-only'
import sharp from 'sharp'
import type { ComplexityGradeLetter } from './products'

const SIZE = 200
const EDGE_THRESHOLD = 30

/**
 * Score → grade thresholds are identical to the client analyzer at
 * lib/complexity-analyzer.ts so client and server agree.
 */
function scoreToGrade(score: number): ComplexityGradeLetter {
  if (score < 0.02) return 'A'
  if (score < 0.05) return 'B'
  if (score < 0.10) return 'C'
  if (score < 0.18) return 'D'
  return 'E'
}

/**
 * Fetch an image URL, decode + resize with sharp, and return a complexity grade.
 * Returns null on any error — callers should treat null as "unable to verify"
 * and fall back to a safe multiplier of 1.0 (see app/actions/stripe.ts).
 */
export async function analyzeComplexityServer(imageUrl: string): Promise<ComplexityGradeLetter | null> {
  try {
    const res = await fetch(imageUrl, {
      // Cap wait so a slow storage bucket can't hang the checkout action.
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())

    // Downsample to SIZE×SIZE RGBA for uniform analysis.
    const { data, info } = await sharp(buf)
      .resize(SIZE, SIZE, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { width, height, channels } = info
    if (channels !== 4) return null

    // Grayscale conversion (Rec.601 luma weights, matches client).
    const gray = new Float32Array(width * height)
    for (let i = 0; i < width * height; i++) {
      const r = data[i * channels]
      const g = data[i * channels + 1]
      const b = data[i * channels + 2]
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
    }

    // Sobel edge count.
    let edgeCount = 0
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const gx =
          -gray[idx - width - 1] + gray[idx - width + 1] +
          -2 * gray[idx - 1] + 2 * gray[idx + 1] +
          -gray[idx + width - 1] + gray[idx + width + 1]
        const gy =
          -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
          gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1]
        const mag = Math.sqrt(gx * gx + gy * gy)
        if (mag > EDGE_THRESHOLD) edgeCount++
      }
    }
    const edgeDensity = edgeCount / ((width - 2) * (height - 2))

    // Alpha channel transitions (die-cut complexity signal).
    let alphaTransitions = 0
    for (let y = 0; y < height; y++) {
      for (let x = 1; x < width; x++) {
        const a1 = data[(y * width + x - 1) * channels + 3]
        const a2 = data[(y * width + x) * channels + 3]
        if ((a1 > 128) !== (a2 > 128)) alphaTransitions++
      }
    }
    const alphaComplexity = alphaTransitions / (width * height)

    const score = edgeDensity * 0.6 + alphaComplexity * 0.4
    return scoreToGrade(score)
  } catch (err) {
    console.warn('[analyzeComplexityServer] failed:', (err as Error).message)
    return null
  }
}
