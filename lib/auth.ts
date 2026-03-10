export const COOKIE_NAME = 'sm_session'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// Web Crypto API — works in both Edge Runtime (middleware) and Node.js
async function hmacHex(password: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function makeSessionToken(password: string): Promise<string> {
  return hmacHex(password, 'systemmatch-session')
}

export async function isValidToken(token: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD
  if (!password) return false
  const expected = await makeSessionToken(password)
  if (token.length !== expected.length) return false
  // Constant-time comparison to prevent timing attacks
  let diff = 0
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
