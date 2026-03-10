import { createHmac } from 'crypto'

export const COOKIE_NAME = 'sm_session'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// Deterministic token derived from the password — no session store needed
export function makeSessionToken(password: string): string {
  return createHmac('sha256', password).update('systemmatch-session').digest('hex')
}

export function isValidToken(token: string): boolean {
  const password = process.env.ADMIN_PASSWORD
  if (!password) return false
  const expected = makeSessionToken(password)
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
