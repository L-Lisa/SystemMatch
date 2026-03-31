/**
 * Retry a function with exponential backoff on transient errors.
 * Attempts: 1 initial + 3 retries at 1s, 2s, 4s.
 *
 * Retries on: 429, rate limit, timeout, connection reset, socket hang up, 529, overloaded.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 2000, 4000]
  let lastError: Error = new Error('Okänt fel')

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      const msg = lastError.message.toLowerCase()
      const isTransient =
        msg.includes('429') ||
        msg.includes('rate limit') ||
        msg.includes('timeout') ||
        msg.includes('etimedout') ||
        msg.includes('econnreset') ||
        msg.includes('socket hang up') ||
        msg.includes('529') ||
        msg.includes('overloaded')

      if (!isTransient || attempt === delays.length) throw lastError

      await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
  }

  throw lastError
}
