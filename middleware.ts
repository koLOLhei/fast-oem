import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// ---------------------------------------------------------------------------
// Module-level constants — parsed once per cold start, not per request
// ---------------------------------------------------------------------------

/** Routes subject to rate limiting. Stripe webhooks are intentionally excluded.
 * `/admin` is included so admin form-action POSTs are throttled (form actions
 * hit the admin page URL, not `/api/admin`).
 * `/api/ai` and `/api/mcp` mint real DB orders + Stripe sessions on every call
 * and are otherwise unauthenticated, so they MUST be throttled (the per-email
 * cap inside startCheckoutSession is bypassable by varying the email).
 * `/api/mypage` issues agent API keys and creates Stripe SetupIntents on every
 * POST — an unbounded authenticated user could otherwise mint keys / inflate
 * the Stripe customer table.
 * `/contact` is included so the public contact form (a server action POSTing to
 * the page URL) can't be used to flood outbound email. */
const RATE_LIMITED_PREFIXES = ['/checkout', '/admin', '/api/admin', '/api/ai', '/api/mcp', '/api/mypage', '/api/receipts', '/api/invoices', '/api/orders', '/contact', '/login', '/signup', '/reset-password'] as const

/**
 * Pre-parsed IP allowlist entries from ADMIN_ALLOWED_IPS env var.
 * null means "allow all" (env var unset or set to "*").
 */
const ALLOWED_IP_ENTRIES: string[] | null = (() => {
    const raw = process.env.ADMIN_ALLOWED_IPS
    if (!raw || raw === '*') return null
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
})()

/**
 * Service-role Supabase client for role lookups in middleware.
 * Cached at module level — stateless, safe to reuse across requests.
 */
const serviceSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ---------------------------------------------------------------------------
// IP Whitelisting for /admin and /factory
// Set ADMIN_ALLOWED_IPS as a comma-separated list in .env.local, e.g.:
//   ADMIN_ALLOWED_IPS=203.0.113.1,203.0.113.2
// Leave unset (or set to "*") to allow all IPs (useful during development).
// ---------------------------------------------------------------------------
/** Basic sanity check: reject strings that clearly aren't IP addresses. */
function isValidIpFormat(ip: string): boolean {
    // IPv4: four octets of 0-255
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return true
    // IPv6: contains at least one colon and only hex digits / colons / brackets
    if (/^[0-9a-fA-F:[\]]+$/.test(ip) && ip.includes(':')) return true
    return false
}

function getClientIp(req: NextRequest): string {
    // On Vercel/Cloudflare the platform prepends the real IP to x-forwarded-for,
    // making the first entry trustworthy. We still validate the format to guard
    // against malformed values reaching isIpAllowed/ipToInt.
    const xfwdRaw = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    if (xfwdRaw && isValidIpFormat(xfwdRaw)) return xfwdRaw

    const realIp = req.headers.get('x-real-ip') ?? ''
    if (realIp && isValidIpFormat(realIp)) return realIp

    return '127.0.0.1'
}

/** Return true if the string looks like an IPv6 address (contains a colon). */
function isIPv6(ip: string): boolean {
    return ip.includes(':')
}

/** Convert an IPv4 address string to a 32-bit integer. */
function ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0
}

/**
 * Check whether `ip` matches an entry in ADMIN_ALLOWED_IPS.
 * Each entry can be an exact IPv4 address (e.g. 203.0.113.1) or
 * a CIDR block (e.g. 203.0.113.0/24).
 * IPv6 addresses are supported via exact match only (CIDR matching is IPv4-only).
 */
function isIpAllowed(ip: string): boolean {
    // PRODUCTION: set ADMIN_ALLOWED_IPS to a comma-separated list of allowed IPs or CIDR blocks.
    // Leaving it unset (or "*") permits all IPs — acceptable in development only.
    if (!ALLOWED_IP_ENTRIES) return true

    const clientIsIPv6 = isIPv6(ip)

    for (const entry of ALLOWED_IP_ENTRIES) {
        if (entry.includes('/')) {
            // CIDR match — only valid for IPv4; skip if the client IP is IPv6
            if (clientIsIPv6) continue
            const [network, prefixStr] = entry.split('/')
            // Also skip if the CIDR network address looks like IPv6
            if (isIPv6(network)) continue
            const prefix = parseInt(prefixStr, 10)
            if (prefix < 0 || prefix > 32) continue
            const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
            const clientInt = ipToInt(ip)
            if ((clientInt & mask) === (ipToInt(network) & mask)) return true
        } else {
            // Exact match — works for both IPv4 and IPv6
            // Normalise IPv6 to lowercase for case-insensitive comparison
            if (entry.toLowerCase() === ip.toLowerCase()) return true
        }
    }
    return false
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiting (production) with in-memory fallback (dev only).
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
// to enable distributed rate limiting across edge instances.
// In production, Upstash is REQUIRED — the in-memory fallback is per-instance
// and effectively multiplies the rate cap by the number of running edges,
// which silently defeats the whole point of the limiter. Crash early instead
// of letting throttling become a no-op under real load.
// ---------------------------------------------------------------------------
const redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
              url: process.env.UPSTASH_REDIS_REST_URL,
              token: process.env.UPSTASH_REDIS_REST_TOKEN,
          })
        : null

