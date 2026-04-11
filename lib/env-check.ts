/**
 * Startup environment variable validation.
 *
 * Import this module at application boot (e.g. instrumentation.ts or layout.tsx)
 * to surface missing env vars immediately instead of at runtime.
 *
 * Variables are split into REQUIRED (crash on missing) and OPTIONAL (warn only).
 */

const REQUIRED_SERVER_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
] as const

const OPTIONAL_SERVER_VARS = [
  'NEXT_PUBLIC_SITE_URL',
  'CLEANUP_SECRET',
  'SLACK_WEBHOOK_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'ADMIN_ALLOWED_IPS',
  'COMPANY_NAME',
  'COMPANY_ADDRESS',
  'INVOICE_QUALIFIED_NUMBER',
  'FROM_EMAIL',
  'CONTACT_EMAIL',
  'FACTORY_DEFAULT_EMAIL',
  'SENTRY_AUTH_TOKEN',
] as const

export function validateEnv(): void {
  const missing: string[] = []
  const warned: string[] = []

  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]?.trim()) {
      missing.push(key)
    }
  }

  for (const key of OPTIONAL_SERVER_VARS) {
    if (!process.env[key]?.trim()) {
      warned.push(key)
    }
  }

  if (warned.length > 0) {
    console.warn(`[env-check] Optional env vars not set: ${warned.join(', ')}`)
  }

  if (missing.length > 0) {
    const msg = `[env-check] FATAL: Required env vars missing: ${missing.join(', ')}`
    console.error(msg)
    // In production, fail fast. In development, warn only.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    }
  }
}
