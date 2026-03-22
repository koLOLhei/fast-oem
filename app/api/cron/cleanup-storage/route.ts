import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // 認証チェック
  const authHeader = request.headers.get('authorization') ?? ''
  const secret = process.env.CLEANUP_SECRET ?? ''

  try {
    const a = Buffer.from(authHeader)
    const b = Buffer.from(`Bearer ${secret}`)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // 30日以上前の未使用デザインファイルを削除
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: files, error: listError } = await supabase
      .storage
      .from('designs')
      .list('', { limit: 100 })

    if (listError) {
      console.error('Storage list error:', listError)
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
    }

    const oldFiles = (files ?? []).filter(file => {
      const createdAt = new Date(file.created_at ?? '')
      return createdAt < thirtyDaysAgo
    })

    if (oldFiles.length > 0) {
      const filePaths = oldFiles.map(f => f.name)
      const { error: deleteError } = await supabase
        .storage
        .from('designs')
        .remove(filePaths)

      if (deleteError) {
        console.error('Storage delete error:', deleteError)
        return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      deleted: oldFiles.length,
      message: `${oldFiles.length}件のファイルを削除しました`
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
