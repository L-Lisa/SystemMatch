import { Kandidat, Jobb } from '@/lib/types'

const KORKORT_PATTERNS = /\bb[\s-]?körkort\b|körkort\b/i

/**
 * Layer 1 — hard keyword filter, no API call.
 *
 * Returns false (block) when the mismatch is deterministic and absolute.
 * Only blocks when we are certain — anything uncertain passes through to Layer 2.
 *
 * Current hard rules:
 * 1. Job krav explicitly requires körkort AND candidate has none.
 */
export function passesKeywordFilter(kandidat: Kandidat, jobb: Jobb): boolean {
  // Rule 1: Körkort required in krav but candidate lacks it.
  // We check krav only (not meriter — "nice to have" is not a block).
  if (KORKORT_PATTERNS.test(jobb.krav) && !kandidat.korkort) {
    return false
  }

  return true
}
