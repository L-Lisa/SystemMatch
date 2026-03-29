import { getSupabase } from '@/lib/supabase'
import { Rekryterare, Jobb } from '@/lib/types'

export async function getAllRekryterare(): Promise<Rekryterare[]> {
  const { data: rekryterare, error } = await getSupabase()
    .from('rekryterare')
    .select('id, namn, slug, jobb(*)')
    .order('namn')

  if (error) throw new Error(`Kunde inte hämta rekryterare: ${error.message}`)

  return rekryterare.map((r) => ({
    id: r.id as string,
    namn: r.namn as string,
    jobb: ((r.jobb as Record<string, unknown>[]) || []).map(rowToJobb),
  }))
}

export async function upsertJobb(
  jobbLista: Omit<Jobb, 'id'>[],
  rekryterareSlug: string
): Promise<void> {
  const db = getSupabase()

  let { data: rek } = await db
    .from('rekryterare')
    .select('id')
    .eq('slug', rekryterareSlug)
    .single()

  // Auto-create recruiter if not found
  if (!rek) {
    const namn = rekryterareSlug.charAt(0).toUpperCase() + rekryterareSlug.slice(1)
    const { data: created, error: createErr } = await db
      .from('rekryterare')
      .insert({ namn, slug: rekryterareSlug })
      .select('id')
      .single()
    if (createErr || !created) throw new Error(`Kunde inte skapa rekryterare "${rekryterareSlug}"`)
    rek = created
  }

  // Get existing jobb for this recruiter
  const { data: existing } = await db
    .from('jobb')
    .select('id, "tjänst", arbetsgivare')
    .eq('rekryterare_id', rek.id)

  const existingIds = new Set((existing || []).map((j) => j.id as string))

  // Find which existing jobb have matchningar (protect from deletion)
  const { data: protected_ } = await db
    .from('matchningar')
    .select('jobb_id')
    .in('jobb_id', [...existingIds])

  const protectedIds = new Set((protected_ || []).map((m) => m.jobb_id as string))

  // Match incoming jobs to existing ones by tjänst + arbetsgivare
  const matchedExistingIds = new Set<string>()
  for (const j of jobbLista) {
    const match = (existing || []).find(
      (e) =>
        (e['tjänst'] as string) === j.tjänst &&
        (e.arbetsgivare as string) === j.arbetsgivare &&
        !matchedExistingIds.has(e.id as string)
    )
    if (match) {
      matchedExistingIds.add(match.id as string)
      // Update existing
      await db.from('jobb').update({
        plats: j.plats,
        sysselsattningsgrad: j.sysselsattningsgrad,
        loneniva: j.loneniva,
        krav: j.krav,
        meriter: j.meriter,
        presenterad: j.presenterad,
        excel_rad: j.rad,
      }).eq('id', match.id)
    } else {
      // Insert new
      await db.from('jobb').insert({
        rekryterare_id: rek.id,
        tjänst: j.tjänst,
        arbetsgivare: j.arbetsgivare,
        plats: j.plats,
        sysselsattningsgrad: j.sysselsattningsgrad,
        loneniva: j.loneniva,
        krav: j.krav,
        meriter: j.meriter,
        presenterad: j.presenterad,
        excel_rad: j.rad,
      })
    }
  }

  // Delete unmatched jobb UNLESS they have matchningar history
  const toDelete = [...existingIds].filter(
    (id) => !matchedExistingIds.has(id) && !protectedIds.has(id)
  )
  if (toDelete.length > 0) {
    await db.from('jobb').delete().in('id', toDelete)
  }
}

export async function updateJobbPresenterad(jobbId: string, presenterad: string): Promise<void> {
  const { error } = await getSupabase()
    .from('jobb')
    .update({ presenterad })
    .eq('id', jobbId)

  if (error) throw new Error(`Kunde inte uppdatera presenterad: ${error.message}`)
}

function rowToJobb(row: Record<string, unknown>): Jobb {
  return {
    id: row.id as string,
    tjänst: row['tjänst'] as string,
    arbetsgivare: row.arbetsgivare as string,
    plats: row.plats as string,
    sysselsattningsgrad: row.sysselsattningsgrad as string,
    loneniva: row.loneniva as string,
    krav: row.krav as string,
    meriter: row.meriter as string,
    presenterad: row.presenterad as string,
    rad: row.excel_rad as number,
  }
}
