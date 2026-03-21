import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// ---------------------------------------------------------------------------
// IP Whitelisting for /admin and /factory
// Set ADMIN_ALLOWED_IPS as a comma-separated list in .env.local, e.g.:
//   ADMIN_ALLOWED_IPS=203.0.113.1,203.0.113.2
// Leave unset (or set to "*") to allow all IPs (useful during development).
// ---------------------------------------------------------------------------
function getClientIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        '127.0.0.1'
    )
}

function isIpAllowed(ip: string): boolean {
    const raw = process.env.ADMIN_ALLOWED_IPS
    // PRODUCTION: set ADMIN_ALLOWED_IPS to a comma-separated list of allowed IPs.
    // Leaving it unset (or "*") permits all IPs — acceptable in development only.
    if (!raw || raw === '*') return true
    const allowed = raw.split(',').map((s) => s.trim())
    return allowed.includes(ip)
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiting (production) with in-memory fallback
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
// to enable distributed rate limiting across edge instances.
// ---------------------------------------------------------------------------
const redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
              url: process.env.UPSTASH_REDIS_REST_URL,
              token: process.env.UPSTASH_REDIS_REST_TOKEN,
          })
        : null

const ratelimit = redis
    ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(20, '60 s'),
          analytics: false,
      })
    : null

// ---------------------------------------------------------------------------
// In-memory rate limiting fallback (used when Redis is not configured)
// Limit: MAX_REQUESTS per WINDOW_MS per IP.
// Note: resets on cold start. For production, back with Redis/Upstash.
// ---------------------------------------------------------------------------
const WINDOW_MS = 60_000      // 1 minute
const MAX_REQUESTS = 20       // per window per IP

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

async function isRateLimited(ip: string): Promise<boolean> {
    // Use Upstash Redis if configured
    if (ratelimit) {
        const { success } = await ratelimit.limit(ip)
        return !success
    }

    // Fallback: in-memory rate limiting
    const now = Date.now()

    // Purge expired entries to prevent unbounded Map growth (memory leak guard)
    // Only scan when the store has grown to avoid unnecessary iteration on every request
    if (rateLimitStore.size > 5000) {
        for (const [k, v] of rateLimitStore) {
            if (now > v.resetAt + WINDOW_MS) rateLimitStore.delete(k)
        }
    }

    const entry = rateLimitStore.get(ip)

    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS })
        return false
    }

    entry.count += 1
    if (entry.count > MAX_REQUESTS) return true
    return false
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const clientIp = getClientIp(request)

    // -- IP whitelisting for admin pages, factory pages, and admin API routes --
    if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/factory') ||
        pathname.startsWith('/api/admin')
    ) {
        if (!isIpAllowed(clientIp)) {
            return new NextResponse('Forbidden', { status: 403 })
        }
    }

    // -- Rate limiting for checkout, customer orders, and admin API --
    // IMPORTANT: Add new rate-limited path prefixes to this array only.
    // /api/webhooks/* is intentionally excluded — Stripe retries must never be
    // blocked, and the endpoint self-protects via signature verification.
    const RATE_LIMITED_PREFIXES = ['/checkout', '/api/admin', '/orders'] as const
    const isRateLimitedRoute = RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p))

    if (isRateLimitedRoute && await isRateLimited(clientIp)) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: { 'Retry-After': '60' },
        })
    }

    // -- Auth guard for admin and factory --
    let response = NextResponse.next({ request: { headers: request.headers } })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    const isAdminRoute = pathname.startsWith('/admin')
    const isFactoryRoute = pathname.startsWith('/factory')

    if (!user && (isAdminRoute || isFactoryRoute)) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && (isAdminRoute || isFactoryRoute)) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_active')
            .eq('id', user.id)
            .single()

        const role = profile?.role
        const isActive = (profile as any)?.is_active !== false // default true if column missing

        // Block deactivated accounts
        if (!isActive) {
            return NextResponse.redirect(new URL('/login?error=account_disabled', request.url))
        }

        if (isAdminRoute && role !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url))
        }

        if (isFactoryRoute && role !== 'factory') {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
