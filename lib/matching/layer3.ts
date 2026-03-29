import Anthropic from '@anthropic-ai/sdk'
import { Kandidat, Jobb, MatchResult } from '@/lib/types'

/** Truncate CV text at a paragraph boundary, with a visible marker. */
function truncateCV(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  const cut = text.lastIndexOf('\n', maxLen)
  return (cut > maxLen * 0.5 ? text.slice(0, cut) : text.slice(0, maxLen)) +
    '\n[...CV avkortat...]'
}

/**
 * Retry a function with exponential backoff on rate-limit (429) errors.
 * Attempts: 1 initial + 3 retries at 1s, 2s, 4s.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
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

/**
 * Layer 3 — Claude semantic match.
 * Called only when Layer 1 = true AND Layer 2 ≥ threshold.
 *
 * Returns null if the response cannot be parsed (instead of crashing the entire run).
 */
export async function semanticMatch(
  kandidat: Kandidat,
  jobb: Jobb,
  cvText: string,
  client: Anthropic,
  prompt: string
): Promise<MatchResult | null> {

  const candidateBlock = `=== KANDIDAT: ${kandidat.namn} (ID: ${kandidat.id}) ===
Bransch/Kompetenser: ${kandidat.bransch}
${kandidat.merBransch ? `Mer info: ${kandidat.merBransch}` : ''}
Flaggor: ${[
    kandidat.korkort && 'Körkort: JA',
    kandidat.nystartsjobb && 'Nystartsjobb: JA',
    kandidat.introduktionsjobb && 'Introduktionsjobb: JA',
    kandidat.loneansprak && `Löneanspråk: ${kandidat.loneansprak}`,
    kandidat.slutdatum && `Slutdatum: ${kandidat.slutdatum}`,
  ]
    .filter(Boolean)
    .join(' | ')}
${cvText ? `CV:\n${truncateCV(cvText, 3000)}` : '[INGET CV]'}`

  const userMessage = `Tjänst: ${jobb.tjänst}
Arbetsgivare: ${jobb.arbetsgivare}
Plats: ${jobb.plats}
Krav: ${jobb.krav || '–'}
Meriter: ${jobb.meriter || '–'}

${candidateBlock}`

  const response = await withRetry(() =>
    client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: prompt,
      messages: [{ role: 'user', content: userMessage }],
    })
  )

  const first = response.content[0]
  const text = first?.type === 'text' ? first.text : ''

  try {
    const clean = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Inget JSON')
    const parsed = JSON.parse(jsonMatch[0])

    // Accept either the full matchningar array (legacy) or a single result
    const entry = Array.isArray(parsed.matchningar) ? parsed.matchningar[0] : parsed

    return {
      kandidatId: kandidat.id,
      score: Number(entry.score) || 0,
      motivering: String(entry.motivering || ''),
      vinkel: String(entry.vinkel || ''),
    }
  } catch {
    console.error(`Layer 3 parse error for ${kandidat.namn}:`, text.slice(0, 200))
    return null
  }
}
