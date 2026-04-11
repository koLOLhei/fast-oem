/**
 * Shared input validation helpers.
 * Used across API routes and server actions to validate user-supplied parameters.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns true if the value is a valid UUID v4 format string. */
export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value)
}

/** Maximum safe price per single item (¥1M). Prevents overflow in intermediate calculations. */
export const MAX_UNIT_PRICE_JPY = 1_000_000

/** Maximum safe password length (bytes). Supabase/bcrypt limit. */
export const MAX_PASSWORD_LENGTH = 128

/** Maximum length for addressee parameter in PDF generation. */
export const MAX_ADDRESSEE_LENGTH = 100

/** Maximum number of multi-select (checkbox) option values per option. */
export const MAX_CHECKBOX_VALUES = 50
