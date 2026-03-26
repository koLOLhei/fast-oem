/**
 * Analyze the complexity of an uploaded design image.
 * Uses canvas edge detection to estimate shape complexity (A-E).
 *
 * A = Simple (circle, square)
 * B = Moderate (rounded rect, oval)
 * C = Medium (simple custom shape)
 * D = Complex (detailed custom shape)
 * E = Very complex (intricate outlines)
 */

export type ComplexityGrade = 'A' | 'B' | 'C' | 'D' | 'E'

/**
 * Analyze an image and return a complexity grade.
 * Runs entirely client-side using Canvas API.
 */
export async function analyzeComplexity(imageUrl: string): Promise<ComplexityGrade> {
  const img = await loadImage(imageUrl)
  const size = 200 // downsample for performance
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Draw image scaled to analysis size
  ctx.drawImage(img, 0, 0, size, size)
  const imageData = ctx.getImageData(0, 0, size, size)
  const { data, width, height } = imageData

  // Convert to grayscale
  const gray = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
  }

  // Sobel edge detection
  let edgeCount = 0
  const threshold = 30
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      // Horizontal gradient
      const gx =
        -gray[idx - width - 1] + gray[idx - width + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx + width - 1] + gray[idx + width + 1]
      // Vertical gradient
      const gy =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1]

      const magnitude = Math.sqrt(gx * gx + gy * gy)
      if (magnitude > threshold) edgeCount++
    }
  }

  // Calculate edge density (ratio of edge pixels to total)
  const totalPixels = (width - 2) * (height - 2)
  const edgeDensity = edgeCount / totalPixels

  // Also check alpha channel for transparency complexity (die-cut shapes)
  let alphaTransitions = 0
  for (let y = 0; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const a1 = data[(y * width + x - 1) * 4 + 3]
      const a2 = data[(y * width + x) * 4 + 3]
      const opaque1 = a1 > 128
      const opaque2 = a2 > 128
      if (opaque1 !== opaque2) alphaTransitions++
    }
  }
  const alphaComplexity = alphaTransitions / (width * height)

  // Combined score
  const score = edgeDensity * 0.6 + alphaComplexity * 0.4

  if (score < 0.02) return 'A'
  if (score < 0.05) return 'B'
  if (score < 0.10) return 'C'
  if (score < 0.18) return 'D'
  return 'E'
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image for complexity analysis'))
    img.src = src
  })
}