if (!redis && process.env.NODE_ENV === 'production') {
    // Throwing at module-eval time is intentional: any request that reaches the
    // middleware would otherwise silently fall through to the per-instance
    // in-memory limiter. Fail-fast at startup is louder and safer.
    throw new Error(
        '[middleware] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN must be set in production. ' +
        'The in-memory rate-limit fallback is per-instance and unsafe across edges.',
    )
}

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
let lastPurgeAt = 0

async function isRateLimited(ip: string): Promise<boolean> {
    // Use Upstash Redis if configured
    if (ratelimit) {
        const { success } = await ratelimit.limit(ip)
        return !success
    }

    // Fallback: in-memory rate limiting
    const now = Date.now()

    // Purge expired entries every 60s to prevent unbounded Map growth.
    // Uses a time-based interval instead of size threshold so entries don't
    // accumulate silently between 0 and the old 5000 threshold.
    if (now - lastPurgeAt > 60_000) {
        lastPurgeAt = now
        for (const [k, v] of rateLimitStore) {
            if (now > v.resetAt) rateLimitStore.delete(k)
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
            console.warn(`[middleware] IP blocked: ${clientIp} attempted ${pathname}`)
            return new NextResponse('Forbidden', { status: 403 })
        }
    }

    // -- Rate limiting for checkout, customer orders, and admin API --
    // /api/webhooks/* is intentionally excluded — Stripe retries must never be
    // blocked, and the endpoint self-protects via signature verification.
    const isRateLimitedRoute = RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p))

    // API routes are throttled on every method. For page routes, only throttle
    // MUTATING requests (form/server-action POSTs) — plain GET/HEAD browsing of
    // /contact, /login, /checkout, etc. must not consume the shared per-IP budget,
    // or normal navigation could trip the limiter.
    const method = request.method
    const isApiRoute = pathname.startsWith('/api/')
    const shouldRateLimit = isRateLimitedRoute && (isApiRoute || (method !== 'GET' && method !== 'HEAD'))

    if (shouldRateLimit && await isRateLimited(clientIp)) {
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

    // Build a redirect that preserves any session cookies refreshed by
    // supabase.auth.getUser() below. NextResponse.redirect() creates a fresh
    // response, so if we don't manually copy cookies the refreshed JWT never
    // reaches the client and the next request loops on the expired token.
    const redirectWithCookies = (url: URL): NextResponse => {
        const r = NextResponse.redirect(url)
        for (const cookie of response.cookies.getAll()) {
            r.cookies.set(cookie)
        }
        return r
    }

    const { data: { user } } = await supabase.auth.getUser()

    const isAdminRoute = pathname.startsWith('/admin')
    const isFactoryRoute = pathname.startsWith('/factory')
    const isMypageRoute = pathname.startsWith('/mypage')

    if (!user && (isAdminRoute || isFactoryRoute || isMypageRoute)) {
        return redirectWithCookies(new URL('/login', request.url))
    }

    if (user && (isAdminRoute || isFactoryRoute)) {
        // Use module-level service-role client to bypass RLS — cached across requests.
        const { data: profile } = await serviceSupabase
            .from('profiles')
            .select('role, is_active')
            .eq('id', user.id)
            .single()

        // No profile row — redirect to login (not silently to /)
        if (!profile) {
            return redirectWithCookies(new URL('/login?message=' + encodeURIComponent('アカウント情報が見つかりません。管理者にお問い合わせください'), request.url))
        }

        const typedProfile = profile as { role: string; is_active: boolean }
        const role = typedProfile.role as string
        const isActive = typedProfile.is_active !== false

        // Block deactivated accounts
        if (!isActive) {
            return redirectWithCookies(new URL('/login?error=account_disabled', request.url))
        }

        // Wrong role for /admin — allow admin and super_admin; redirect others
        if (isAdminRoute && role !== 'admin' && role !== 'super_admin') {
            if (role === 'factory') {
                return redirectWithCookies(new URL('/factory', request.url))
            }
            return redirectWithCookies(new URL('/login', request.url))
        }

        // Wrong role for /factory — send admin/super_admin/customer to their own portal
        if (isFactoryRoute && role !== 'factory') {
            if (role === 'admin' || role === 'super_admin') {
                return redirectWithCookies(new URL('/admin', request.url))
            }
            return redirectWithCookies(new URL('/login', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
