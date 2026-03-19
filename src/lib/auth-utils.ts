/**
 * Auth utilities for phone+password via fake email pattern.
 *
 * Supabase Phone auth requires Twilio. For dev/staging we use email auth
 * with a deterministic fake email derived from phone number.
 *
 * Pattern: {11 digits}@phone.turan.kz
 * Example: +7 777 773 19 13 → 77777731913@phone.turan.kz
 *
 * This is the SINGLE source of truth for the conversion.
 * Used by: Registration (signUp), Login (signIn), any future auth code.
 *
 * TODO: Replace with real Twilio phone auth on production (D-F01-2).
 */
export function phoneToFakeEmail(phoneInput: string): string {
  const digits = phoneInput.replace(/\D/g, '')

  // Normalize to 11 digits starting with 7
  let normalized: string
  if (digits.length === 10) {
    // 10 digits without country code (from PhoneInput component)
    normalized = '7' + digits
  } else if (digits.length === 11 && digits.startsWith('7')) {
    // 11 digits with country code (from Login form)
    normalized = digits
  } else if (digits.length === 11 && digits.startsWith('8')) {
    // 8-xxx format → convert to 7-xxx
    normalized = '7' + digits.slice(1)
  } else {
    // Fallback: take last 10 digits, prepend 7
    normalized = '7' + digits.slice(-10)
  }

  return `${normalized}@phone.turan.kz`
}
