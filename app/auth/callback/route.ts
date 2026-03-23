import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Validate next parameter to prevent open redirect attacks.
    // Only allow relative paths starting with "/" that don't escape to external domains.
    const rawNext = searchParams.get('next') ?? '/'
    const next = (rawNext.startsWith('/') && !rawNext.startsWith('//')) ? rawNext : '/'

    if (code) {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Exchange failed or no code — redirect to login with error
    return NextResponse.redirect(
        `${origin}/login?message=${encodeURIComponent('リンクの有効期限が切れているか、無効なリンクです。再度お試しください')}`
    )
}
