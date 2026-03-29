import { Kandidat, Jobb } from '@/lib/types'

export interface MatchScore {
  score: number
  reasons: string[]
}

/**
 * Max candidates to send to Layer 3 (Claude) per job.
 * Sorted by L2 score descending — highest-scoring candidates first.
 * This controls cost while letting Claude handle semantic matching.
 */
export const L3_MAX_CANDIDATES = 40

/**
 * Broad industry categories used to detect semantic proximity between a candidate
 * and a job, even when they share no exact keywords.
 *
 * Example: "fullstack" candidate → IT_TECH. "IT/supporttekniker" job → IT_TECH.
 * No shared tokens, but same category → passes to Layer 3 for Claude to decide.
 */
const INDUSTRY_CATEGORIES: Record<string, string[]> = {
  IT_TECH: [
    'support', 'tekniker', 'teknik', 'utvecklare', 'programm', 'system', 'data',
    'webb', 'fullstack', 'frontend', 'backend', 'office', 'windows', 'linux',
    'server', 'nätverk', 'dator', 'mjukvara', 'hårdvara', 'helpdesk', 'servicedisk',
  ],
  RESTAURANT: [
    'restaurang', 'kök', 'servering', 'kock', 'café', 'mat', 'catering',
    'biträde', 'hovmästare', 'bageri', 'konditori',
  ],
  STÄD: ['städ', 'rengöring', 'lokalvård', 'fönsterputs', 'städare', 'städning'],
  SALES: [
    'sälj', 'försälj', 'butik', 'handel', 'säljare', 'account', 'kundtjänst',
  ],
  ADMIN: [
    'admin', 'kontor', 'ekonomi', 'koordinat', 'assistent', 'reception',
    'sekreterare', 'kontorsassistent',
  ],
  LAGER: ['lager', 'truck', 'truckkort', 'logistik', 'gods', 'förråd', 'terminal'],
  BYGG: ['bygg', 'konstruktion', 'snickare', 'elektriker', 'rörmokare', 'mark'],
  VÅRD: ['vård', 'omsorg', 'sjuksköterska', 'undersköterska', 'hemtjänst', 'boende'],
}

/** Common 2-char keywords that should not be filtered out by min-length. */
const SHORT_TOKEN_WHITELIST = new Set(['it', 'hr', 'cv', 'vd', 'ab'])

/**
 * Tokenize a string: lowercase, split on whitespace/punctuation,
 * keep tokens ≥ 3 chars OR whitelisted short tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,./\-+&|()[\]]+/)
    .filter((t) => t.length >= 3 || SHORT_TOKEN_WHITELIST.has(t))
}

/**
 * Two tokens "match" if they are equal OR one contains the other as a substring
 * (minimum 4 chars to prevent noise). This handles Swedish compound words:
 * "restaurang" ⊂ "restaurangbiträde", "städ" ⊂ "hemstädare".
 */
function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length >= 4 && b.includes(a)) return true
  if (b.length >= 4 && a.includes(b)) return true
  return false
}

/**
 * Find which industry categories a text belongs to.
 */
function getCategories(tokens: string[]): Set<string> {
  const result = new Set<string>()
  for (const [cat, keywords] of Object.entries(INDUSTRY_CATEGORIES)) {
    for (const token of tokens) {
      for (const kw of keywords) {
        if (tokensMatch(token, kw)) {
          result.add(cat)
          break
        }
      }
      if (result.has(cat)) break
    }
  }
  return result
}

/**
 * Build the full token list for a candidate, including flag-based signals.
 */
function kandidatTokens(kandidat: Kandidat): string[] {
  const text = [kandidat.bransch, kandidat.merBransch, ...kandidat.keywords].join(' ')
  const tokens = tokenize(text)
  if (kandidat.stadsFlag) tokens.push('städ')
  if (kandidat.restaurangFlag) tokens.push('restaurang')
  // Note: korkort is scored explicitly below — do NOT add it as a token to avoid double-counting
  return tokens
}

/**
 * Layer 2 — deterministic scoring, no API call.
 *
 * Scoring breakdown (max 100):
 *   Token overlap (exact or compound-word substring):
 *     Each shared token pair = 10 pts, capped at 50
 *   Industry category overlap:
 *     Each shared category = 15 pts, capped at 30
 *   Nystartsjobb flag    +10 pts
 *   Introduktionsjobb    +10 pts
 *   Körkort match        +15 pts  (job wants it, candidate has it)
 *   Expired slutdatum    -30 pts
 */
export function scoreKandidat(kandidat: Kandidat, jobb: Jobb): MatchScore {
  const reasons: string[] = []
  let score = 0

  const kTokens = kandidatTokens(kandidat)
  const jTokens = tokenize(
    [jobb.tjänst, jobb.krav, jobb.meriter, jobb.plats].join(' ')
  )

  // Token overlap (with compound-word substring matching)
  const matchedTokens: string[] = []
  const usedJTokens = new Set<number>()
  for (const kt of kTokens) {
    for (let ji = 0; ji < jTokens.length; ji++) {
      if (!usedJTokens.has(ji) && tokensMatch(kt, jTokens[ji])) {
        matchedTokens.push(kt)
        usedJTokens.add(ji)
        break
      }
    }
    if (matchedTokens.length * 10 >= 50) break // cap reached
  }

  const overlapScore = Math.min(matchedTokens.length * 10, 50)
  if (overlapScore > 0) {
    score += overlapScore
    reasons.push(`Nyckelordsmatch: ${matchedTokens.slice(0, 5).join(', ')} (+${overlapScore})`)
  }

  // Industry category overlap
  const kCategories = getCategories(kTokens)
  const jCategories = getCategories(jTokens)
  const sharedCats = [...kCategories].filter((c) => jCategories.has(c))

  const catScore = Math.min(sharedCats.length * 15, 30)
  if (catScore > 0) {
    score += catScore
    reasons.push(`Branschkategori: ${sharedCats.join(', ')} (+${catScore})`)
  }

  // Nystartsjobb
  if (kandidat.nystartsjobb) {
    score += 10
    reasons.push('Nystartsjobb (+10)')
  }

  // Introduktionsjobb
  if (kandidat.introduktionsjobb) {
    score += 10
    reasons.push('Introduktionsjobb (+10)')
  }

  // Körkort match
  const jobWantsKorkort = /\bb[\s-]?körkort\b|körkort\b/i.test(jobb.krav + ' ' + jobb.meriter)
  if (jobWantsKorkort && kandidat.korkort) {
    score += 15
    reasons.push('Körkort: krav uppfyllt (+15)')
  }

  // Expired slutdatum
  if (kandidat.slutdatum) {
    const end = new Date(kandidat.slutdatum)
    if (!isNaN(end.getTime()) && end < new Date()) {
      score -= 30
      reasons.push('Slutdatum passerat (-30)')
    }
  }

  return { score, reasons }
}
