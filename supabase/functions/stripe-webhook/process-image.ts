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

        // Extract file path from Supabase storage URL if it's a full URL
        let path = originalPathOrUrl
        if (path.includes('/storage/v1/object/public/designs/')) {
            path = path.split('/storage/v1/object/public/designs/')[1]
        }

        // Download image buffer from Storage
        const { data: fileData, error: downloadError } = await supabase
            .storage
            .from('designs')
            .download(path)

        if (downloadError || !fileData) {
            console.error('Error downloading image', downloadError)
            return null
        }

        const buffer = await fileData.arrayBuffer()

        // Convert to standard PNG using Sharp (Edge Functions support npm modules via Deno)
        const convertedBuffer = await sharp(buffer)
            .png({ quality: 100 })
            .toBuffer()

        // Upload converted file
        const newPath = `processed/${orderId}_${productId}_converted.png`

        const { error: uploadError } = await supabase
            .storage
            .from('designs')
            .upload(newPath, convertedBuffer, {
                contentType: 'image/png',
                upsert: true
            })

        if (uploadError) {
            console.error('Error uploading converted image', uploadError)
            return null
        }

        // Return the public URL
        const { data: publicUrlData } = supabase
            .storage
            .from('designs')
            .getPublicUrl(newPath)

        return publicUrlData.publicUrl

    } catch (err) {
        console.error('Image processing failed:', err)
        return null
    }
}
