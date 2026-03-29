import Anthropic from '@anthropic-ai/sdk'
import { Kandidat, Jobb, MatchResult } from '@/lib/types'
import { passesKeywordFilter } from './layer1'
import { scoreKandidat, L3_MAX_CANDIDATES } from './layer2'
import { semanticMatch } from './layer3'
import { getDbPrompt } from '@/lib/db/settings'

export interface EngineResult {
  matchningar: MatchResult[]
  filtered: { kandidatId: string; namn: string; reason: 'L1' | 'L2_CAP'; score?: number; reasons?: string[] }[]
}

/**
 * Run the three-layer matching engine for a single job against all candidates.
 *
 * Layer 1 → hard keyword filter (körkort block, no API)
 * Layer 2 → deterministic scoring for PRIORITIZATION (no API, no hard block)
 * Layer 3 → Claude semantic match (API, top N candidates by L2 score)
 *
 * Layer 2 no longer blocks — it ranks candidates so the best ones reach Claude first.
 * Only candidates beyond L3_MAX_CANDIDATES are filtered out (cost control).
 */
export async function runMatchingEngine(
  jobb: Jobb,
  kandidater: Kandidat[],
  cvTexts: Map<string, string>,
  apiKey: string
): Promise<EngineResult> {
  const client = new Anthropic({ apiKey })
  const filtered: EngineResult['filtered'] = []
  const scored: { kandidat: Kandidat; score: number; reasons: string[] }[] = []

  // Layer 1 — hard blocks only (körkort)
  for (const k of kandidater) {
    if (!passesKeywordFilter(k, jobb)) {
      filtered.push({ kandidatId: k.id, namn: k.namn, reason: 'L1' })
      continue
    }

    const { score, reasons } = scoreKandidat(k, jobb)
    scored.push({ kandidat: k, score, reasons })
  }

  // Sort by L2 score descending — best candidates first
  scored.sort((a, b) => b.score - a.score)

  // Take top N for Claude, rest are filtered with explanation
  const l3Candidates = scored.slice(0, L3_MAX_CANDIDATES)
  const capped = scored.slice(L3_MAX_CANDIDATES)
  for (const c of capped) {
    filtered.push({
      kandidatId: c.kandidat.id,
      namn: c.kandidat.namn,
      reason: 'L2_CAP',
      score: c.score,
      reasons: c.reasons,
    })
  }

  // Fetch prompt once for all Layer 3 calls
  const prompt = await getDbPrompt()

  // Layer 3 — run in batches of 5 to avoid rate limits
  const BATCH_SIZE = 5
  const l3Results: (MatchResult | null)[] = []
  for (let i = 0; i < l3Candidates.length; i += BATCH_SIZE) {
    const batch = l3Candidates.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((c) =>
        semanticMatch(c.kandidat, jobb, cvTexts.get(c.kandidat.id) ?? '', client, prompt)
      )
    )
    l3Results.push(...batchResults)
  }

  const matchningar = l3Results
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.score - a.score)

  return { matchningar, filtered }
}
