import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import sharp from 'npm:sharp'

export async function processImage(
    supabase: SupabaseClient,
    originalPathOrUrl: string,
    orderId: string,
    productId: string
): Promise<string | null> {
    try {
        console.log(`Processing image for order ${orderId}, product ${productId}`)

        let imageBuffer: ArrayBuffer

        if (originalPathOrUrl.startsWith('data:')) {
            // ── data:URI (base64-encoded image from cart) ──────────────────────────
            // Format: "data:<mime>;base64,<data>"
            const commaIndex = originalPathOrUrl.indexOf(',')
            if (commaIndex === -1) {
                console.error('Invalid data URI: missing comma separator')
                return null
            }
            const base64Data = originalPathOrUrl.slice(commaIndex + 1)
            try {
                // Uint8Array.from is more memory-efficient than the atob+for-loop
                // pattern: it avoids holding a decoded binaryString in RAM alongside
                // the typed array, reducing peak allocation for large design files.
                const binaryString = atob(base64Data)
                const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0))
                imageBuffer = bytes.buffer
            } catch (decodeErr: unknown) {
                console.error('Failed to decode data URI base64:', decodeErr instanceof Error ? decodeErr.message : String(decodeErr))
                return null
            }
        } else {
            // ── Supabase Storage path or full URL ──────────────────────────────────
            let path = originalPathOrUrl
            if (path.includes('/storage/v1/object/public/designs/')) {
                path = path.split('/storage/v1/object/public/designs/')[1]
            }

            const { data: fileData, error: downloadError } = await supabase
                .storage
                .from('designs')
                .download(path)

            if (downloadError || !fileData) {
                console.error('Error downloading image from storage:', downloadError?.message ?? String(downloadError))
                return null
            }
            imageBuffer = await fileData.arrayBuffer()
        }

        // Convert to standard PNG using Sharp.
        // withMetadata(false) explicitly strips EXIF/GPS/ICC metadata so that
        // no customer PII (e.g. GPS location from phone photos) reaches the factory.
        // compressionLevel:9 applies maximum lossless compression (PNG quality is always lossless;
        // the `quality` param has no effect on PNG — compressionLevel controls file size).
        const convertedBuffer = await sharp(imageBuffer)
            .withMetadata({})
            .png({ compressionLevel: 9 })
            .toBuffer()

        // Upload converted file to Storage.
        // Use crypto.randomUUID() instead of Date.now() to guarantee uniqueness
        // even when multiple items of the same product are processed concurrently.
        const uniqueId = crypto.randomUUID()
        const newPath = `processed/${orderId}_${productId}_${uniqueId}_converted.png`

        const { error: uploadError } = await supabase
            .storage
            .from('designs')
            .upload(newPath, convertedBuffer, {
                contentType: 'image/png',
                upsert: false,
            })

        if (uploadError) {
            console.error('Error uploading converted image:', uploadError?.message ?? String(uploadError))
            return null
        }

        // Return only the storage path (not a public URL).
        // The Next.js app generates short-lived signed URLs from this path at
        // render time, keeping the designs bucket private.
        return newPath

    } catch (err) {
        console.error('Image processing failed:', (err as Error).message)
        return null
    }
}
