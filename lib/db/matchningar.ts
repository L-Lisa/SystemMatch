import { getSupabase } from '@/lib/supabase'
import { Matchning } from '@/lib/types'

export interface MatchningInput {
  kandidatId: string
  jobbId: string
  rekryterareId: string
  score: number
  aiMotivering: string
  vinkel: string
}

/**
 * Replace all matchningar for a given job with fresh results.
 * Old rows are deleted first so each match run is clean.
 * Returns a map of kandidatId → matchning DB id for use in the UI.
 */
export async function saveMatchningar(
  inputs: MatchningInput[]
): Promise<Map<string, string>> {
  if (inputs.length === 0) return new Map()

  const db = getSupabase()
  const jobbId = inputs[0].jobbId
  const rekryterareId = inputs[0].rekryterareId

  // Delete existing matchningar for this jobb + rekryterare combo
  await db
    .from('matchningar')
    .delete()
    .eq('jobb_id', jobbId)
    .eq('rekryterare_id', rekryterareId)

  const { data } = await db
    .from('matchningar')
    .insert(
      inputs.map((m) => ({
        kandidat_id: m.kandidatId,
        jobb_id: m.jobbId,
        rekryterare_id: m.rekryterareId,
        score: m.score,
        ai_motivering: m.aiMotivering,
        vinkel: m.vinkel,
      }))
    )
    .select('id, kandidat_id')

  const idMap = new Map<string, string>()
  if (data) {
    for (const row of data) {
      idMap.set(row.kandidat_id as string, row.id as string)
    }
  }
  return idMap
}

export async function updateMatchningMotivering(
  id: string,
  motivering: string
): Promise<void> {
  const { error } = await getSupabase()
    .from('matchningar')
    .update({ ai_motivering: motivering, ai_motivering_redigerad: true })
    .eq('id', id)

  if (error) throw new Error(`Kunde inte spara motivering: ${error.message}`)
}

export async function getMatchningarForJobb(jobbId: string): Promise<Matchning[]> {
  const { data, error } = await getSupabase()
    .from('matchningar')
    .select('*')
    .eq('jobb_id', jobbId)
    .order('score', { ascending: false })

  if (error) throw new Error(`Kunde inte hämta matchningar: ${error.message}`)

  return (data ?? []).map(rowToMatchning)
}

function rowToMatchning(row: Record<string, unknown>): Matchning {
  return {
    id: row.id as string,
    kandidatId: row.kandidat_id as string,
    jobbId: row.jobb_id as string,
    rekryterareId: row.rekryterare_id as string,
    score: row.score as number,
    aiMotivering: (row.ai_motivering as string) || '',
    vinkel: (row.vinkel as string) || '',
    aiMotiveringRedigerad: (row.ai_motivering_redigerad as boolean) || false,
    korningDatum: row.korning_datum as string,
  }
}
