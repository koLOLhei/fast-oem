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

/**
 * Detect if a die-cut image has interior holes (hollow shape).
 * Uses flood-fill from the border to find "outside" transparent pixels,
 * then checks for remaining interior transparent pixels surrounded by opaque area.
 * Returns true ONLY for extreme cases where die-cutting is truly impossible
 * (e.g. a thin outlined ring shape with most of the interior transparent).
 *
 * Normal character designs with small enclosed transparent regions
 * (gaps between an arm and body, the hole in "O", etc.) are allowed.
 */
export async function detectHollow(imageUrl: string): Promise<boolean> {
  const img = await loadImage(imageUrl)
  const size = 200
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0, size, size)
  const { data, width, height } = ctx.getImageData(0, 0, size, size)

  const total = width * height
  // true = transparent (alpha <= 128)
  const transparent = new Uint8Array(total)
  let transparentCount = 0
  for (let i = 0; i < total; i++) {
    if (data[i * 4 + 3] <= 128) {
      transparent[i] = 1
      transparentCount++
    }
  }

  // If image has no transparency at all, it's not hollow
  if (transparentCount === 0) return false

  // Flood-fill from all border transparent pixels to mark "outside"
  const visited = new Uint8Array(total)
  const queue: number[] = []

  // Seed from all 4 borders
  for (let x = 0; x < width; x++) {
    const top = x
    const bottom = (height - 1) * width + x
    if (transparent[top] && !visited[top]) { visited[top] = 1; queue.push(top) }
    if (transparent[bottom] && !visited[bottom]) { visited[bottom] = 1; queue.push(bottom) }
  }
  for (let y = 0; y < height; y++) {
    const left = y * width
    const right = y * width + (width - 1)
    if (transparent[left] && !visited[left]) { visited[left] = 1; queue.push(left) }
    if (transparent[right] && !visited[right]) { visited[right] = 1; queue.push(right) }
  }

  // BFS flood-fill
  while (queue.length > 0) {
    const idx = queue.pop()!
    const x = idx % width
    const y = (idx - x) / width
    const neighbors = [
      y > 0 ? idx - width : -1,
      y < height - 1 ? idx + width : -1,
      x > 0 ? idx - 1 : -1,
      x < width - 1 ? idx + 1 : -1,
    ]
    for (const n of neighbors) {
      if (n >= 0 && transparent[n] && !visited[n]) {
        visited[n] = 1
        queue.push(n)
      }
    }
  }

  // Count interior holes: transparent pixels NOT reached by flood-fill
  let interiorHoles = 0
  let opaqueCount = 0
  for (let i = 0; i < total; i++) {
    if (transparent[i] && !visited[i]) interiorHoles++
    if (!transparent[i]) opaqueCount++
  }

  // A design is rejected as "hollow / not die-cuttable" when either of:
  //   (a) a SINGLE interior hole is large relative to the design area, or
  //   (b) the total enclosed holes dominate the opaque area (ring/frame case)
  //
  // Previously used a combined 40%+10% threshold that let donut/ring/O-letter
  // style designs through. This version adds largest-hole detection, which is
  // what actually matters for die-cutting (a single big hole = the shape must
  // be cut as two separate pieces).
  if (opaqueCount === 0) return false

  // Compute the largest contiguous interior hole via BFS over the *interior*
  // transparent cells (those not visited during the border flood-fill).
  let maxHole = 0
  const holeSeen = new Uint8Array(total)
  const holeQ: number[] = []
  for (let i = 0; i < total; i++) {
    if (!transparent[i] || visited[i] || holeSeen[i]) continue
    // BFS one connected component
    holeQ.length = 0
    holeQ.push(i)
    holeSeen[i] = 1
    let size = 0
    while (holeQ.length > 0) {
      const idx = holeQ.pop()!
      size++
      const x = idx % width
      const y = (idx - x) / width
      if (y > 0) {
        const n = idx - width
        if (transparent[n] && !visited[n] && !holeSeen[n]) { holeSeen[n] = 1; holeQ.push(n) }
      }
      if (y < height - 1) {
        const n = idx + width
        if (transparent[n] && !visited[n] && !holeSeen[n]) { holeSeen[n] = 1; holeQ.push(n) }
      }
      if (x > 0) {
        const n = idx - 1
        if (transparent[n] && !visited[n] && !holeSeen[n]) { holeSeen[n] = 1; holeQ.push(n) }
      }
      if (x < width - 1) {
        const n = idx + 1
        if (transparent[n] && !visited[n] && !holeSeen[n]) { holeSeen[n] = 1; holeQ.push(n) }
      }
    }
    if (size > maxHole) maxHole = size
  }

  const holeToOpaqueRatio = interiorHoles / opaqueCount
  const holeToTotalRatio = interiorHoles / total
  const biggestHoleRatio = maxHole / opaqueCount

  // Reject when:
  //  - a single hole >= 15% of the opaque area (e.g. donut, "O", ring) OR
  //  - holes overall dominate both metrics (frame-only designs)
  if (biggestHoleRatio >= 0.15) return true
  if (holeToOpaqueRatio > 0.3 && holeToTotalRatio > 0.05) return true
  return false
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
