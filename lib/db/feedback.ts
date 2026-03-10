import { getSupabase } from '@/lib/supabase'
import { Feedback } from '@/lib/types'

export async function getAllFeedback(): Promise<Feedback[]> {
  const { data, error } = await getSupabase()
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Kunde inte hämta feedback: ${error.message}`)

  return data.map(rowToFeedback)
}

export async function addFeedback(
  input: Omit<Feedback, 'id' | 'timestamp'>
): Promise<Feedback> {
  const { data, error } = await getSupabase()
    .from('feedback')
    .insert({
      kandidat_id: input.kandidatId || null,
      kandidat_namn: input.kandidatNamn,
      jobb_id: input.jobbId || null,
      jobb_titel: input.jobbTitel,
      typ: input.typ,
      kommentar: input.kommentar,
      resultat: input.resultat || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Kunde inte spara feedback: ${error.message}`)

  return rowToFeedback(data)
}

export function buildFeedbackContext(jobbId: string, allFeedback: Feedback[]): string {
  const relevant = allFeedback
    .filter((f) => f.jobbId === jobbId || f.jobbId === 'general')
    .slice(0, 20)

  if (relevant.length === 0) return ''

  const lines = relevant.map((f) => {
    const typ =
      f.typ === 'vinkel'
        ? 'Presentation/vinkel'
        : f.typ === 'prioritet'
          ? 'Prioriteringsfeedback'
          : 'Resultat'
    const result = f.resultat
      ? ` [${f.resultat === 'anställd' ? 'ANSTÄLLD' : f.resultat === 'ej_aktuell' ? 'EJ AKTUELL' : 'PÅGÅENDE'}]`
      : ''
    return `- ${typ}${result} (${f.kandidatNamn} / ${f.jobbTitel}): ${f.kommentar}`
  })

  return `\nLÄRDOMARFRÅN TIDIGARE MATCHNINGAR (ta hänsyn till dessa):\n${lines.join('\n')}`
}

function rowToFeedback(row: Record<string, unknown>): Feedback {
  return {
    id: row.id as string,
    kandidatId: (row.kandidat_id as string) || '',
    kandidatNamn: row.kandidat_namn as string,
    jobbId: (row.jobb_id as string) || '',
    jobbTitel: row.jobb_titel as string,
    typ: row.typ as Feedback['typ'],
    kommentar: row.kommentar as string,
    resultat: row.resultat as Feedback['resultat'],
    timestamp: row.created_at as string,
  }
}
